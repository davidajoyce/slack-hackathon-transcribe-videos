const { App, ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const bp = require('body-parser')
const uuid = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const speech = require('@google-cloud/speech').v1p1beta1;

bp.urlencoded({ extended: true })
const express = require('express')
const path = require("path");
const { start } = require('repl');
const userIdToFileId = new Map();
const userIdToAuthToken = new Map();
const userIdToChannelId = new Map();

receiver.app.use(express.static(__dirname + '/'));
receiver.app.use(bp.urlencoded({extend:true}));
receiver.app.engine('html', require('ejs').renderFile);
receiver.app.set('view engine', 'html');
receiver.app.set('views', __dirname);


// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
  bp
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();

app.event('app_home_opened', async ({ event, client, context }) => {
  try {
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.publish({

      /* the user that opened your app's app home */
      user_id: event.user,

      /* the view object that appears in the app home*/
      view: {
        type: 'home',
        callback_id: 'home_view',

        /* body of the view */
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Welcome to SearchableVideos* :tada:"
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Please choose your video and slack channel so it can become searchable in slack. You will receive a message when we start to transcribe the video chosen. Then you will see a link to your video posted to the slack channel chosen along with the transcript in the thread"
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Choose Google Drive Video File"
                },
                "action_id": "first_button",
                "url": `https://e316-124-150-93-21.ngrok.io/google-drive-picker/user/${event.user}`
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Choose Slack Channel"
                },
                "action_id": "second_button"
              }
            ]
          }
        ]
      }
    });
  }
  catch (error) {
    console.error(error);
  }
});

receiver.router.get('/google-drive-picker/user/:user_id', (req, res) => {
  res.render('google-picker.html', {userId:req.params.user_id});
});

receiver.router.use(express.json())
receiver.router.post('/file', (req, res) => {
  const slackUserId = req.body.slackUserId;
  const fileId = req.body.fileId;
  const authToken = req.body.authToken;
  userIdToFileId.set(slackUserId, fileId);
  userIdToAuthToken.set(slackUserId, authToken);

  if(userIdToChannelId.has(slackUserId)){
    transcribeFileForUser(slackUserId, fileId, userIdToChannelId.get(slackId));
  }

  res.sendStatus(200);
});

// Listen and respond to button click
app.action('first_button', async({action, body, ack, context, respond}) => {
  console.log('button clicked hi there');
  console.log(action);
  console.log(body.user);
  // acknowledge the request right away
  await ack();
  //await say('Thanks for clicking the fancy button');
});

app.action('second_button', async({action, client, body, ack, context}) => {
  await ack();

  try {
    // Call the views.open method using the WebClient passed to listeners
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        "type": "modal",
        "callback_id": "slack_channel_modal",
        "title": {
          "type": "plain_text",
          "text": "Slack Channel"
        },
        "submit": {
          "type": "plain_text",
          "text": "Submit"
        },
        "blocks": [
          {
            "block_id": "target_channel",
            "type": "input",
            "element": {
              "type": "multi_channels_select",
              "action_id": "target_select",
              "placeholder": {
                "type": "plain_text",
                "text": "Where should the video transcript be sent?"
              }
            },
            "label": {
              "type": "plain_text",
              "text": "Channel(s)"
            }
          }
        ]
      }
    });

    console.log(result);
  }
  catch (error) {
    console.error(error);
  }

});

// Handle a view_submission request
app.view('slack_channel_modal', async ({ ack, body, view, client, logger }) => {
  // Acknowledge the view_submission request
  await ack();

  // Do whatever you want with the input data - here we're saving it to a DB then sending the user a verifcation of their submission

  // Assume there's an input block with `block_1` as the block_id and `input_a`
  const selected_channels = view['state']['values']['target_channel']['target_select']['selected_channels'];
  const user = body['user'];
  console.log('payload of view submission', body);
  console.log('body', body['view']['state']['values']['target_channel']);
  console.log('view of view submission', view);
  console.log('view', view['state']['values']['target_channel'])

  userIdToChannelId.set(user.id, selected_channels);

  if (userIdToFileId.has(user.id)) {
    transcribeFileForUser(user.id, userIdToFileId.get(user.id), userIdToChannelId.get(user.id));
  } else {
    message = 'Please choose a file from google drive to transcribe';
    sendMessageToUser(message, user.id);
  }
});

async function sendMessageToUser(message, userId){
  // Message the user
  try {
    await app.client.chat.postMessage({
      channel: userId,
      text: message
    });
  }
  catch (error) {
    console.log(error);
  }

}

function transcribeFileForUser(user_id, fileId, channelId) {
  fs.readFile(__dirname + '/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    downloadFileToTranscribe(JSON.parse(content), fileId, user_id, channelId)
  });
}

async function downloadFileToTranscribe(credentials, file_id, user_id, channelId){
  console.log(credentials);
  var authToken = userIdToAuthToken.get(user_id);
  const client_id = credentials.client_id;
  const client_secret = credentials.client_secret;
  console.log('client_id then client_secret and authToken');
  console.log(client_id);
  console.log(client_secret);
  console.log(authToken);
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret);
  oAuth2Client.setCredentials({access_token: authToken});

  const drive = google.drive({version: 'v3', oAuth2Client});
  const videoFileName = uuid.v4() + '.mp4';
  const testVideoFileName = 'b5dec068-a630-4747-b36d-e21064ccf2d3.mp4';
  const testVideoFilePath = path.join(__dirname, testVideoFileName);
  console.log("video file path");
  console.log(testVideoFilePath);

  const fileInfo = await getFileInfo(file_id, oAuth2Client, drive);
  const driveUrl = fileInfo.webViewLink;
  const fileName = fileInfo.name;
  const message = "We have started transcribing your video " + fileName;
  sendMessageToUser(message, user_id);
  const slackPostMessage = fileName + ' : ' + driveUrl + ' see Transcript in thread';
  console.log("waiting for ", driveUrl);
  const filePath =  await downloadFile(file_id, oAuth2Client, drive);
  transformVideoFileToAudioFile(filePath, channelId, slackPostMessage);
}

function downloadFile(file_id, oAuth2Client, drive){
  return drive.files
      .get({fileId: file_id, fields: 'webViewLink', alt: 'media', auth: oAuth2Client}, {responseType: 'stream'})
      .then(res => {
        return new Promise((resolve, reject) => {
          const filePath = path.join(__dirname, uuid.v4() + '.mp4');
          console.log(`writing to ${filePath}`);
          const dest = fs.createWriteStream(filePath);
          let progress = 0;
          res.data
            .on('end', () => {
              console.log(' Done downloading file.');
              resolve(filePath);
            })
            .on('error', err => {
              console.error('Error downloading file.');
              reject(err);
            })
            .on('data', d => {
              progress += d.length;
              if (process.stdout.isTTY) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Downloaded ${progress} bytes`);
              }
            })
            .pipe(dest);
        });
    }); 
}

function getFileInfo(file_id, oAuth2Client, drive){
   return drive.files
      .get({fileId: file_id, fields: 'webViewLink,name', auth: oAuth2Client})
      .then(res => {
        console.log("testing drive url", res.data.webViewLink);
        console.log("name of drive url", res.data.name);
        return res.data;
    });
}

function transformVideoFileToAudioFile(videoFilePath, channelId, driveUrl){
  console.log("attempting to convert video to audio");
  console.log(videoFilePath);
  const flacFileName = uuid.v4() + '.flac';
  ffmpeg(videoFilePath)
  .on('error', function(err) {
    console.log('An error occurred: ' + err.message);
  })
  .on('end', function() {
    console.log('Processing finished !');
    transcribeAudioFile(flacFileName, channelId, driveUrl);
  })
  .save(path.join(__dirname, flacFileName));
}


// Creates a client
const speechClient = new speech.SpeechClient();

const model = 'video';
const encoding = 'FLAC';
const sampleRateHertz = 16000;
const languageCode = 'en-US';
const audioChannelCount = 2;

const config = {
  encoding: encoding,
  //sampleRateHertz: sampleRateHertz,
  languageCode: languageCode,
  model: model,
  audioChannelCount: audioChannelCount,
  enableWordTimeOffsets: true
};

async function transcribeAudioFile(audioFileName, channelId, driveUrl){
  const audioFilePath = path.join(__dirname, audioFileName);

  const audio = {
    content: fs.readFileSync(audioFilePath).toString('base64'),
  };

  const request = {
    config: config,
    audio: audio,
  };

  // Detects speech in the audio file
  const [operation] = await speechClient.longRunningRecognize(request);
  //const [response] = await speechClient.recognize(request);
  const [response] = await operation.promise();

  var transcriptTimeStamp = []
  var totalTimeSeconds = Number(0);
  const timeStampInterval = Number(6);
  response.results.forEach(result => {
    console.log(`Transcription: ${result.alternatives[0].transcript}`);
    var startTime = Number(0);
    console.log('startTime', startTime);
    var transcriptTimeStampSentence = '0.00' + '\n';
    result.alternatives[0].words.forEach(wordInfo => {
      const wordStartSec = Number(wordInfo.startTime.seconds);
      totalTimeSeconds = wordStartSec;
      const timeBetweenWords = wordStartSec - startTime;
      if(timeBetweenWords >= timeStampInterval){
        transcriptTimeStampSentence += ' ' + wordInfo.word;
        transcriptTimeStamp.push(transcriptTimeStampSentence);
        var minute = Math.floor(totalTimeSeconds/60);
        var seconds = totalTimeSeconds % 60;
        var secondsTranscript = seconds;
        if(secondsTranscript < 10) {
          secondsTranscript = '0' + secondsTranscript;
        }
        startTime = wordStartSec;
        transcriptTimeStampSentence = minute + '.' + secondsTranscript + '\n';
      } else {
        transcriptTimeStampSentence += ' ' + wordInfo.word;
      }
    });
  });
  console.log(transcriptTimeStamp);
  sendTranscriptToChannel(transcriptTimeStamp, channelId, driveUrl);
}

async function sendTranscriptToChannel(transcriptTimeStamp, channelId, driveUrl){
  try {
    const response = await app.client.chat.postMessage({
      channel: channelId[0],
      text: driveUrl
    });

    console.log(response.ts);
    console.log(transcriptTimeStamp[0]);
    for(var index in transcriptTimeStamp){
      await app.client.chat.postMessage({
        channel: channelId[0],
        text: transcriptTimeStamp[index],
        thread_ts: response.ts
      });
    }
  }
  catch (error) {
    console.log(error);
  }

}

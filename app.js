const { App, ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
const axios = require('axios')
const SearchableVideosURI = 'http://localhost:3000';
const bp = require('body-parser')
bp.urlencoded({ extended: true })
const express = require('express')


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
              "text": "*Welcome to your SearchableVideos new _App's Home_* :tada:"
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "This button won't do much for now but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app."
            }
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
                "url": `https://db91-124-150-93-21.ngrok.io/google-driver-picker`
              }
            ]
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

receiver.router.get('/google-driver-picker', (req, res) => {
  // You're working with an express req and res now.
  res.sendFile('/Dev/slack-hackathon-transcribe-videos/google-picker.html');
});

receiver.router.use(express.json())
receiver.router.post('/folder', (req, res) => {
  console.log(req.body)
  res.sendStatus(200);
});

// Listen and respond to button click
app.action('first_button', async({action, ack, context}) => {
  console.log('button clicked hi there');
  console.log(action);
  // acknowledge the request right away
  await ack();
  //await say('Thanks for clicking the fancy button');
});

// Listen and respond to button click
app.action('second_button', async({action, client, body, ack, context}) => {
  console.log('button clicked hi there second button');
  console.log(action);
  console.log(body.trigger_id);
  // acknowledge the request right away
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
          "text": "SLack Channel"
        },
        "submit": {
          "type": "plain_text",
          "text": "Submit"
        },
        "blocks": [
          {
            "type": "input",
            "element": {
              "type": "plain_text_input",
              "action_id": "title",
              "placeholder": {
                "type": "plain_text",
                "text": "Please select a slack channel to post your video transcript"
              }
            },
            "label": {
              "type": "plain_text",
              "text": "Title"
            }
          },
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
  const val = view['state']['values']['target_channel']['target_select']['selected_channels'];
  const user = body['user']['id'];
  console.log("input from select channel modal")
  console.log(val);
  console.log(val.selected_channel);

  /*
  // Message to send user
  let msg = '';
  // Save to DB
  const results = await db.set(user.input, val);

  if (results) {
    // DB save was successful
    msg = 'Your submission was successful';
  } else {
    msg = 'There was an error with your submission';
  }

  // Message the user
  try {
    await client.chat.postMessage({
      channel: user,
      text: msg
    });
  }
  catch (error) {
    logger.error(error);
  }
  */

});

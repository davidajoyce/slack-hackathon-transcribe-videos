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
                  "text": "Click me!"
                },
                "action_id": "first_button",
                "url": `https://2705-124-150-93-21.ngrok.io/google-driver-picker`
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

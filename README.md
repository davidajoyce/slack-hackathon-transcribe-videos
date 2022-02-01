# slack-hackathon-transcribe-videos
Submission for DevPost slack hackathon. This is the source code for SearchableVideos. This slack app allows a slack user to choose a video from their google drive using Goolge Picker API widget. This video is downloaded from google drive api and transformed to an audio flac file. Google speech to text api service is used to to transcribe this audio file. 

Slack bolt app is used to respond to events like button clicks, or home tab buttons clicked along with posting the video url to the chosen slack channel along with the timestamped transcript in the thread of the slack post. 

# Instructions how to use

- Make sure to set your SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET environment variables
- Use ngrok to for public url that redirects to localhost:3000 that bolt app runs.
- Add ngrok url to slack event subscriptions e.g https://<ngrok-uri>/slack/events and to the Interactivity & Commands section for your slack application
- In google-picker-html make sure you have filled in the relevent credentials
- Update the ngrok urls.
const { StaticAuthProvider } = require('@twurple/auth');
const { ChatClient } = require('@twurple/chat');
const { PubSubClient } = require('@twurple/pubsub');

const nconf = require('nconf');

nconf.file({
  file: 'config.yaml',
  format: require('nconf-yaml')
})

async function main() {
  const authProvider = new StaticAuthProvider(nconf.get('client_id'), nconf.get('access_token'));
  const chatClient = new ChatClient({ authProvider, channels: [nconf.get('channel_name')] });

  await chatClient.connect();
  console.log(`Connected to Twitch chat for channel: ${nconf.get('channel_name')}`)

  chatClient.onMessage( (channel, user, message) => {
    console.log(`${user} said ${message}`)
    // if (message.includes('clover')) {
    //   chatClient.say(channel, `Hey ${user}, you said clover but you meant CLover!`);
    // }
  });

  const pubSubClient = new PubSubClient();
  const userId = await pubSubClient.registerUserListener(authProvider);
  
  const listener = await pubSubClient.onWhisper(userId, (message) => {
    console.log(`Whisper Test: ${message.text}`);
  })
}

main();
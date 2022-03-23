const { ApiClient } = require('@twurple/api');
// const { StaticAuthProvider } = require('@twurple/auth');
const { ChatClient } = require('@twurple/chat');
const { PubSubClient } = require('@twurple/pubsub');
const { RefreshingAuthProvider, getTokenInfo } = require('@twurple/auth');
const fsNative = require('fs');
const fs = fsNative.promises;

const axios = require('axios').default;
const nconf = require('nconf');

nconf.file({
  file: 'config.yaml',
  format: require('nconf-yaml')
})

var prevLiveStreams = null;
const notifyUrl = nconf.get('gas_notify_url');

async function main() {
  const clientId = nconf.get('twitch:client_id');
  const clientSecret = nconf.get('twitch:client_secret');
  const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'UTF-8'));
  const authProvider = new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: async newTokenData => await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
    },
    tokenData
  );
  
  const chat = new ChatClient({ authProvider, channels: [nconf.get('twitch:channel_name')] });
  
  const pubSub = new PubSubClient();
  const userId = await pubSub.registerUserListener(authProvider);

  const api = new ApiClient({ authProvider });
  
  // await chat.connect();
  // console.log(`Connected to Twitch chat for channel: ${nconf.get('twitch:channel_name')}`)

  // chat.onMessage( (channel, user, message) => {
  //   console.log(`${user} said ${message}`)
  //   if (message.includes('clover')) {
  //     chat.say(channel, `Hey ${user}, you said clover but you meant CLover!`);
  //    }
  // });

  
  // const listener = await pubSub.onWhisper(userId, (message) => {
  //   console.log(`Whisper Test: ${message.text}`);
  // })

  prevLiveStreams = await fetchFollowedStreams(api, userId);

  setInterval(() => { refreshFollowedStreams(api, userId) }, 10000)
}

async function refreshFollowedStreams(api, userId) {
  try {
    let newLiveStreams = await(fetchFollowedStreams(api,userId))
    newLiveStreams.map( (newStream) => {
      if (!prevLiveStreams.includes(newStream)) {
        axios.get(notifyUrl, { params: { channelUrl: `https://www.twitch.tv/${newStream}` }} );
        console.log(`[${new Date().toLocaleString( 'sv', { timeZoneName: 'short' } )}] ${newStream} just went live`);
      }
    })
    prevLiveStreams = newLiveStreams;  
  } catch (err) {
    console.log(err)
  }
}

async function fetchFollowedStreams(api, userId) {
  let streams = await api.streams.getFollowedStreams(userId)
  let streamNames = streams.data.map( ( value ) => {
    return value.userName;
  })

  return streamNames;
}

main();

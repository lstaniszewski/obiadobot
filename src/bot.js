'use strict';

var _ = require('lodash');
var BotData = require('./bot-data-store.js');
var MessageHandler = require('./handlers/message.js');
var DMHandler = require('./handlers/dm.js');
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

class Bot {

    constructor(token, channelName, debug) {
        this.channelName = channelName;
        this.rtm = new RtmClient(token, {logLevel: debug});
    }

    start() {
        this.rtm.start();
        this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
            BotData.slackStore.cacheRtmStart(_.cloneDeep(rtmStartData));
            BotData.channel = BotData.slackStore.getChannelOrGroupByName(this.channelName);
            BotData.send = (text, channelId) => {
                this.rtm.send({
                    text: text,
                    channel: channelId,
                    type: RTM_EVENTS.MESSAGE
                });
            };
        });

        this.rtm.on(RTM_EVENTS.MESSAGE, (response) => {
            if(response.channel[0] === 'D') {
                DMHandler(response).then((r) => {
                    BotData.send(r, response.channel);
                }, (r) => {
                    BotData.send("Fial: "+r, response.channel);
                });
            }
            if(response.channel === BotData.channel.id) {
                MessageHandler(response).then((r) => {
                    BotData.send(r, BotData.channel.id);
                }, (r) => {
                    BotData.send("Fial: "+r, BotData.channel.id);
                });
            }
        });
    }
}
module.exports = Bot;

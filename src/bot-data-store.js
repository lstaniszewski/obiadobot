'use strict';

var MemoryDataStore = require('@slack/client').MemoryDataStore;

var BotData =  {

    slackStore: new MemoryDataStore(),
    channel: ''
}

module.exports = BotData;

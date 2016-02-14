'use strict';

var config = require('./data/config.json');
var Bot = require('./src/bot.js');

var bot = new Bot(config.slackToken, config.channelName, config.mailConfig);

bot.login();

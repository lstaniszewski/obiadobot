'use strict';

var db = require('./models'),
    Bot = require('./src/bot.js'),
    config = require('./config/config.json')['slack'];

db.sequelize.sync()
    .then(() => {
        var bot = new Bot(config.token, config.channel, config.debug);
        bot.start();
    });

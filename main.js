'use strict';

var Slack = require('slack-client');
var _ = require('underscore');
var nodemailer = require('nodemailer');

var config = require('./data/config.json');
var menu = require('./data/menu.json');
var orderList = require('./data/orderlist.json');


var channelId, channel;

if(!config.slackToken || !config.channelName){
    console.log('Fill config info');
    return;
}

var slackToken = config.slackToken;
var autoReconnect = true;
var autoMark = true;

var slack = new Slack(slackToken, autoReconnect, autoMark)

slack.on('open', function() {
  console.log("Connected to " + slack.team.name + " as @" + slack.self.name);
  channel = slack.getChannelByName(config.channelName);
  channelId = channel.id;
});

slack.on('message', function(response) {
    if(response.channel === channelId) {

        if(/\!pomocy/.test(response.text)) {
            channel.send("Lista dostępnych opcji:\n!menu - wyswietla cale menu\n !coto <numer> - podpowiada jakim daniem jest numer\n !jesc <numer> - zamawia danie o numerze\n!pozamawiane - lista grubasów")
        }

        if(/\!menu/.test(response.text)) {
            channel.send("Menu: " + displayMenu());
        }

        if(/\!coto/.test(response.text)) {
            var q = parseInt(response.text.match(/(?!\!coto )\d{1,2}/)[0]);
            if(q > 0 && q < menu.length) {
                channel.send("" + q + " to: " + menu[q].name + " - " + menu[q].desc);
            }
            else {
                channel.send("Fial: " + q + " nie ma w menu");
            }

        }

        if(/\!jesc/.test(response.text)) {
            var user = slack.getUserByID(response.user);
            var q = parseInt(response.text.match(/(?!\!jesc )\d{1,2}/)[0]);

            if(q > 0 && q < menu.length) {
                var order = _.findWhere(orderList, {"name": user.name});
                if(order) {
                    order.meal = menu[q].name
                }
                else {
                    orderList.push({"name": user.name, "shortName": "" + user.profile.first_name.charAt(0) + user.profile.last_name.charAt(0), "meal": menu[q].name, "extra": true})
                }
                channel.send("@" + user.name + " zamówiono: " + menu[q].name);
            }
            else {
                channel.send("Fial: " + q + " nie ma w menu");
            }
        }

        if(/\!pozamawiane/.test(response.text)) {
            channel.send(displayOrder());
        }

        if(/\!zamow/.test(response.text)) {
            sendOrder();
        }
    }
});

slack.on('error', function(err) {
  console.error("Error", err);
});

slack.login();

var displayMenu = function(){
    var response = "";

    for (let value of menu) {
        response += "\n" + value.id + ": " + value.name;
    }

    return response;
}

var displayOrder = function(){
    var response = "";

    for (let value of orderList) {
        response += value.name + ": " + value.meal + "\n";
    }

    return response;
}

var orderTable = function() {
    var response = "";

    var userList = _.where(orderList, {"extra": false});

    for (let order of userList) {
        response += "<tr><td style='border: 1px solid black'>"+order.shortName+"</td><td style='border: 1px solid black'>"+order.meal+"</td></tr>"
    }

    return response;
}

var extraTable = function() {
    var userList = _.where(orderList, {"extra": true});

    if(!!userList.length){
        var response = "<br><h4>Dodatkowo: </h4><br>";
        for (let order of userList) {
            response += ""+order.shortName+" - "+order.meal+"<br>";
        }
        return response;
    }
    else {
        return "";
    }
}


var sendOrder = function() {
    var smtpConfig = require('./data/mail.json');

    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport(smtpConfig);

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: 'DOOK <mailer@dook.pro>', // sender address
        to: 'wqwlucky@gmail.com', // list of receivers
        subject: 'DOOK - plan obiadowy', // Subject line
        text: displayOrder, // plaintext body
        html: '<h4>Prosimy o sztućce</h4><table style="border-collapse: collapse;width: 50%;">'+orderTable()+'</table>' + extraTable() // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            channel.send('fial: ' + error);
        }
        channel.send('powysyłane!');
    });
}

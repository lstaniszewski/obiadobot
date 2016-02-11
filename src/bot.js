'use strict';

var Slack = require('slack-client');
var _ = require('underscore');
var nodemailer = require('nodemailer');

var menu = require('./../data/menu.json');
var orderList = require('./../data/orderlist.json');

class Bot {

    constructor(token, channelName) {
        this.channelName = channelName;
        this.slack = new Slack(token, true, true);
    }

    login() {
        var self = this;
        this.slack.on('open', function() {
            self.onSlackOpen();
        });

        this.respondToMessages();
        this.slack.login();
    }

    onSlackOpen() {
        this.channel = this.slack.getGroupByName(this.channelName);
        this.channel.send('Hello, wpisz !pomocy dla listy opcji');
        this.channelId = this.channel.id;
        this.orderListNames = _.pluck(orderList, 'name');
        this.orderHelper = [{"shortcut": "z", "longname": "ziemniaki"}, {"shortcut": "f", "longname": "frytki"}];
        this.orderFlag = false;
    }

    respondToMessages() {
        var self = this;
        this.slack.on('message', function(response) {
            if(response.channel === self.channelId) {
                self.user = self.slack.getUserByID(response.user);
                self.orderFlag = false;
                if(/^\!pomocy$/.test(response.text)) {
                    self.channel.send("Lista dostępnych opcji:\n!menu - wyswietla cale menu\n !coto <numer> - podpowiada jakim daniem jest numer\n !jesc <numer> - zamawia danie o numerze\n!jesc <kto> <numer> - zamawia danie o numerze za dana osobe\n!pozamawiane - lista zamowien")
                }

                if(/^\!menu$/.test(response.text)) {
                    self.channel.send("Menu: " + self.displayMenu());
                }

                if(/^\!coto/.test(response.text)) {
                    var q = parseInt(response.text.match(/^\!coto (\d{1,2})$/)[1]);
                    if(q > 0 && q < menu.length) {
                        self.channel.send("" + q + " to: " + menu[q].name + " - " + menu[q].desc);
                    }
                    else {
                        self.channel.send("Fial: " + q + " nie ma w menu");
                    }

                }

                if(/^!jesc \d{1,2}/i.test(response.text)) {
                    self.orderFlag = true
                    var q = parseInt(response.text.match(/^\!jesc (\d{1,2})/)[1]);

                    if(q > 0 && q < menu.length) {
                        self.orderCheckExtra(response.text, q).then(function(mealName) {
                            var order = _.findWhere(orderList, {"name": self.user.name});
                            if(order) {
                                order.meal = mealName;
                            }
                            else {
                                orderList.push({"name": self.user.name, "shortName": "" + self.user.profile.first_name.charAt(0) + self.user.profile.last_name.charAt(0), "meal": mealName, "extra": true})
                            }
                            self.channel.send("@" + self.user.name + " zamówiono: " + mealName);
                        }, function(orderName) {
                            self.channel.send("Fial: fryty czy ziemniaki? wpisz "+q+"z lub "+q+"f");
                        });
                    }
                    else {
                        self.channel.send("Fial: " + q + " nie ma w menu");
                    }
                }
                if(/^\!jesc \w* \d{1,2}/i.test(response.text)) {
                    self.orderFlag = true
                    var q = parseInt(response.text.match(/^\!jesc \w* (\d{1,2})/)[1]);
                    var orderName = response.text.match(/^\!jesc (\w*) \d{1,2}/)[1];

                    if(q > 0 && q < menu.length) {

                        if(self.validateName(orderName)){
                            self.orderCheckExtra(response.text, q).then(function(mealName) {
                                var order = _.findWhere(orderList, {"name": orderName});
                                if(order) {
                                    order.meal = mealName;
                                }
                                else {
                                    orderList.push({"name": self.user.name, "shortName": "" + self.user.profile.first_name.charAt(0) + self.user.profile.last_name.charAt(0), "meal": mealName, "extra": true})
                                }
                                self.channel.send("@" + self.user.name + " zamówiono za @" + orderName + ": " + menu[q].name);
                            }, function() {
                                self.channel.send("Fial: fryty czy ziemniaki? wpisz "+q+"z lub "+q+"f");
                            });
                        }
                        else {
                            self.channel.send("Fial: " + orderName + " nie istnieje");
                        }

                    }
                    else {
                        self.channel.send("Fial: " + q + " nie ma w menu");
                    }
                }
                if(/^\!jesc.*$/i.test(response.text) && !self.orderFlag) {
                    self.channel.send("Fial: Chyba zapomniałes czegos podać");
                }


                if(/^\!pozamawiane$/.test(response.text)) {
                    self.channel.send(self.displayOrder());
                }

                if(/^\!zamow$/.test(response.text)) {
                    self.sendOrder();
                }
            }
        });
    }

    orderCheckExtra(responseText, q) {
        var self = this;
        return new Promise(function(resolve, reject) {
            if(menu[q].extraInfo){
                if(/^\!jesc.* \d{1,2}([zf])$/.test(responseText)){
                    var shortcut = responseText.match(/^\!jesc.* \d{1,2}([zf])$/)[1];
                    var helper = _.findWhere(self.orderHelper, {"shortcut": shortcut});
                    resolve("" + menu[q].name + " / " + helper.longname);
                }else {
                    reject();
                }
            }else {
                resolve(menu[q].name);
            }
        });
    }

    validateName(name) {
        return _.contains(this.orderListNames, name);

    }

    displayMenu() {
        var response = "";

        for (let value of menu) {
            response += "\n" + value.id + ": " + value.name;
        }
        return response;
    }

    displayOrder() {
        var response = "";

        for (let value of orderList) {
            response += value.name + ": " + value.meal + "\n";
        }
        return response;
    }

    orderTable() {
        var response = "";

        var userList = _.where(orderList, {"extra": false});

        for (let order of userList) {
            response += "<tr><td style='border: 1px solid black; width: 50%;'>"+order.shortName+"</td><td style='border: 1px solid black; width: 50%;'>"+order.meal+"</td></tr>"
        }
        return response;
    }

    extraTable() {
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
    sendOrder() {
        var self = this;
        var smtpConfig = require('./../data/mail.json');

        // create reusable transporter object using the default SMTP transport
        var transporter = nodemailer.createTransport(smtpConfig);

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: 'DOOK <mailer@dook.pro>', // sender address
            to: 'wqwlucky@gmail.com', // list of receivers
            subject: 'DOOK - plan obiadowy', // Subject line
            text: self.displayOrder(), // plaintext body
            html: '<h4>Prosimy o sztućce</h4><table style="border-collapse: collapse;width: 50%;">'+self.orderTable()+'</table>' + self.extraTable() // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                self.channel.send('fial: ' + error);
            }
            self.channel.send('powysyłane!');
        });
    }
}

module.exports = Bot;

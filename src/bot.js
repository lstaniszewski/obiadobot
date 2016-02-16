'use strict';

var Slack = require('slack-client');
var _ = require('underscore');
var moment = require('moment');
var nodemailer = require('nodemailer');
var fs = require('fs');

var menu = require('./../data/menu.json');
var orderList = require('./../data/orderlist.json');

class Bot {

    constructor(token, channelName, mailConfig) {
        var self = this;
        self.channelName = channelName;
        self.mailConfig = mailConfig;
        self.slack = new Slack(token, true, true);
        self.orderDate = moment().format("YYYYMMDD");
        self.orderDateFile = "orders/" + self.orderDate + ".json";

        try {
            self.orderList = JSON.parse(fs.readFileSync(self.orderDateFile, 'utf8'));
        } catch (error) {
            fs.writeFile(self.orderDateFile, JSON.stringify(orderList), function(){
                self.orderList = JSON.parse(fs.readFileSync(self.orderDateFile, 'utf8'));
            });
        }
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
        this.channelId = this.channel.id;
        this.orderListNames = _.pluck(this.orderList, 'name');
        this.orderHelper = [{"shortcut": "z", "longname": "ziemniaki"}, {"shortcut": "f", "longname": "frytki"}];
        this.orderFlag = false;
        this.mealNames = _.pluck(menu, 'name');
    }

    respondToMessages() {
        var self = this;
        this.slack.on('message', function(response) {
            if(response.channel === self.channelId) {
                self.checkDate(response.ts);
                self.user = self.slack.getUserByID(response.user);
                self.orderFlag = false;

                if(/^\!pomocy$/.test(response.text)) {
                    self.channel.send("Lista dostępnych opcji:\n!menu - wyswietla cale menu\n !coto <numer> - podpowiada jakim daniem jest numer\n !jesc <numer> - zamawia danie o numerze\n!jesc <kto> <numer> - zamawia danie o numerze za dana osobe\n!pozamawiane - lista zamowien\n!ruletka - obiadowa ruletka, po wpisaniu komendy nie ma odwrotu.")
                }

                if(/^\!ruletka$/.test(response.text)){
                    var orderUser = _.findWhere(self.orderList, {"name": self.user.name});
                    if(orderUser && orderUser.roulette) {
                        self.channel.send("Już losowałes dzisiaj..");
                    }
                    else {
                        self.channel.send("Odważny wybór, rozpoczynam losowanie...");
                        var rouletteList = _.sample(self.mealNames, 5);
                        var response = "";
                        for (let name of rouletteList) {
                            response += name + "\n";
                        }
                        var mealName = _.sample(rouletteList);
                        var meal = _.findWhere(menu, {"name": mealName});
                        if(meal.extraInfo){
                            var mealType = _.sample(_.pluck(self.orderHelper, "longname"));
                            mealName += " / " + mealType;
                        }
                        self.orderAdd(self.user.name, mealName, true);
                        fs.writeFile(self.orderDateFile, JSON.stringify(self.orderList));

                        setTimeout(function () {
                            self.channel.send("Wylosowane dania to: \n" + response);
                            setTimeout(function (){
                                self.channel.send("Wylosowano: " + mealName + "\n Smacznego!");
                            }, 9000);
                        }, 3000);
                    }
                }

                if(/^\!menu$/.test(response.text)) {
                    self.channel.send("Menu: " + self.displayMenu());
                }

                if(/^\!coto/.test(response.text)) {
                    var q = parseInt(response.text.match(/^\!coto[ ]+(\d{1,2})$/i)[1]);
                    if(q >= 0 && q < menu.length) {
                        self.channel.send("" + q + " to: " + menu[q].name + " - " + menu[q].desc);
                    }
                    else {
                        self.channel.send("Fial: " + q + " nie ma w menu");
                    }
                }

                if(/^!jesc[ ]+\d{1,2}/i.test(response.text)) {
                    var orderUser = _.findWhere(self.orderList, {"name": self.user.name});
                    self.orderFlag = true
                    if(orderUser && orderUser.roulette) {
                        self.channel.send("Ha ha, nope");
                    }
                    else {
                        var q = parseInt(response.text.match(/^\!jesc[ ]+(\d{1,2})/i)[1]);

                        if(q >= 0 && q < menu.length) {
                            self.orderCheckExtra(response.text, q).then(function(mealName) {
                                self.orderAdd(self.user.name, mealName);
                                self.channel.send("@" + self.user.name + " zamówiono: " + mealName);
                                fs.writeFile(self.orderDateFile, JSON.stringify(self.orderList));
                            }, function(orderName) {
                                self.channel.send("Fial: fryty czy ziemniaki? wpisz "+q+"z lub "+q+"f");
                            });
                        }
                        else {
                            self.channel.send("Fial: " + q + " nie ma w menu");
                        }
                    }
                }

                if(/^\!jesc[ ]+[\w\.]*[ ]+\d{1,2}/i.test(response.text)) {
                    var orderName = response.text.match(/^\!jesc[ ]+([\w\.]*)[ ]+\d{1,2}/i)[1];
                    var orderUser = _.findWhere(self.orderList, {"name": orderName});
                    self.orderFlag = true
                    if(orderUser && orderUser.roulette) {
                        self.channel.send("Ha ha, nope");
                    }
                    else {
                        var q = parseInt(response.text.match(/^\!jesc[ ]+[\w\.]*[ ]+(\d{1,2})/i)[1]);

                        if(q >= 0 && q < menu.length) {
                            if(self.validateName(orderName)){
                                self.orderCheckExtra(response.text, q).then(function(mealName) {
                                    self.orderAdd(orderName, mealName);
                                    self.channel.send("@" + self.user.name + " zamówiono za @" + orderName + ": " + menu[q].name);
                                    fs.writeFile(self.orderDateFile, JSON.stringify(self.orderList));
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

    checkDate(timestamp) {
        var self = this;
        var date = moment.unix(timestamp).format("YYYYMMDD");

        if(self.orderDate !== date) {
            self.orderDate = date;
            self.orderDateFile = "orders/" + self.orderDate + ".json";
            fs.writeFile(self.orderDateFile, JSON.stringify(orderList), function(){
                self.orderList = JSON.parse(fs.readFileSync(self.orderDateFile, 'utf8'));
            });
        }
    }

    orderAdd(orderName, mealName, roulette) {
        var self = this;
        var roulette = roulette || false;
        var order = _.findWhere(self.orderList, {"name": orderName});
        if(order) {
            order.meal = mealName;
            order.roulette = roulette;
        }
        else {
            self.orderList.push({"name": self.user.name, "shortName": "" + self.user.profile.first_name.charAt(0) + self.user.profile.last_name.charAt(0), "meal": mealName, "extra": true, "roulette": roulette})
        }
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

        for (let value of this.orderList) {
            response += value.name + ": " + value.meal + "\n";
        }
        return response;
    }

    orderTable() {
        var response = "";
        var userList = _.where(this.orderList, {"extra": false});

        for (let order of userList) {
            response += "<tr><td style='border: 1px solid black; width: 50%;'>"+order.shortName+"</td><td style='border: 1px solid black; width: 50%;'>"+order.meal+"</td></tr>"
        }
        return response;
    }

    extraTable() {
        var userList = _.where(this.orderList, {"extra": true});

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

    addPhone() {
        if(self.mailConfig.phone.length > 0) {
            return "<br>Numer kontaktowy: " + self.mailConfig.phone;
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
            from: self.mailConfig.from, // sender address
            to: self.mailConfig.to, // list of receivers
            subject: self.mailConfig.subject, // Subject line
            text: 'Prosimy o sztućce \n' + self.displayOrder(), // plaintext body
            html: '<h4>Prosimy o sztućce</h4><table style="border-collapse: collapse;width: 50%;">'+self.orderTable()+ '</table>' + self.extraTable() + self.addPhone() // html body
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

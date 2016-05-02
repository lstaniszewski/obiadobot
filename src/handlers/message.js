'use strict';

var _ = require('lodash');
var moment = require('moment');
var BotData = require('./../bot-data-store.js');
var db = require('./../../models');

var MessageHandler = function(response) {

    var currentUser;

    return db.User.findOne({
        where: {
            slack_id: response.user
        }
    }).then(function(user){
        currentUser = user;
        return handleFunc();
    });

    function handleFunc() {
        return new Promise(function(resolve, reject) {
            if(/^\!pomocy$/.test(response.text)) {
                resolve(BotData.helpList);
            }
            if(/^\!ruletka$/.test(response.text)){
                var orderUser = _.findWhere(self.orderList, {"name": self.user.name});
                if(orderUser && orderUser.roulette) {
                    self.channel.send("Już losowałes dzisiaj..");
                }
                else {
                    self.channel.send("Odważny wybór, rozpoczynam losowanie...");
                    var rouletteList = _.sample(self.mealNames, 5);
                    var dupa = "";
                    for (let name of rouletteList) {
                        dupa += name + "\n";
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
                        self.channel.send("Wylosowane dania to: \n" + dupa);
                        setTimeout(function (){
                            self.channel.send("Wylosowano: " + mealName + "\n Smacznego!");
                        }, 9000);
                    }, 3000);
                }
            }
        });
    }
}

module.exports = MessageHandler;

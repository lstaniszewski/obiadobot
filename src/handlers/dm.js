'use strict';

const _ = require('lodash');
const BotData = require('./../bot-data-store.js');
const db = require('./../../models');
const DMregex = require('./../regex/DMregex.js');

let DMHandler = function(response) {
    if(DMregex.userAdd.base.test(response.text)) {
        return userAddFunc();
    }
    if(DMregex.mealAdd.base.test(response.text)) {
        return mealAddFunc();
    }

    function userAddFunc() {
        return new Promise(function(resolve, reject) {
            let slackUserName = response.text.match(DMregex.userAdd.full)[1];
            let slackUser = BotData.slackStore.getUserByName(slackUserName);

            if(!slackUserName) {
                reject('Nie podałeś nazwy');
            }
            if(!slackUser) {
                reject('User o takim nicku nie istnieje');
            }

            db.User.findOne({
                where: {
                    slack_id: slackUser.id
                }
            }).then((user) => {
                if(user !== null) {
                    reject('User o takim nicku istnieje w bazie');
                } else {
                    db.User.create({
                        slack_id: slackUser.id,
                        name: slackUser.name,
                        shortname: slackUser.profile.first_name.charAt(0) + slackUser.profile.last_name.charAt(0)
                    }).then(()=> {
                        resolve('Dodano usera');
                    });
                }
            });
        });
    }

    function mealAddFunc() {
        return new Promise(function(resolve, reject) {
            let textMatch = response.text.match(DMregex.mealAdd.full);
            if(!textMatch) {
                reject('Wpisz poprawnie komende');
            };
            let mealName = textMatch[1];
            let mealExtra = textMatch[2] || false;

            if(!mealName) {
                reject('Podaj nazwe dania');
            };

            db.Meal.findOne({
                where: {
                    name: mealName
                }
            }).then((meal) => {
                if(meal !== null) {
                    reject('Danie o takiej nazwie już istnieje');
                } else {
                    db.Meal.create({
                        name: mealName,
                        description: "",
                        extra: mealExtra
                    }).then(()=> {
                        resolve('Dodano danie');
                    });
                }
            });
        });
    }

}

module.exports = DMHandler;

'use strict';

const DMregex = {
    userAdd: {
        base: /^\!userAdd/i,
        full: /^\!userAdd[ ]+([\w\.]*)/i
    },
    mealAdd: {
        base: /^\!mealAdd/i,
        full: /^\!mealAdd[ ]+"([\w\. ]*)" ([\w]*)/i
    }
}

module.exports = DMregex;

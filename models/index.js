"use strict";

var fs        = require('fs');
var path      = require('path');
var Sequelize = require('sequelize');
var _         = require('lodash');
var config    = require('../config/config.json')['database'];
var sequelize = new Sequelize(config.name, config.username, config.password, {dialect: 'sqlite', storage: './db/db.sqlite'});
var db        = {};

fs.readdirSync(__dirname)
    .filter((file) => file.indexOf("_") === 0)
    .forEach((file) => {
        var model = sequelize.import(path.join(__dirname, file));
        if (model instanceof Array) {
            model.forEach(function(m) {
                db[m.name] = m;
            });
        } else {
            db[model.name] = model;
        }
    });

Object.keys(db).forEach((modelName) => {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});

module.exports = _.extend({
    sequelize: sequelize,
    Sequelize: Sequelize
}, db);

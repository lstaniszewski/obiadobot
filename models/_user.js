var Sequelize = require('sequelize');

module.exports = function(Sequelize, DataTypes) {

    var User = Sequelize.define('User', {

        slack_id: DataTypes.INTEGER,
        name: DataTypes.STRING,
        shortname: DataTypes.STRING,
        inPlan: { type: DataTypes.BOOLEAN, defaultValue: true},
    });

    return User;
}

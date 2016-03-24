var Sequelize = require('sequelize');

module.exports = function(Sequelize, DataTypes) {

    var Meal = Sequelize.define('Meal', {

        name: DataTypes.STRING,
        description: DataTypes.STRING,
        extra: { type: DataTypes.BOOLEAN, defaultValue: false},
    });

    var MealBase = Sequelize.define('MealBase', {

        name: DataTypes.STRING,
        code: DataTypes.STRING(2)

    });

    var MealSalad = Sequelize.define('MealSalad', {

        name: DataTypes.STRING,
        code: DataTypes.STRING(2)

    });

    return [Meal, MealBase, MealSalad];
}

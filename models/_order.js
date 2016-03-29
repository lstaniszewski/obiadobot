var Sequelize = require('sequelize');

module.exports = function(Sequelize, DataTypes) {

    var Order = Sequelize.define('Order', {

        isRoulette: { type: DataTypes.BOOLEAN, defaultValue: false},
        isExtra: { type: DataTypes.BOOLEAN, defaultValue: false}
    },{
        classMethods: {
          associate: (models) => {
            Order.belongsTo(models.User),
            Order.belongsTo(models.Meal),
            Order.belongsTo(models.MealBase),
            Order.belongsTo(models.MealSalad)
          }
        }
    });

    return Order;
}


require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Expense, PriceHistory } = require('./src/models');

async function syncNewModels() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Synchronize only the specific models
        await Expense.sync({ alter: true });
        console.log('Expense table has been created/updated.');

        await PriceHistory.sync({ alter: true });
        console.log('PriceHistory table has been created/updated.');

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

syncNewModels();

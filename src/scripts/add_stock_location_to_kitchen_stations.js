require('dotenv').config();
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'kitchen_stations';
    const column = 'stockLocationId';

    try {
        const tableInfo = await queryInterface.describeTable(table);

        if (tableInfo[column]) {
            console.log(`Column ${column} already exists in ${table}`);
            process.exit(0);
        }

        console.log(`Adding column ${column} to ${table}...`);

        await queryInterface.addColumn(table, column, {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'stock_locations',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

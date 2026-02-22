require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function createExpenseTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const query = `
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                category VARCHAR(100) NOT NULL,
                paymentMethod ENUM('cash', 'card', 'bank_transfer', 'other') DEFAULT 'cash',
                recordedBy INT NOT NULL,
                supplierName VARCHAR(255),
                receiptUrl VARCHAR(255),
                notes TEXT,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                FOREIGN KEY (recordedBy) REFERENCES users(id)
            ) ENGINE=InnoDB;
        `;

        await sequelize.query(query);
        console.log('Expenses table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating expenses table:', error);
        process.exit(1);
    }
}

createExpenseTable();

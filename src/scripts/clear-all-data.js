require('dotenv').config();
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const clearAllData = async () => {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected.');

        const queryInterface = sequelize.getQueryInterface();
        const tables = await queryInterface.showAllTables();

        console.log(`Found ${tables.length} tables. Starting truncation...`);

        // Disable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

        for (const table of tables) {
            // Skip SequelizeMeta if it exists (keeps migration history)
            if (table.toLowerCase() === 'sequelizemeta') {
                console.log(`Skipping migration table: ${table}`);
                continue;
            }
            console.log(`Truncating table: ${table}`);
            await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
        }

        // Enable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('All tables truncated successfully.');

        // Re-seed admin user
        console.log('Re-seeding default admin user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            username: 'admin',
            email: 'admin@pos.com',
            password: hashedPassword,
            role: 'Admin',
            fullName: 'System Administrator',
            isActive: true
        });

        console.log('\n' + '='.repeat(40));
        console.log('✓ Database tables cleared!');
        console.log('✓ All data removed.');
        console.log('✓ Default Admin account recreated:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log('  Email: admin@pos.com');
        console.log('='.repeat(40));

        process.exit(0);
    } catch (error) {
        console.error('Error clearing data:', error);
        // Try to enable FK checks even on error
        try {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
        } catch (e) { }
        process.exit(1);
    }
};

// Add a warning check
console.log('WARNING: This will delete ALL data in the database but keep the structure.');
console.log('Starting in 2 seconds...');
setTimeout(clearAllData, 2000);

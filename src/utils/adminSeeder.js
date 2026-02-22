const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES } = require('../config/roles');

/**
 * Checks if an Admin user exists, and if not, creates a default one.
 */
const seedAdmin = async () => {
    try {
        // Check if any admin exists
        const adminExists = await User.findOne({
            where: { role: ROLES.ADMIN }
        });

        if (!adminExists) {
            console.log('No Admin user found. Creating default Admin...');

            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@possystem.com';

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            await User.create({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                fullName: 'System Admin',
                role: ROLES.ADMIN,
                isActive: true
            });

            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║             DEFAULT ADMIN CREATED SUCCESSFULLY         ║');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log(`║ Username: admin                                        ║`);
            console.log(`║ Password: ${adminPassword.padEnd(45)}║`);
            console.log('╚════════════════════════════════════════════════════════╝');
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};

module.exports = seedAdmin;

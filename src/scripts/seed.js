require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { connectDB } = require('../config/database');

const seedAdmin = async () => {
    try {
        console.log('Connecting to database...');
        console.log('Environment DB_USER:', process.env.DB_USER);
        console.log('Environment DB_HOST:', process.env.DB_HOST);

        await connectDB();

        const adminExists = await User.findOne({ where: { role: 'Admin' } });
        if (adminExists) {
            console.log('Admin user already exists:', adminExists.username);
            process.exit(0);
        }

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

        console.log('-----------------------------------');
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Email: admin@pos.com');
        console.log('-----------------------------------');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();

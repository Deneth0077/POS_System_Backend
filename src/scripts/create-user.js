require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

async function createUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });

    if (existingAdmin) {
      console.log('ℹ️  User "admin" already exists');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('\nUpdating password...');

      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await existingAdmin.update({ password: hashedPassword });
      console.log('✅ Password updated successfully!');
    } else {
      console.log('Creating new admin user...\n');

      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create admin user
      const newUser = await User.create({
        username: 'admin',
        email: 'admin@possystem.com',
        password: hashedPassword,
        fullName: 'Admin User',
        role: 'Admin',
        isActive: true
      });

      console.log('✅ Admin user created successfully!');
      console.log('Username:', newUser.username);
      console.log('Email:', newUser.email);
      console.log('Role:', newUser.role);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Login Credentials:');
    console.log('='.repeat(60));
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

createUser();

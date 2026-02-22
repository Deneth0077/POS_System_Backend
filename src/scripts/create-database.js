const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: '206.189.133.69',
      port: 3306,
      user: 'vihipos_user',
      password: 'VihiPosdev091'
    });

    console.log('✓ Connected to MySQL server');

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS vihipos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Database "vihipos" created successfully!');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createDatabase();

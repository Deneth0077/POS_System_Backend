const mysql = require('mysql2/promise');

async function resetDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: '206.189.133.69',
      port: 3306,
      user: 'vihipos_user',
      password: 'VihiPosdev091'
    });

    console.log('✓ Connected to MySQL server');

    // Drop database if exists
    await connection.query('DROP DATABASE IF EXISTS vihipos');
    console.log('✓ Dropped existing database');

    // Create database
    await connection.query('CREATE DATABASE vihipos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Database "vihipos" created successfully!');

    await connection.end();
    console.log('\nDatabase is ready. You can now start the server with: npm start');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

resetDatabase();

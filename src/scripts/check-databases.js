const mysql = require('mysql2/promise');

async function checkDatabases() {
  try {
    const connection = await mysql.createConnection({
      host: '206.189.133.69',
      port: 3306,
      user: 'vihipos_user',
      password: 'VihiPosdev091'
    });

    console.log('✓ Connected to MySQL server successfully!');

    const [databases] = await connection.query('SHOW DATABASES');
    console.log('\nAvailable databases:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabases();

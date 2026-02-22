const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'vihi_pos',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      connectTimeout: 100000,
      // Fix for "Got packets out of order" / "timeout reading communication packets"
      dateStrings: true,
      typeCast: true,
      enableKeepAlive: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 100000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`MySQL Connected: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

    // Note: We're using manual migrations instead of sequelize.sync()
    // Run migrations using: node src/scripts/run-category-migration.js
    // Uncomment below only for initial setup (creates tables but doesn't alter them)
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: false });
    //   console.log('Database synchronized');
    // }
    console.log('Database ready');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

require('dotenv').config();
const { sequelize } = require('../config/database');

async function checkSchema() {
  try {
    console.log('🔍 Checking kitchen_orders schema...\n');
    
    const [results] = await sequelize.query('DESCRIBE kitchen_orders');
    
    console.log('Column details:');
    console.table(results.map(r => ({
      Field: r.Field,
      Type: r.Type,
      Null: r.Null,
      Key: r.Key,
      Default: r.Default
    })));
    
    // Check if saleId is nullable
    const saleIdColumn = results.find(r => r.Field === 'saleId');
    if (saleIdColumn) {
      console.log('\n✅ saleId column found');
      console.log('   Nullable:', saleIdColumn.Null);
      console.log('   Type:', saleIdColumn.Type);
      
      if (saleIdColumn.Null === 'YES') {
        console.log('   ✅ saleId is nullable - good!');
      } else {
        console.log('   ❌ saleId is NOT nullable - migration needed!');
      }
    }
    
    // Check for new columns
    const newColumns = ['tableId', 'customerPhone', 'customerEmail', 'paymentMethod', 'subtotal', 'tax', 'totalAmount'];
    console.log('\n📋 Checking for new columns:');
    newColumns.forEach(col => {
      const exists = results.find(r => r.Field === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

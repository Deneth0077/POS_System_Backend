require('dotenv').config();
const { sequelize } = require('../config/database');
const { MenuItem } = require('../models');

const imageUpdates = [
  { name: 'Chicken Fried Rice', imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=90' },
  { name: 'Chicken Kottu', imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&auto=format&fit=crop&q=90' },
  { name: 'Vegetable Fried Rice', imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=90' },
  { name: 'Fish Curry', imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=90' },
  { name: 'Chicken Submarine', imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&auto=format&fit=crop&q=90' },
  { name: 'Spring Rolls', imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=90' },
  { name: 'Coca Cola', imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop&q=90' },
  { name: 'Mango Juice', imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&auto=format&fit=crop&q=90' },
  { name: 'Lemon Iced Tea', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=90' },
  { name: 'Chocolate Cake', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=90' },
  { name: 'Ice Cream Sundae', imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=90' },
  { name: 'Tiramisu', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=90' },
  { name: 'Lays Chips BBQ', imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=90' },
  { name: 'Caesar Salad', imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&auto=format&fit=crop&q=90' },
  { name: 'Garlic Bread', imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=800&auto=format&fit=crop&q=90' }
];

async function updateMenuImages() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully\n');

    console.log('Updating menu item images...\n');

    for (const update of imageUpdates) {
      const result = await MenuItem.update(
        { imageUrl: update.imageUrl },
        { where: { name: update.name } }
      );

      if (result[0] > 0) {
        console.log(`✓ Updated: ${update.name}`);
      } else {
        console.log(`- Not found: ${update.name}`);
      }
    }

    console.log('\n✅ All menu item images updated successfully!');

  } catch (error) {
    console.error('Error updating menu images:', error);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed');
    process.exit();
  }
}

updateMenuImages();

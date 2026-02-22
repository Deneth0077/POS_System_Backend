const { sequelize } = require('../src/config/database');

async function fixUniqueConstraint() {
    try {
        console.log('--- STARTING INDEX FIX ---');

        // 1. Get current indexes
        const [results] = await sequelize.query(`
            SHOW INDEX FROM menu_item_ingredients
        `);

        const indexesToDrop = results
            .filter(r => r.Non_unique === 0 && r.Key_name !== 'PRIMARY')
            .map(r => r.Key_name);

        console.log('Unique indexes identified to drop:', [...new Set(indexesToDrop)]);

        // 2. Drop the unique indexes safely
        const uniqueSet = [...new Set(indexesToDrop)];
        for (const indexName of uniqueSet) {
            try {
                console.log(`Dropping unique index: ${indexName}`);
                await sequelize.query(`ALTER TABLE menu_item_ingredients DROP INDEX ${indexName}`);
            } catch (err) {
                console.log(`Could not drop ${indexName} (it might have been dropped already): ${err.message}`);
            }
        }

        // 3. Add new non-unique indexes
        console.log('Adding new non-unique indexes for performance...');
        const addIndex = async (name, col) => {
            try {
                await sequelize.query(`ALTER TABLE menu_item_ingredients ADD INDEX ${name} (${col})`);
                console.log(`Added index ${name} on ${col}`);
            } catch (err) {
                if (err.message.includes('Duplicate key name')) {
                    console.log(`Index ${name} already exists.`);
                } else {
                    console.error(`Error adding ${name}: ${err.message}`);
                }
            }
        };

        await addIndex('idx_portion_id', 'portion_id');
        await addIndex('idx_product_id', 'product_id');
        await addIndex('idx_ingredient_id', 'ingredient_id');

        console.log('--- INDEX FIX COMPLETED ---');
        process.exit(0);
    } catch (error) {
        console.error('--- CRITICAL ERROR ---', error);
        process.exit(1);
    }
}

fixUniqueConstraint();

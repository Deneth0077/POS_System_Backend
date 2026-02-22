const { KitchenStation, MenuItem, MenuItemPortion, MenuItemIngredient, StockLocation, Ingredient } = require('../src/models');

async function debugStationData(stationId) {
    try {
        console.log(`--- DEBUGGING STATION ID: ${stationId} ---`);

        const station = await KitchenStation.findByPk(stationId);
        if (!station) {
            console.log('Station not found!');
            process.exit(0);
        }

        console.log('Station Info:', {
            id: station.id,
            name: station.name,
            stockLocationId: station.stockLocationId,
            productCategories: station.productCategories
        });

        if (station.stockLocationId) {
            const location = await StockLocation.findByPk(station.stockLocationId);
            console.log('Stock Location Info:', location ? {
                id: location.id,
                name: location.locationName,
                code: location.locationCode
            } : 'Location NOT FOUND in DB');
        } else {
            console.log('Station has NO stockLocationId assigned.');
        }

        const menuItems = await MenuItem.findAll({
            where: { kitchenStationId: stationId },
            include: [{
                model: MenuItemPortion,
                as: 'portions',
                include: [{
                    model: MenuItemIngredient,
                    as: 'ingredients'
                }]
            }]
        });

        console.log(`Found ${menuItems.length} menu items assigned to this station.`);

        menuItems.forEach(item => {
            console.log(`- Item: ${item.name} (ID: ${item.id})`);
            item.portions.forEach(p => {
                console.log(`  - Portion: ${p.name} (ID: ${p.id})`);
                console.log(`    - Ingredients count: ${p.ingredients ? p.ingredients.length : 0}`);
            });
        });

        process.exit(0);
    } catch (error) {
        console.error('Debug Error:', error);
        process.exit(1);
    }
}

debugStationData(10);

const { StockLocation } = require('../src/models');

async function listLocations() {
    try {
        const locations = await StockLocation.findAll();
        console.log('Available Stock Locations:');
        locations.forEach(l => {
            console.log(`- ID: ${l.id}, Name: ${l.locationName}, Code: ${l.locationCode}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listLocations();

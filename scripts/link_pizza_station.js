const { KitchenStation } = require('../src/models');

async function linkStation() {
    try {
        const station = await KitchenStation.findByPk(10);
        if (station) {
            await station.update({ stockLocationId: 31 });
            console.log('Successfully linked Pizza Station (10) to Pizza Kitchen (31)');
        } else {
            console.log('Station 10 not found');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

linkStation();

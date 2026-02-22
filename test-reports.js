require('dotenv').config();
const reportService = require('./src/services/reportService');
const { connectDB } = require('./src/config/database');

async function testReports() {
    try {
        await connectDB();
        console.log('Testing Daily Report...');
        await reportService.getDailySalesReport();

        console.log('Testing Monthly Report...');
        await reportService.getMonthlySalesReport(2026, 2);

        console.log('Testing Profit Summary...');
        await reportService.getProfitSummary('2026-02-01', '2026-02-08');

        console.log('Testing Owner Dashboard...');
        await reportService.getOwnerDashboardStats();

        console.log('All tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.sql) console.error('SQL:', error.sql);
        if (error.stack) console.error('Stack:', error.stack);
        process.exit(1);
    }
}


testReports();

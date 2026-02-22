require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { connectDB } = require('./config/database');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const salesRoutes = require('./routes/salesRoutes');
const syncRoutes = require('./routes/syncRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const inventoryCategoryRoutes = require('./routes/inventoryCategories');
const menuRoutes = require('./routes/menuRoutes');
const tableRoutes = require('./routes/tableRoutes');
const billSplitRoutes = require('./routes/billSplitRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');

const paymentRoutes = require('./routes/paymentRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const offlineRoutes = require('./routes/offlineRoutes');
const vatSettingsRoutes = require('./routes/vatSettingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const stockRoutes = require('./routes/stockRoutes');
const reportRoutes = require('./routes/reportRoutes');
const financialRoutes = require('./routes/financialRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: VIHI POS Backend is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'POS System Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'POS System API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', billSplitRoutes); // Bill split routes should come before generic sales routes
app.use('/api/sales', salesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory/categories', inventoryCategoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/kitchen', kitchenRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/vat-settings', vatSettingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/stock-issues', require('./routes/stockIssueRoutes'));
app.use('/api/reports', reportRoutes);
app.use('/api/financials', financialRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server after database connection
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Start server after successful database connection
    server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                   POS System Backend                   ║
║           Sri Lankan Offline-First Retail System       ║
╠════════════════════════════════════════════════════════╣
║  Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}      ║
║  Health check: http://localhost:${PORT}/health          ║
║  API Documentation: http://localhost:${PORT}/api-docs   ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.log(`Unhandled Rejection:`, err);
      console.log(`Promise:`, promise);
      // Log but don't exit in development
      // server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
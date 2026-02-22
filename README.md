# POS System Backend

A robust Node.js/Express backend for "POS System" - a Sri Lankan offline-first retail system designed for seamless point-of-sale operations with advanced inventory management and synchronization capabilities.

## Features

- 🔐 **Role-Based Authentication**: Support for Admin, Manager, and Cashier roles
- 💰 **Sales Management**: Complete sales processing with automatic 15% VAT calculation (Sri Lankan standard)
- 🔄 **Offline-First Sync**: Batch synchronization of offline sales data
- 📦 **Inventory Tracking**: Advanced inventory management with batch and expiry tracking
- 🛡️ **Security**: JWT authentication, helmet security headers, and bcrypt password hashing
- 📊 **Reporting**: Sales reports and analytics with date range filtering

## Project Structure

```
Rest-POS-Backend/
├── app.js                      # Main application entry point
├── package.json                # Project dependencies and scripts
├── .env.example               # Environment variables template
└── src/
    ├── config/
    │   ├── database.js        # MongoDB connection configuration
    │   ├── roles.js           # Role-based access control definitions
    │   └── vat.js             # VAT calculation utilities (15%)
    ├── controllers/
    │   ├── authController.js  # Authentication & authorization logic
    │   ├── salesController.js # Sales processing logic
    │   ├── syncController.js  # Offline sync operations
    │   ├── productController.js  # Product management
    │   └── inventoryController.js # Inventory batch management
    ├── models/
    │   ├── User.js            # User model with roles
    │   ├── Product.js         # Product model
    │   ├── InventoryBatch.js  # Inventory batch model with expiry tracking
    │   └── Sale.js            # Sales transaction model
    ├── routes/
    │   ├── authRoutes.js      # Authentication routes
    │   ├── salesRoutes.js     # Sales routes
    │   ├── syncRoutes.js      # Sync routes
    │   ├── productRoutes.js   # Product routes
    │   └── inventoryRoutes.js # Inventory routes
    ├── services/
    │   ├── salesService.js    # Sales business logic with VAT
    │   └── syncService.js     # Synchronization service
    └── middleware/
        ├── auth.js            # JWT authentication & role authorization
        ├── errorHandler.js    # Global error handling
        └── validate.js        # Request validation middleware
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/possystem/Rest-POS-Backend.git
   cd Rest-POS-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/vihi_pos
   JWT_SECRET=your_secure_jwt_secret_here
   JWT_EXPIRE=7d
   VAT_RATE=0.15
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Sales (`/api/sales`)

- `POST /api/sales` - Create new sale (with automatic VAT calculation)
- `GET /api/sales` - Get sales (supports date range filtering)
- `GET /api/sales/:id` - Get specific sale
- `GET /api/sales/report` - Generate sales report

### Sync (`/api/sync`)

- `POST /api/sync/offline-sales` - **Batch sync offline sales**
- `GET /api/sync/unsynced-sales` - Get unsynced sales
- `POST /api/sync/inventory` - Sync inventory updates
- `GET /api/sync/inventory-snapshot` - Get current inventory for offline use

### Products (`/api/products`)

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get specific product
- `POST /api/products` - Create product (Manager/Admin)
- `PUT /api/products/:id` - Update product (Manager/Admin)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Inventory (`/api/inventory`)

- `GET /api/inventory` - Get all inventory batches (with expiry tracking)
- `GET /api/inventory/:id` - Get specific batch
- `POST /api/inventory` - Create inventory batch (Manager/Admin)
- `PUT /api/inventory/:id` - Update inventory batch (Manager/Admin)
- `DELETE /api/inventory/:id` - Delete inventory batch (Admin only)

## Role-Based Access Control

### Admin
- Full system access
- User management
- All inventory and sales operations
- System configuration

### Manager
- Inventory management
- Sales operations
- View reports
- Sync data
- Product management

### Cashier
- Create sales
- Sync offline sales
- View products
- Limited access

## VAT Calculation

The system automatically calculates 15% VAT (Value Added Tax) for Sri Lanka:

```javascript
// Example sale calculation
Subtotal: LKR 1,000.00
VAT (15%): LKR 150.00
Total: LKR 1,150.00
```

## Offline-First Sync

The system supports offline sales that can be synced later:

**Request Body for `/api/sync/offline-sales`:**
```json
{
  "sales": [
    {
      "offlineId": "offline-sale-uuid-1",
      "items": [
        {
          "product": "product_id",
          "quantity": 2,
          "unitPrice": 500,
          "batchNumber": "BATCH001"
        }
      ],
      "amountPaid": 1150,
      "paymentMethod": "cash",
      "cashierName": "John Doe"
    }
  ]
}
```

## Inventory Batch & Expiry Tracking

Each inventory batch includes:
- Batch number
- Quantity tracking
- Manufacturing date
- Expiry date
- Automatic expiry status
- Cost and selling prices
- Supplier information

## Dependencies

### Core Dependencies
- **express**: ^5.2.1 - Web framework
- **mongoose**: ^9.0.0 - MongoDB ODM
- **jsonwebtoken**: ^9.0.3 - JWT authentication
- **bcryptjs**: ^3.0.3 - Password hashing
- **dotenv**: ^17.2.3 - Environment variables
- **cors**: ^2.8.5 - CORS middleware
- **helmet**: ^8.1.0 - Security headers
- **morgan**: ^1.10.1 - HTTP request logger
- **express-validator**: ^7.3.1 - Request validation

### Dev Dependencies
- **nodemon**: ^3.1.11 - Auto-reload during development

## Testing

Health check endpoint:
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "message": "POS System Backend is running",
  "timestamp": "2025-12-05T16:00:00.000Z"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/vihi_pos |
| JWT_SECRET | JWT signing secret | (required) |
| JWT_EXPIRE | JWT expiration time | 7d |
| VAT_RATE | VAT rate for Sri Lanka | 0.15 |
| CORS_ORIGIN | Allowed CORS origin | * |

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based authorization
- Helmet security headers
- Request validation
- Error handling middleware
- MongoDB injection prevention

## License

ISC

## Author

POS System Solution

---

**Note**: This is an offline-first POS system designed specifically for Sri Lankan retail businesses with 15% VAT compliance.
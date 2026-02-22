# Complete Swagger API Documentation

## Overview
Complete OpenAPI 3.0 documentation has been implemented for the POS System Backend API.

## Access Swagger UI
- **URL**: http://localhost:5000/api-docs
- **Server**: Development mode on port 5000
- **Format**: Interactive Swagger UI interface

## Documented API Endpoints

### 🔐 Authentication (`/api/auth`)
- **POST** `/register` - Register new user (Admin only)
  - Request body: username, email, password, fullName, role
  - Security: JWT Bearer token required
  - Rate limited: Auth rate limiter
  
- **POST** `/login` - User authentication
  - Request body: username, password
  - Returns: JWT token and user profile
  - Feature: Creates a new active session
  - Rate limited: Auth rate limiter

- **POST** `/register-biometric` - Register biometric ID (Protected)
  - Request body: biometricId
  - Feature: Links a biometric identifier to the logged-in user
  - Security: JWT Bearer token required

- **POST** `/biometric-login` - Login using biometric ID
  - Request body: biometricId
  - Returns: JWT token and user profile
  - Feature: Fast login for POS hardware integration
  - Rate limited: Auth rate limiter

- **POST** `/logout` - Log out user (Protected)
  - Feature: Invalidate session on the server side
  - Security: JWT Bearer token required

- **GET** `/me` - Get current user profile
  - Security: JWT Bearer token required
  - Rate limited: API rate limiter

- **GET** `/roles` - Retrieve available roles
  - Returns: Array of strings representing system roles

- **POST** `/assign-role` - Assign role to user
  - Request body: userId, role
  - Security: Admin role required

- **GET** `/audit-logs` - Fetch activity logs
  - Feature: Paginated system activity logs
  - Security: Admin or Manager only

### 📦 Products (`/api/products`)
- **GET** `/` - List all products with pagination
  - Query params: page, limit, search, category
  - Security: JWT required
  
- **GET** `/{id}` - Get product by ID
  - Path param: Product ID
  - Security: JWT required
  
- **POST** `/` - Create new product
  - Request body: name, sku, category, unitPrice, costPrice, etc.
  - Security: Admin or Manager role required
  - Validation: Express-validator rules applied
  
- **PUT** `/{id}` - Update product
  - Security: Admin or Manager role required
  
- **DELETE** `/{id}` - Soft delete product
  - Security: Admin role required

### 📊 Inventory (`/api/inventory`)
- **GET** `/` - List inventory batches
  - Query params: product, expiringSoon
  - Features: Expiry warnings (30-day threshold)
  - Security: JWT required
  
- **GET** `/{id}` - Get inventory batch by ID
  - Security: JWT required
  
- **POST** `/` - Create inventory batch
  - Request body: product, batchNumber, quantity, costPrice, sellingPrice, expiryDate, etc.
  - Security: Admin or Manager role required
  - Features: Automatic expiry tracking
  
- **PUT** `/{id}` - Update inventory batch
  - Security: Admin or Manager role required
  
- **DELETE** `/{id}` - Delete inventory batch
  - Security: Admin role required

### 💰 Sales (`/api/sales`)
- **POST** `/` - Create new sale transaction
  - Request body: items[], paymentMethod, amountPaid, customerName, etc.
  - Features: Automatic 15% VAT calculation, sale number generation
  - Security: All authenticated users (Admin, Manager, Cashier)
  
- **GET** `/` - List all sales with pagination
  - Query params: page, limit, startDate, endDate, cashier
  - Security: Admin or Manager role required
  
- **GET** `/report` - Generate sales report
  - Query params: startDate, endDate, groupBy
  - Returns: Total sales, VAT, transactions, analytics
  - Security: Admin or Manager role required
  
- **GET** `/{id}` - Get sale by ID
  - Security: Admin, Manager, or Cashier

### 🔄 Sync (`/api/sync`)
- **POST** `/offline-sales` - Sync offline sales
  - Request body: sales[] with offlineId, items, amountPaid, etc.
  - Features: Bulk offline transaction upload
  - Security: All authenticated users
  - Rate limited: Sync rate limiter
  
- **GET** `/unsynced-sales` - Get unsynced sales
  - Security: Admin or Manager role required
  
- **POST** `/inventory` - Sync inventory updates
  - Request body: updates[] with productId, quantity, batchNumber
  - Security: Admin or Manager role required
  
- **GET** `/inventory-snapshot` - Download inventory snapshot
  - Returns: Complete product and inventory data for offline operation
  - Security: All authenticated users

### 💵 Cash Payments (`/api/payments/cash`)
- **POST** `/process` - Process cash payment transaction
  - Request body: saleId, amount, amountPaid, denominations
  - Returns: Transaction details with change calculation
  - Security: All authenticated users (Admin, Manager, Cashier)
  
- **POST** `/validate` - Validate cash denomination and amount
  - Request body: denominations[], expectedTotal
  - Returns: Validation result with calculated total
  - Security: All authenticated users
  
- **GET** `/drawer` - Get current cash drawer status
  - Query params: cashierId, shiftId
  - Returns: Cash drawer balance, variance, transaction counts
  - Security: All authenticated users
  
- **POST** `/drawer/open` - Open cash drawer for shift
  - Request body: openingBalance, denominations
  - Returns: Drawer ID and opening details
  - Security: All authenticated users
  
- **POST** `/drawer/close` - Close cash drawer and reconcile
  - Request body: drawerId, closingBalance, actualCash, denominations
  - Returns: Reconciliation report with variance
  - Security: All authenticated users
  
- **POST** `/refund` - Process cash refund
  - Request body: saleId, amount, reason
  - Returns: Refund transaction details
  - Security: Admin or Manager role required

### 💳 Card Payments (`/api/payments/card`)
- **POST** `/initialize` - Initialize card payment session
  - Request body: saleId, amount, currency, cardType, returnUrl
  - Returns: Session ID, payment intent, client secret
  - Security: All authenticated users (Admin, Manager, Cashier)
  
- **POST** `/process` - Process card payment transaction
  - Request body: sessionId, cardDetails, billingDetails, saveCard
  - Returns: Transaction details with authorization code
  - Security: All authenticated users
  
- **GET** `/status/{sessionId}` - Check card payment status
  - Path param: sessionId
  - Returns: Current payment status and details
  - Security: All authenticated users
  
- **POST** `/verify` - Verify payment gateway webhook
  - Request body: eventType, paymentIntentId, status, signature
  - Returns: Webhook processing confirmation
  - Security: Public (with signature verification)
  
- **POST** `/refund` - Process card refund
  - Request body: transactionId, amount, reason
  - Returns: Refund details and estimated arrival
  - Security: Admin or Manager role required
  
- **GET** `/transactions` - List card payment transactions
  - Query params: page, limit, startDate, endDate, status, cardBrand
  - Returns: Paginated transaction list
  - Security: Admin or Manager role required
  
- **POST** `/cancel` - Cancel pending card payment
  - Request body: sessionId, reason
  - Returns: Cancellation confirmation
  - Security: All authenticated users

## Documentation Features

### 📋 Request/Response Schemas
- All endpoints include complete request body schemas
- Response examples with success/error formats
- Data validation rules documented inline
- Example values for all fields

### 🔒 Security Schemes
- **JWT Bearer Authentication**: All protected endpoints documented with `bearerAuth`
- Role-based access control documented per endpoint
- Rate limiting information included

### 📝 Data Models
Complete schemas for:
- **User**: username, email, role, fullName, isActive, lastLogin
- **Product**: name, sku, barcode, category, unitPrice, costPrice, reorderLevel
- **Sale**: saleNumber, items[], subtotal, vatAmount, totalAmount, paymentMethod
- **InventoryBatch**: batchNumber, quantity, costPrice, sellingPrice, expiryDate, isExpired

### 🏷️ Tags & Organization
- Authentication
- Products
- Inventory
- Sales
- Sync
- Cash Payments
- Tables
- Bill Splits
- Kitchen Orders

### ⚠️ Error Responses
All endpoints document standard HTTP error codes:
- `400` - Validation errors
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `429` - Rate limit exceeded

## Rate Limiting Tiers
- **Auth Limiter**: Used for login/register (stricter limits)
- **API Limiter**: Standard API operations
- **Sync Limiter**: Specialized for offline sync operations

## Business Logic Documentation

### VAT Calculation
- Automatic 15% VAT on all sales (Sri Lankan compliance)
- VAT rate: 0.15 (configurable in config/vat.js)
- Formula: vatAmount = subtotal × 0.15

### Sale Number Generation
- Format: `SALE-YYYYMMDD-XXX`
- Example: `SALE-20251209-001`
- Auto-incremented per day

### Inventory Expiry Tracking
- Automatic `isExpired` flag based on current date
- 30-day warning threshold for expiring products
- Filter: `?expiringSoon=true`

### Offline Sync
- Offline sales identified by unique `offlineId`
- Batch upload support for multiple transactions
- Inventory snapshot for complete offline operation

## Testing with Swagger UI

1. **Start Server**: Server is running on http://localhost:5000
2. **Open Swagger**: Navigate to http://localhost:5000/api-docs
3. **Authenticate**:
   - Click "Authorize" button (🔒)
   - Login via `/api/auth/login` to get JWT token
   - Enter token in format: `Bearer <your-token>`
   - Click "Authorize"
4. **Test Endpoints**: All endpoints become interactive
5. **View Responses**: Real-time response viewing with status codes

## Implementation Details

### Technology Stack
- **Swagger-JSDoc**: 6.2.8 - Generates OpenAPI spec from JSDoc comments
- **Swagger-UI-Express**: 5.0.0 - Interactive API documentation UI
- **OpenAPI**: 3.0.0 specification

### Files Modified
1. `src/config/swagger.js` - OpenAPI base configuration and schemas
2. `src/routes/authRoutes.js` - Auth endpoint documentation
3. `src/routes/productRoutes.js` - Product endpoint documentation
4. `src/routes/inventoryRoutes.js` - Inventory endpoint documentation
5. `src/routes/salesRoutes.js` - Sales endpoint documentation
6. `src/routes/syncRoutes.js` - Sync endpoint documentation
7. `app.js` - Swagger UI middleware integration

### Configuration
```javascript
// Swagger accessible at:
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger spec available at:
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});
```

## Benefits

✅ **Interactive Testing**: Test all endpoints directly from browser
✅ **Clear Documentation**: All parameters, schemas, and responses documented
✅ **Security Integration**: JWT authentication built into documentation
✅ **Validation Rules**: Input validation requirements clearly specified
✅ **Role-Based Access**: Permission requirements documented per endpoint
✅ **Error Handling**: All error scenarios documented with examples
✅ **Business Logic**: VAT calculations, offline sync flows documented
✅ **Rate Limiting**: Rate limit tiers clearly indicated

## Next Steps

1. **Test API**: Use Swagger UI to test all endpoints
2. **Create Test Data**: Use `/api/products` and `/api/inventory` to add sample data
3. **Test Sales Flow**: Create sales transactions with VAT calculation
4. **Test Offline Sync**: Upload offline sales using sync endpoints
5. **Export Spec**: Download OpenAPI JSON from `/api-docs.json` for external tools

---

**Documentation Status**: ✅ COMPLETE
**Server Status**: ✅ Running on port 5000
**Database Status**: ✅ MySQL synchronized
**Swagger UI**: ✅ Available at http://localhost:5000/api-docs

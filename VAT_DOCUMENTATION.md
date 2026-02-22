# VAT System Documentation

## Overview

The POS system includes a comprehensive VAT (Value Added Tax) management system that supports:
- Customizable VAT rates and calculation methods
- Multi-region compliance
- Service charge integration  
- Real-time VAT calculations
- Detailed VAT reporting

---

## API Endpoints

### VAT Settings Management

#### 1. Get Current Active VAT Settings
```http
GET /api/vat-settings/current
Authorization: Bearer {token}
```
**Access:** Manager, Admin  
**Description:** Returns the currently active VAT configuration

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isEnabled": true,
    "defaultRate": 0.15,
    "calculationMethod": "EXCLUSIVE",
    "displayLabel": "VAT (15%)",
    "complianceRegion": "Sri Lanka"
  }
}
```

---

#### 2. Get All VAT Settings
```http
GET /api/vat-settings
Authorization: Bearer {token}
```
**Access:** Admin  
**Description:** Returns all VAT settings (including historical)

---

#### 3. Get VAT Presets
```http
GET /api/vat-settings/presets
Authorization: Bearer {token}
```
**Access:** Admin  
**Description:** Returns predefined VAT configuration templates for different regions

**Response:**
```json
{
  "success": true,
  "data": {
    "sriLanka": {
      "defaultRate": 0.15,
      "calculationMethod": "EXCLUSIVE",
      "displayLabel": "VAT",
      "complianceRegion": "Sri Lanka"
    },
    "india": {
      "defaultRate": 0.18,
      "calculationMethod": "EXCLUSIVE",
      "displayLabel": "GST",
      "complianceRegion": "India"
    }
  }
}
```

---

#### 4. Create VAT Settings
```http
POST /api/vat-settings
Authorization: Bearer {token}
Content-Type: application/json
```
**Access:** Admin  
**Description:** Create new VAT configuration

**Request Body:**
```json
{
  "isEnabled": true,
  "defaultRate": 0.15,
  "calculationMethod": "EXCLUSIVE",
  "displayOnReceipt": true,
  "displayLabel": "VAT (15%)",
  "roundingMethod": "NEAREST",
  "roundingPrecision": 2,
  "taxRegistrationNumber": "VAT-LK-123456",
  "complianceRegion": "Sri Lanka",
  "enableServiceCharge": true,
  "serviceChargeRate": 0.10,
  "applyVATOnServiceCharge": true
}
```

**Calculation Methods:**
- `EXCLUSIVE` - VAT added on top of price (most common)
- `INCLUSIVE` - VAT already included in price
- `COMPOUND` - VAT on subtotal after other taxes
- `SPLIT_RATE` - Different rates for different categories
- `TIERED` - Different rates based on amount ranges

**Rounding Methods:**
- `NEAREST` - Round to nearest value (default)
- `UP` - Always round up
- `DOWN` - Always round down
- `NONE` - No rounding

---

#### 5. Get VAT Setting by ID
```http
GET /api/vat-settings/{id}
Authorization: Bearer {token}
```
**Access:** Manager, Admin

---

#### 6. Update VAT Settings
```http
PUT /api/vat-settings/{id}
Authorization: Bearer {token}
Content-Type: application/json
```
**Access:** Admin  
**Description:** Update existing VAT settings

**Request Body:**
```json
{
  "defaultRate": 0.18,
  "displayLabel": "VAT (18%)",
  "notes": "Updated rate effective from 2025"
}
```

---

#### 7. Activate VAT Settings
```http
PUT /api/vat-settings/{id}/activate
Authorization: Bearer {token}
```
**Access:** Admin  
**Description:** Activate a specific VAT configuration (deactivates all others)

---

#### 8. Delete VAT Settings
```http
DELETE /api/vat-settings/{id}
Authorization: Bearer {token}
```
**Access:** Admin  
**Description:** Delete VAT settings (cannot delete active settings)

---

#### 9. Test VAT Calculation
```http
POST /api/vat-settings/test-calculation
Authorization: Bearer {token}
Content-Type: application/json
```
**Access:** Manager, Admin  
**Description:** Test VAT calculation with current settings

**Request Body:**
```json
{
  "amount": 1000,
  "items": [
    { "category": "Food", "amount": 500 },
    { "category": "Beverages", "amount": 500 }
  ]
}
```

---

### Sales VAT Operations

#### 10. Calculate VAT for Items
```http
POST /api/sales/vat/calculate
Authorization: Bearer {token}
Content-Type: application/json
```
**Access:** Cashier, Manager, Admin  
**Description:** Calculate VAT for a list of items before creating a sale

**Request Body:**
```json
{
  "items": [
    {
      "productName": "Burger",
      "quantity": 2,
      "unitPrice": 500
    },
    {
      "productName": "Coke",
      "quantity": 1,
      "unitPrice": 200
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "subtotal": 1200.00,
  "vatAmount": 180.00,
  "totalAmount": 1380.00,
  "vatRate": 0.15,
  "serviceCharge": 120.00
}
```

---

#### 11. Get VAT Breakdown for Sale
```http
GET /api/sales/{id}/vat
Authorization: Bearer {token}
```
**Access:** Cashier, Manager, Admin  
**Description:** Get detailed VAT breakdown for a specific sale

**Response:**
```json
{
  "success": true,
  "data": {
    "sale": {
      "id": 1,
      "saleNumber": "SALE-20251219-0001",
      "saleDate": "2025-12-19T10:30:00Z"
    },
    "breakdown": {
      "subtotal": 1200.00,
      "vatAmount": 180.00,
      "totalAmount": 1380.00,
      "vatRate": 0.15,
      "effectiveRate": 15.00
    },
    "validation": {
      "isValid": true,
      "expectedVAT": 180.00,
      "actualVAT": 180.00,
      "difference": 0.00
    }
  }
}
```

---

#### 12. Generate VAT Report
```http
GET /api/sales/reports/vat?startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer {token}
```
**Access:** Manager, Admin  
**Description:** Generate comprehensive VAT report for date range

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-12-01",
      "endDate": "2025-12-31"
    },
    "summary": {
      "totalSales": 150000.00,
      "totalVAT": 22500.00,
      "totalServiceCharge": 15000.00,
      "transactionCount": 320
    },
    "breakdown": {
      "byDate": [...],
      "byCategory": [...],
      "byPaymentMethod": [...]
    }
  }
}
```

---

#### 13. Generate Period VAT Report
```http
GET /api/sales/reports/vat/{period}
Authorization: Bearer {token}
```
**Access:** Manager, Admin  
**Description:** Generate VAT report for specific period (daily, monthly, quarterly)

**Parameters:**
- `period` - One of: `daily`, `weekly`, `monthly`, `quarterly`

---

#### 14. Export VAT Report to CSV
```http
GET /api/sales/reports/vat/export/csv?startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer {token}
```
**Access:** Manager, Admin  
**Description:** Export VAT report as CSV file

---

## Common Use Cases

### 1. Initial Setup

```javascript
// 1. Login as Admin
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

// 2. Create VAT Settings
POST /api/vat-settings
{
  "defaultRate": 0.15,
  "calculationMethod": "EXCLUSIVE",
  "displayLabel": "VAT (15%)",
  "complianceRegion": "Sri Lanka",
  "isActive": true
}

// 3. Activate Settings
PUT /api/vat-settings/1/activate
```

---

### 2. Creating a Sale with VAT

```javascript
// 1. Calculate VAT first
POST /api/sales/vat/calculate
{
  "items": [
    { "productName": "Item 1", "quantity": 2, "unitPrice": 500 }
  ]
}

// 2. Create Sale
POST /api/sales
{
  "items": [
    { "product": 1, "quantity": 2, "unitPrice": 500 }
  ],
  "paymentMethod": "cash",
  "amountPaid": 1200
}
```

---

### 3. Monthly VAT Reporting

```javascript
// Get monthly VAT report
GET /api/sales/reports/vat/monthly

// Export to CSV
GET /api/sales/reports/vat/export/csv?startDate=2025-12-01&endDate=2025-12-31
```

---

## Configuration Examples

### Sri Lanka (15% VAT + 10% Service Charge)
```json
{
  "defaultRate": 0.15,
  "calculationMethod": "EXCLUSIVE",
  "displayLabel": "VAT",
  "enableServiceCharge": true,
  "serviceChargeRate": 0.10,
  "applyVATOnServiceCharge": true,
  "taxRegistrationNumber": "VAT-SL-XXXXXX",
  "complianceRegion": "Sri Lanka"
}
```

### India (18% GST)
```json
{
  "defaultRate": 0.18,
  "calculationMethod": "EXCLUSIVE",
  "displayLabel": "GST",
  "enableServiceCharge": false,
  "taxRegistrationNumber": "GST-IN-XXXXXX",
  "complianceRegion": "India"
}
```

### UAE (5% VAT)
```json
{
  "defaultRate": 0.05,
  "calculationMethod": "EXCLUSIVE",
  "displayLabel": "VAT",
  "enableServiceCharge": true,
  "serviceChargeRate": 0.10,
  "applyVATOnServiceCharge": false,
  "taxRegistrationNumber": "TRN-XXXXXX",
  "complianceRegion": "UAE"
}
```

---

## Testing

Access Swagger UI for interactive testing:
```
http://localhost:5000/api-docs
```

All VAT endpoints are documented and can be tested directly from the Swagger interface.

---

## Notes

- All VAT calculations use the active settings (only one can be active at a time)
- VAT settings changes don't affect historical sales
- Service charge is calculated before VAT if `applyVATOnServiceCharge` is true
- All monetary values are stored with 2 decimal precision
- VAT reports include both summary and detailed breakdowns
- CSV exports are suitable for accounting software import

---

## Support

For issues or questions:
1. Check the Swagger documentation at `/api-docs`
2. Review the API responses for detailed error messages
3. Ensure you have the correct user role for the endpoint
4. Verify your VAT settings are properly configured and activated

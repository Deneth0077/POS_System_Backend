const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'POS System Backend API',
      version: '1.0.0',
      description: 'Sri Lankan offline-first retail POS system with 15% VAT compliance',
      contact: {
        name: 'POS System',
        url: 'https://github.com/possystem',
        email: 'support@possystem.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.possystem.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['Admin', 'Manager', 'Cashier'],
              example: 'Cashier'
            },
            fullName: {
              type: 'string',
              example: 'John Doe'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-09T10:30:00Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Coca Cola 500ml'
            },
            sku: {
              type: 'string',
              example: 'COKE-500'
            },
            barcode: {
              type: 'string',
              example: '1234567890123'
            },
            description: {
              type: 'string',
              example: 'Refreshing carbonated beverage'
            },
            category: {
              type: 'string',
              example: 'Beverages'
            },
            unitPrice: {
              type: 'number',
              format: 'decimal',
              example: 150.00
            },
            costPrice: {
              type: 'number',
              format: 'decimal',
              example: 100.00
            },
            taxable: {
              type: 'boolean',
              example: true
            },
            unit: {
              type: 'string',
              example: 'bottle'
            },
            reorderLevel: {
              type: 'integer',
              example: 10
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        InventoryBatch: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            productId: {
              type: 'integer',
              example: 1
            },
            batchNumber: {
              type: 'string',
              example: 'BATCH-2025-001'
            },
            quantity: {
              type: 'integer',
              example: 50
            },
            purchasedQuantity: {
              type: 'integer',
              example: 100
            },
            costPrice: {
              type: 'number',
              format: 'decimal',
              example: 100.00
            },
            sellingPrice: {
              type: 'number',
              format: 'decimal',
              example: 150.00
            },
            manufacturingDate: {
              type: 'string',
              format: 'date',
              example: '2025-01-01'
            },
            expiryDate: {
              type: 'string',
              format: 'date',
              example: '2026-12-31'
            },
            supplier: {
              type: 'string',
              example: 'ABC Suppliers Ltd'
            },
            location: {
              type: 'string',
              example: 'Main Store'
            },
            isExpired: {
              type: 'boolean',
              example: false
            },
            notes: {
              type: 'string',
              example: 'Handle with care'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Sale: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            saleNumber: {
              type: 'string',
              example: 'SALE-20251209-0001'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: {
                    type: 'integer',
                    example: 1
                  },
                  productName: {
                    type: 'string',
                    example: 'Coca Cola 500ml'
                  },
                  quantity: {
                    type: 'integer',
                    example: 2
                  },
                  unitPrice: {
                    type: 'number',
                    format: 'decimal',
                    example: 150.00
                  },
                  subtotal: {
                    type: 'number',
                    format: 'decimal',
                    example: 300.00
                  },
                  batchNumber: {
                    type: 'string',
                    example: 'BATCH-2025-001'
                  }
                }
              }
            },
            subtotal: {
              type: 'number',
              format: 'decimal',
              example: 1000.00
            },
            vatAmount: {
              type: 'number',
              format: 'decimal',
              example: 150.00
            },
            vatRate: {
              type: 'number',
              format: 'decimal',
              example: 0.15
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              example: 1150.00
            },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'card', 'mobile', 'other'],
              example: 'cash'
            },
            amountPaid: {
              type: 'number',
              format: 'decimal',
              example: 1200.00
            },
            changeGiven: {
              type: 'number',
              format: 'decimal',
              example: 50.00
            },
            cashierId: {
              type: 'integer',
              example: 1
            },
            cashierName: {
              type: 'string',
              example: 'John Doe'
            },
            saleDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-09T10:30:00Z'
            },
            offlineId: {
              type: 'string',
              example: 'offline-uuid-123'
            },
            syncedAt: {
              type: 'string',
              format: 'date-time'
            },
            isSynced: {
              type: 'boolean',
              example: true
            },
            status: {
              type: 'string',
              enum: ['completed', 'refunded', 'voided'],
              example: 'completed'
            },
            notes: {
              type: 'string',
              example: 'Customer notes'
            },
            tableId: {
              type: 'integer',
              example: 5
            },
            tableNumber: {
              type: 'string',
              example: 'T-05'
            },
            orderType: {
              type: 'string',
              enum: ['dine-in', 'takeaway', 'delivery'],
              example: 'dine-in',
              description: 'Type of order - dine-in for restaurant tables, takeaway for pickup, delivery for home delivery'
            },
            isSplit: {
              type: 'boolean',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        KitchenOrder: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            orderNumber: {
              type: 'string',
              example: 'KO-20251217-0001'
            },
            saleId: {
              type: 'integer',
              example: 1
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'integer'
                  },
                  productName: {
                    type: 'string'
                  },
                  quantity: {
                    type: 'integer'
                  },
                  stationId: {
                    type: 'integer'
                  },
                  stationName: {
                    type: 'string'
                  },
                  status: {
                    type: 'string',
                    enum: ['pending', 'preparing', 'ready', 'completed']
                  }
                }
              }
            },
            orderType: {
              type: 'string',
              enum: ['dine-in', 'takeaway', 'delivery']
            },
            tableNumber: {
              type: 'string'
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent']
            },
            status: {
              type: 'string',
              enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled']
            },
            estimatedTime: {
              type: 'integer',
              description: 'Estimated preparation time in minutes'
            },
            specialInstructions: {
              type: 'string'
            },
            assignedStations: {
              type: 'array',
              items: {
                type: 'integer'
              }
            }
          }
        },
        KitchenStation: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Grill Station'
            },
            code: {
              type: 'string',
              example: 'GRL'
            },
            description: {
              type: 'string'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            priority: {
              type: 'integer',
              example: 0
            },
            color: {
              type: 'string',
              example: '#FF5733'
            },
            averagePrepTime: {
              type: 'integer',
              example: 10
            },
            productCategories: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Burgers', 'Steaks']
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Products',
        description: 'Product management endpoints'
      },
      {
        name: 'Inventory',
        description: 'Inventory batch management with expiry tracking'
      },
      {
        name: 'Sales',
        description: 'Sales processing with automatic 15% VAT calculation'
      },
      {
        name: 'Sync',
        description: 'Offline sales synchronization endpoints'
      },
      {
        name: 'Kitchen',
        description: 'Kitchen order routing and management system'
      },
      {
        name: 'Health',
        description: 'System health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './app.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

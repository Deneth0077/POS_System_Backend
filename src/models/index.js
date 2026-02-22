const { sequelize } = require('../config/database');
const User = require('./User');
const AuditLog = require('./AuditLog');
const Product = require('./Product');
const Sale = require('./Sale');
const InventoryBatch = require('./InventoryBatch');
const MenuItem = require('./MenuItem');
const Ingredient = require('./Ingredient');
const MenuItemIngredient = require('./MenuItemIngredient');
const IngredientTransaction = require('./IngredientTransaction');
const StockAlert = require('./StockAlert');
const Table = require('./Table');
const BillSplit = require('./BillSplit');
const KitchenOrder = require('./KitchenOrder');
const KitchenStation = require('./KitchenStation');
const MenuItemPortion = require('./MenuItemPortion');
const InventoryCategory = require('./InventoryCategory');
const KitchenInventoryCategory = require('./KitchenInventoryCategory');

const CashDrawer = require('./CashDrawer');
const PaymentTransaction = require('./PaymentTransaction');
const CardSession = require('./CardSession');
const MobilePaymentSession = require('./MobilePaymentSession');
const Receipt = require('./Receipt');
const OfflineQueue = require('./OfflineQueue');
const SyncLog = require('./SyncLog');
const VATSettings = require('./VATSettings');
const Session = require('./Session');
const Notification = require('./Notification');
const Expense = require('./Expense');
const PriceHistory = require('./PriceHistory');

// Stock Management Models
const StockTransaction = require('./StockTransaction');
const StockTransfer = require('./StockTransfer');
const StockTransferItem = require('./StockTransferItem');
const DamagedStock = require('./DamagedStock');
const StockReturn = require('./StockReturn');
const StockLocation = require('./StockLocation');
const StockReconciliation = require('./StockReconciliation');
const StockReconciliationItem = require('./StockReconciliationItem');
const StockIssue = require('./StockIssue');

// Define associations

// User associations
User.hasMany(Sale, {
  foreignKey: 'cashierId',
  as: 'sales'
});

Sale.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

// Product - InventoryBatch associations
Product.hasMany(InventoryBatch, {
  foreignKey: 'productId',
  as: 'batches'
});

InventoryBatch.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

// MenuItem - Ingredient many-to-many relationship
MenuItem.belongsToMany(Ingredient, {
  through: MenuItemIngredient,
  foreignKey: 'menuItemId',
  otherKey: 'ingredientId',
  as: 'ingredients'
});

Ingredient.belongsToMany(MenuItem, {
  through: MenuItemIngredient,
  foreignKey: 'ingredientId',
  otherKey: 'menuItemId',
  as: 'menuItems'
});

// Direct access to junction table
MenuItem.hasMany(MenuItemIngredient, {
  foreignKey: 'menuItemId',
  as: 'recipe'
});

MenuItemIngredient.belongsTo(MenuItem, {
  foreignKey: 'menuItemId',
  as: 'menuItem'
});

Ingredient.hasMany(MenuItemIngredient, {
  foreignKey: 'ingredientId',
  as: 'usedIn'
});

MenuItemIngredient.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

// Ingredient - Transaction associations
Ingredient.hasMany(IngredientTransaction, {
  foreignKey: 'ingredientId',
  as: 'transactions'
});

IngredientTransaction.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(IngredientTransaction, {
  foreignKey: 'performedBy',
  as: 'ingredientTransactions'
});

IngredientTransaction.belongsTo(User, {
  foreignKey: 'performedBy',
  as: 'performer'
});

// Ingredient - StockAlert associations
Ingredient.hasMany(StockAlert, {
  foreignKey: 'ingredientId',
  as: 'alerts'
});

StockAlert.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(StockAlert, {
  foreignKey: 'acknowledgedBy',
  as: 'acknowledgedAlerts'
});

User.hasMany(StockAlert, {
  foreignKey: 'resolvedBy',
  as: 'resolvedAlerts'
});

StockAlert.belongsTo(User, {
  foreignKey: 'acknowledgedBy',
  as: 'acknowledger'
});

StockAlert.belongsTo(User, {
  foreignKey: 'resolvedBy',
  as: 'resolver'
});

// Table and Sale associations
Table.hasMany(Sale, {
  foreignKey: 'tableId',
  as: 'orders'
});

Sale.belongsTo(Table, {
  foreignKey: 'tableId',
  as: 'table'
});

// Bill Split associations
Sale.hasMany(BillSplit, {
  foreignKey: 'saleId',
  as: 'splits',
  onDelete: 'CASCADE'
});

BillSplit.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

User.hasMany(BillSplit, {
  foreignKey: 'paidBy',
  as: 'processedSplits'
});

BillSplit.belongsTo(User, {
  foreignKey: 'paidBy',
  as: 'cashier'
});

// Kitchen Order associations
Sale.hasMany(KitchenOrder, {
  foreignKey: 'saleId',
  as: 'kitchenOrders',
  onDelete: 'CASCADE'
});

KitchenOrder.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

// Kitchen Station associations
KitchenStation.hasMany(KitchenOrder, {
  foreignKey: 'kitchenStationId',
  as: 'orders'
});

KitchenOrder.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

KitchenStation.hasMany(Sale, {
  foreignKey: 'kitchenStationId',
  as: 'sales'
});

Sale.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

KitchenStation.hasMany(MenuItem, {
  foreignKey: 'kitchenStationId',
  as: 'menuItems'
});

MenuItem.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

KitchenStation.hasMany(Product, {
  foreignKey: 'kitchenStationId',
  as: 'products'
});

Product.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

// Inventory Category associations
InventoryCategory.hasMany(Ingredient, {
  foreignKey: 'categoryId',
  as: 'ingredients'
});

Ingredient.belongsTo(InventoryCategory, {
  foreignKey: 'categoryId',
  as: 'inventoryCategory'
});

// Kitchen Station - Ingredient associations
KitchenStation.hasMany(Ingredient, {
  foreignKey: 'kitchenStationId',
  as: 'ingredients'
});

Ingredient.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

// Kitchen-Inventory Category many-to-many relationship
KitchenStation.belongsToMany(InventoryCategory, {
  through: KitchenInventoryCategory,
  foreignKey: 'kitchenStationId',
  otherKey: 'inventoryCategoryId',
  as: 'inventoryCategories'
});

InventoryCategory.belongsToMany(KitchenStation, {
  through: KitchenInventoryCategory,
  foreignKey: 'inventoryCategoryId',
  otherKey: 'kitchenStationId',
  as: 'kitchenStations'
});

// Direct access to junction table
KitchenStation.hasMany(KitchenInventoryCategory, {
  foreignKey: 'kitchenStationId',
  as: 'categoryAssignments'
});

KitchenInventoryCategory.belongsTo(KitchenStation, {
  foreignKey: 'kitchenStationId',
  as: 'kitchenStation'
});

InventoryCategory.hasMany(KitchenInventoryCategory, {
  foreignKey: 'inventoryCategoryId',
  as: 'kitchenAssignments'
});

KitchenInventoryCategory.belongsTo(InventoryCategory, {
  foreignKey: 'inventoryCategoryId',
  as: 'inventoryCategory'
});

// MenuItem Portions and Ingredients associations
MenuItem.hasMany(MenuItemPortion, {
  foreignKey: 'menuItemId',
  as: 'portions',
  onDelete: 'CASCADE'
});

MenuItemPortion.belongsTo(MenuItem, {
  foreignKey: 'menuItemId',
  as: 'menuItem'
});

MenuItemPortion.hasMany(MenuItemIngredient, {
  foreignKey: 'portionId',
  as: 'ingredients',
  onDelete: 'CASCADE'
});

MenuItemIngredient.belongsTo(MenuItemPortion, {
  foreignKey: 'portionId',
  as: 'portion'
});

MenuItemIngredient.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Product.hasMany(MenuItemIngredient, {
  foreignKey: 'productId',
  as: 'usedInMenuItems'
});

// Cash Drawer associations
User.hasMany(CashDrawer, {
  foreignKey: 'cashierId',
  as: 'cashDrawers'
});

CashDrawer.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

CashDrawer.belongsTo(User, {
  foreignKey: 'reconciledBy',
  as: 'reconciler'
});

// Payment Transaction associations
PaymentTransaction.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

Sale.hasMany(PaymentTransaction, {
  foreignKey: 'saleId',
  as: 'paymentTransactions'
});

PaymentTransaction.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

User.hasMany(PaymentTransaction, {
  foreignKey: 'cashierId',
  as: 'paymentTransactions'
});

PaymentTransaction.belongsTo(CashDrawer, {
  foreignKey: 'cashDrawerId',
  as: 'cashDrawer'
});

CashDrawer.hasMany(PaymentTransaction, {
  foreignKey: 'cashDrawerId',
  as: 'transactions'
});

PaymentTransaction.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

// Card Session associations
CardSession.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

Sale.hasMany(CardSession, {
  foreignKey: 'saleId',
  as: 'cardSessions'
});

CardSession.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

User.hasMany(CardSession, {
  foreignKey: 'cashierId',
  as: 'cardSessions'
});

// Mobile Payment Session associations
MobilePaymentSession.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

Sale.hasMany(MobilePaymentSession, {
  foreignKey: 'saleId',
  as: 'mobilePaymentSessions'
});

MobilePaymentSession.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

User.hasMany(MobilePaymentSession, {
  foreignKey: 'cashierId',
  as: 'mobilePaymentSessions'
});

// Receipt associations
Receipt.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});

Sale.hasMany(Receipt, {
  foreignKey: 'saleId',
  as: 'receipts'
});

Receipt.belongsTo(User, {
  foreignKey: 'generatedBy',
  as: 'generator'
});

User.hasMany(Receipt, {
  foreignKey: 'generatedBy',
  as: 'generatedReceipts'
});

Receipt.belongsTo(User, {
  foreignKey: 'voidedBy',
  as: 'voider'
});

// Offline Queue associations
OfflineQueue.belongsTo(User, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

OfflineQueue.belongsTo(User, {
  foreignKey: 'conflictResolvedBy',
  as: 'resolver'
});

// Sync Log associations
SyncLog.belongsTo(User, {
  foreignKey: 'initiatedBy',
  as: 'initiator'
});

// Audit Log associations
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

// VAT Settings associations
VATSettings.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier'
});

// Session associations
Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Session, {
  foreignKey: 'userId',
  as: 'sessions'
});

// Stock Management Associations

// StockTransaction associations
Ingredient.hasMany(StockTransaction, {
  foreignKey: 'ingredientId',
  as: 'stockTransactions'
});

StockTransaction.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(StockTransaction, {
  foreignKey: 'performedBy',
  as: 'stockTransactionsPerformed'
});

StockTransaction.belongsTo(User, {
  foreignKey: 'performedBy',
  as: 'performer'
});

User.hasMany(StockTransaction, {
  foreignKey: 'approvedBy',
  as: 'stockTransactionsApproved'
});

StockTransaction.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

User.hasMany(StockTransaction, {
  foreignKey: 'createdBy',
  as: 'stockTransactionsCreated'
});

StockTransaction.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// StockTransfer associations
StockTransfer.hasMany(StockTransferItem, {
  foreignKey: 'transferId',
  as: 'items'
});

StockTransferItem.belongsTo(StockTransfer, {
  foreignKey: 'transferId',
  as: 'transfer'
});

Ingredient.hasMany(StockTransferItem, {
  foreignKey: 'ingredientId',
  as: 'transferItems'
});

StockTransferItem.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(StockTransfer, {
  foreignKey: 'initiatedBy',
  as: 'transfersInitiated'
});

StockTransfer.belongsTo(User, {
  foreignKey: 'initiatedBy',
  as: 'initiator'
});

User.hasMany(StockTransfer, {
  foreignKey: 'receivedBy',
  as: 'transfersReceived'
});

StockTransfer.belongsTo(User, {
  foreignKey: 'receivedBy',
  as: 'receiver'
});

User.hasMany(StockTransfer, {
  foreignKey: 'approvedBy',
  as: 'transfersApproved'
});

StockTransfer.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

StockTransferItem.belongsTo(StockTransaction, {
  foreignKey: 'stockTransactionOutId',
  as: 'outboundTransaction'
});

StockTransferItem.belongsTo(StockTransaction, {
  foreignKey: 'stockTransactionInId',
  as: 'inboundTransaction'
});

// DamagedStock associations
Ingredient.hasMany(DamagedStock, {
  foreignKey: 'ingredientId',
  as: 'damagedStockRecords'
});

DamagedStock.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(DamagedStock, {
  foreignKey: 'reportedBy',
  as: 'damagedStockReported'
});

DamagedStock.belongsTo(User, {
  foreignKey: 'reportedBy',
  as: 'reporter'
});

User.hasMany(DamagedStock, {
  foreignKey: 'approvedBy',
  as: 'damagedStockApproved'
});

DamagedStock.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

DamagedStock.belongsTo(StockTransaction, {
  foreignKey: 'stockTransactionId',
  as: 'stockTransaction'
});

// StockReturn associations
Ingredient.hasMany(StockReturn, {
  foreignKey: 'ingredientId',
  as: 'returnRecords'
});

StockReturn.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(StockReturn, {
  foreignKey: 'initiatedBy',
  as: 'returnsInitiated'
});

StockReturn.belongsTo(User, {
  foreignKey: 'initiatedBy',
  as: 'initiator'
});

User.hasMany(StockReturn, {
  foreignKey: 'approvedBy',
  as: 'returnsApproved'
});

StockReturn.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

StockReturn.belongsTo(StockTransaction, {
  foreignKey: 'stockTransactionId',
  as: 'stockTransaction'
});

// StockLocation associations
User.hasMany(StockLocation, {
  foreignKey: 'managerId',
  as: 'managedLocations'
});

StockLocation.belongsTo(User, {
  foreignKey: 'managerId',
  as: 'manager'
});

// StockReconciliation associations
StockReconciliation.hasMany(StockReconciliationItem, {
  foreignKey: 'reconciliationId',
  as: 'items'
});

StockReconciliationItem.belongsTo(StockReconciliation, {
  foreignKey: 'reconciliationId',
  as: 'reconciliation'
});

Ingredient.hasMany(StockReconciliationItem, {
  foreignKey: 'ingredientId',
  as: 'reconciliationItems'
});

StockReconciliationItem.belongsTo(Ingredient, {
  foreignKey: 'ingredientId',
  as: 'ingredient'
});

User.hasMany(StockReconciliation, {
  foreignKey: 'performedBy',
  as: 'reconciliationsPerformed'
});

StockReconciliation.belongsTo(User, {
  foreignKey: 'performedBy',
  as: 'performer'
});

User.hasMany(StockReconciliation, {
  foreignKey: 'approvedBy',
  as: 'reconciliationsApproved'
});

StockReconciliation.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

StockReconciliationItem.belongsTo(StockTransaction, {
  foreignKey: 'stockTransactionId',
  as: 'stockTransaction'
});

// StockIssue associations
StockIssue.belongsTo(MenuItem, {
  foreignKey: 'menuItemId',
  as: 'menuItem'
});

StockIssue.belongsTo(MenuItemPortion, {
  foreignKey: 'portionId',
  as: 'portion'
});

StockIssue.belongsTo(User, {
  foreignKey: 'requestedBy',
  as: 'requester'
});

StockIssue.belongsTo(User, {
  foreignKey: 'confirmedBy',
  as: 'confirmer'
});

StockIssue.belongsTo(StockLocation, {
  foreignKey: 'fromLocationId',
  as: 'fromLocation'
});

StockIssue.belongsTo(StockLocation, {
  foreignKey: 'toLocationId',
  as: 'toLocation'
});

// KitchenStation associations
KitchenStation.belongsTo(StockLocation, {
  foreignKey: 'stockLocationId',
  as: 'stockLocation'
});

StockLocation.hasMany(KitchenStation, {
  foreignKey: 'stockLocationId',
  as: 'kitchenStations'
});

// Expense associations
User.hasMany(Expense, {
  foreignKey: 'recordedBy',
  as: 'recordedExpenses'
});

Expense.belongsTo(User, {
  foreignKey: 'recordedBy',
  as: 'recorder'
});

// PriceHistory associations
User.hasMany(PriceHistory, {
  foreignKey: 'changedBy',
  as: 'priceChanges'
});

PriceHistory.belongsTo(User, {
  foreignKey: 'changedBy',
  as: 'changer'
});

module.exports = {
  sequelize,
  User,
  Product,
  Sale,
  InventoryBatch,
  MenuItem,
  Ingredient,
  MenuItemIngredient,
  IngredientTransaction,
  StockAlert,
  Table,
  BillSplit,
  KitchenOrder,
  KitchenStation,
  MenuItemPortion,
  InventoryCategory,
  KitchenInventoryCategory,

  CashDrawer,
  PaymentTransaction,
  CardSession,
  MobilePaymentSession,
  Receipt,
  OfflineQueue,
  SyncLog,
  VATSettings,
  Session,
  AuditLog,
  Notification,

  // Stock Management
  StockTransaction,
  StockTransfer,
  StockTransferItem,
  DamagedStock,
  StockReturn,
  StockLocation,
  StockReconciliation,
  StockReconciliationItem,
  StockIssue,
  Expense,
  PriceHistory
};

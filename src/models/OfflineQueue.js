const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * OfflineQueue Model
 * Stores sales and operations performed while offline for later synchronization
 * Sub-issue 9.1: Local storage schema for offline orders
 */
const OfflineQueue = sequelize.define('OfflineQueue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Queue Identification
  queueId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for queue item (generated offline)'
  },
  
  deviceId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Device identifier that created the offline transaction'
  },
  
  // Operation Details
  operationType: {
    type: DataTypes.ENUM('sale', 'payment', 'receipt', 'inventory', 'other'),
    allowNull: false,
    defaultValue: 'sale',
    comment: 'Type of operation performed offline'
  },
  
  // Transaction Data
  transactionData: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Complete transaction data stored as JSON'
  },
  
  // Offline Context
  offlineTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the operation was performed offline'
  },
  
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who performed the offline operation'
  },
  
  cashierName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Sync Status
  syncStatus: {
    type: DataTypes.ENUM('pending', 'syncing', 'synced', 'failed', 'conflict', 'skipped'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current synchronization status'
  },
  
  syncAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of sync attempts made'
  },
  
  lastSyncAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time sync was attempted'
  },
  
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When successfully synced to server'
  },
  
  // Error Handling
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if sync failed'
  },
  
  errorDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed error information'
  },
  
  // Conflict Resolution (Sub-issue 9.4)
  hasConflict: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this item has a conflict'
  },
  
  conflictType: {
    type: DataTypes.ENUM('duplicate', 'data_mismatch', 'integrity', 'validation', 'none'),
    allowNull: true,
    comment: 'Type of conflict detected'
  },
  
  conflictDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Details about the conflict'
  },
  
  conflictResolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who resolved the conflict'
  },
  
  conflictResolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  resolutionStrategy: {
    type: DataTypes.ENUM('keep_offline', 'keep_online', 'merge', 'manual', 'skip'),
    allowNull: true,
    comment: 'Strategy used to resolve conflict'
  },
  
  // Server Mapping
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the record created on server after sync'
  },
  
  serverReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference number from server (e.g., sale number)'
  },
  
  // Priority and Retry
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Sync priority (1-10, higher = more important)'
  },
  
  retryAfter: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Do not retry before this timestamp'
  },
  
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Maximum number of retry attempts'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the queue item'
  },
  
  // Checksums for integrity
  dataChecksum: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'SHA-256 checksum of transaction data'
  },
  
  // Audit Fields
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'offline_queue',
  timestamps: true,
  indexes: [
    { fields: ['queueId'] },
    { fields: ['deviceId'] },
    { fields: ['syncStatus'] },
    { fields: ['operationType'] },
    { fields: ['offlineTimestamp'] },
    { fields: ['hasConflict'] },
    { fields: ['cashierId'] },
    { fields: ['priority', 'offlineTimestamp'] }
  ]
});

module.exports = OfflineQueue;

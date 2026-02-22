const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SyncLog Model
 * Tracks all synchronization operations and their outcomes
 * Sub-issue 9.2: Sync mechanism tracking
 */
const SyncLog = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Sync Session
  syncSessionId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique identifier for sync session'
  },
  
  deviceId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Device that initiated sync'
  },
  
  // Sync Details
  syncType: {
    type: DataTypes.ENUM('manual', 'automatic', 'scheduled', 'startup'),
    allowNull: false,
    defaultValue: 'automatic',
    comment: 'How sync was triggered'
  },
  
  syncDirection: {
    type: DataTypes.ENUM('upload', 'download', 'bidirectional'),
    allowNull: false,
    defaultValue: 'upload',
    comment: 'Direction of sync'
  },
  
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When sync started'
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When sync completed'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'partial', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'in_progress'
  },
  
  // Statistics
  itemsQueued: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total items in queue'
  },
  
  itemsProcessed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Items successfully processed'
  },
  
  itemsFailed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Items that failed'
  },
  
  itemsConflicted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Items with conflicts'
  },
  
  itemsSkipped: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Items skipped'
  },
  
  // Operation Breakdown
  operationStats: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Breakdown by operation type'
  },
  
  // Performance
  durationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Sync duration in milliseconds'
  },
  
  dataTransferredKb: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Amount of data transferred in KB'
  },
  
  // Error Information
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  errorDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Conflict Summary
  conflicts: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of conflicts encountered'
  },
  
  // Network Info
  networkType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of network connection'
  },
  
  ipAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // User Context
  initiatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who initiated sync'
  },
  
  initiatedByName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Audit
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
  tableName: 'sync_logs',
  timestamps: true,
  indexes: [
    { fields: ['syncSessionId'] },
    { fields: ['deviceId'] },
    { fields: ['status'] },
    { fields: ['syncType'] },
    { fields: ['startedAt'] },
    { fields: ['initiatedBy'] }
  ]
});

module.exports = SyncLog;

const WebSocket = require('ws');
const crypto = require('crypto');

class SyncManager {
    constructor(options = {}) {
        this.syncServer = options.syncServer || 'ws://localhost:8081';
        this.apiUrl = options.apiUrl || 'http://localhost:3000';
        this.deviceId = options.deviceId || this.generateDeviceId();
        this.userId = options.userId || null;
        this.isConnected = false;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second

        // Sync state
        this.lastSyncTimestamp = 0;
        this.pendingChanges = [];
        this.conflictResolution = options.conflictResolution || 'timestamp'; // 'timestamp', 'manual', 'merge'

        // Data stores
        this.localData = new Map();
        this.remoteData = new Map();
        this.syncQueue = [];

        this.initialize();
    }

    async initialize() {
        console.log('🔄 Initializing Sync Manager...');

        // Load last sync timestamp
        this.loadSyncState();

        // Connect to sync server
        await this.connectToSyncServer();

        // Start periodic sync
        this.startPeriodicSync();

        console.log('✅ Sync Manager initialized');
    }

    generateDeviceId() {
        // Generate unique device identifier
        const deviceInfo = `${require('os').platform()}_${require('os').hostname()}_${Date.now()}`;
        return crypto.createHash('sha256').update(deviceInfo).digest('hex');
    }

    async connectToSyncServer() {
        try {
            console.log('🌐 Connecting to sync server...');

            this.ws = new WebSocket(this.syncServer);

            this.ws.on('open', () => {
                console.log('✅ Connected to sync server');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;

                // Authenticate with server
                this.authenticate();
            });

            this.ws.on('message', (data) => {
                this.handleSyncMessage(JSON.parse(data.toString()));
            });

            this.ws.on('close', () => {
                console.log('❌ Disconnected from sync server');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('❌ Sync server error:', error);
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ Failed to connect to sync server:', error);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connectToSyncServer();
        }, delay);
    }

    authenticate() {
        const authMessage = {
            type: 'AUTHENTICATE',
            payload: {
                deviceId: this.deviceId,
                userId: this.userId,
                timestamp: Date.now()
            }
        };

        this.sendMessage(authMessage);
    }

    handleSyncMessage(message) {
        try {
            switch (message.type) {
                case 'AUTHENTICATED':
                    this.handleAuthentication(message.payload);
                    break;

                case 'SYNC_DATA':
                    this.handleSyncData(message.payload);
                    break;

                case 'CONFLICT_RESOLUTION':
                    this.handleConflictResolution(message.payload);
                    break;

                case 'HEARTBEAT':
                    this.handleHeartbeat();
                    break;

                case 'USER_JOINED':
                    this.handleUserJoined(message.payload);
                    break;

                case 'USER_LEFT':
                    this.handleUserLeft(message.payload);
                    break;

                default:
                    console.log('📨 Unknown sync message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error handling sync message:', error);
        }
    }

    handleAuthentication(payload) {
        console.log('🔐 Authentication successful');
        this.userId = payload.userId;

        // Request initial sync
        this.requestInitialSync();
    }

    handleSyncData(payload) {
        try {
            const { dataType, data, timestamp, sourceDevice } = payload;

            // Avoid syncing our own changes
            if (sourceDevice === this.deviceId) {
                return;
            }

            // Check for conflicts
            const localData = this.localData.get(dataType);
            if (localData && localData.timestamp > timestamp) {
                // Local data is newer, potential conflict
                this.handlePotentialConflict(dataType, localData, { data, timestamp, sourceDevice });
            } else {
                // Remote data is newer, apply it
                this.applyRemoteData(dataType, data, timestamp);
            }

        } catch (error) {
            console.error('❌ Error handling sync data:', error);
        }
    }

    handleConflictResolution(payload) {
        try {
            const { dataType, resolution, timestamp } = payload;

            switch (this.conflictResolution) {
                case 'timestamp':
                    // Use the most recent data
                    if (resolution.timestamp > this.localData.get(dataType)?.timestamp) {
                        this.applyRemoteData(dataType, resolution.data, resolution.timestamp);
                    }
                    break;

                case 'merge':
                    // Merge conflicting data
                    this.mergeData(dataType, resolution);
                    break;

                case 'manual':
                    // Require manual resolution
                    this.requestManualResolution(dataType, resolution);
                    break;
            }

        } catch (error) {
            console.error('❌ Error handling conflict resolution:', error);
        }
    }

    handleHeartbeat() {
        // Respond to heartbeat
        this.sendMessage({
            type: 'HEARTBEAT_RESPONSE',
            payload: {
                timestamp: Date.now(),
                deviceId: this.deviceId
            }
        });
    }

    handleUserJoined(payload) {
        console.log('👤 User joined sync:', payload.userName);
    }

    handleUserLeft(payload) {
        console.log('👤 User left sync:', payload.userName);
    }

    // Data Synchronization Methods
    async syncData(dataType, data) {
        try {
            // Store locally with timestamp
            const timestamp = Date.now();
            this.localData.set(dataType, {
                data: data,
                timestamp: timestamp,
                deviceId: this.deviceId
            });

            // Add to sync queue
            this.syncQueue.push({
                dataType: dataType,
                data: data,
                timestamp: timestamp,
                deviceId: this.deviceId
            });

            // Send to sync server if connected
            if (this.isConnected) {
                this.sendDataToServer(dataType, data, timestamp);
            }

            // Save to persistent storage
            await this.saveToPersistentStorage(dataType, data, timestamp);

        } catch (error) {
            console.error('❌ Error syncing data:', error);
        }
    }

    sendDataToServer(dataType, data, timestamp) {
        const syncMessage = {
            type: 'SYNC_DATA',
            payload: {
                dataType: dataType,
                data: data,
                timestamp: timestamp,
                deviceId: this.deviceId,
                userId: this.userId
            }
        };

        this.sendMessage(syncMessage);
    }

    applyRemoteData(dataType, data, timestamp) {
        try {
            this.remoteData.set(dataType, {
                data: data,
                timestamp: timestamp
            });

            // Merge with local data if needed
            this.mergeDataIfNeeded(dataType);

            console.log('✅ Applied remote data:', dataType);
        } catch (error) {
            console.error('❌ Error applying remote data:', error);
        }
    }

    mergeDataIfNeeded(dataType) {
        // Implement data merging logic based on data type
        switch (dataType) {
            case 'settings':
                this.mergeSettings();
                break;
            case 'blockedSites':
                this.mergeBlockedSites();
                break;
            case 'userPreferences':
                this.mergeUserPreferences();
                break;
        }
    }

    mergeSettings() {
        // Merge settings from multiple devices
        const localSettings = this.localData.get('settings')?.data || {};
        const remoteSettings = this.remoteData.get('settings')?.data || {};

        // Use most recent values for each setting
        const mergedSettings = { ...localSettings };

        for (const [key, value] of Object.entries(remoteSettings)) {
            if (!localSettings[key] || value.timestamp > localSettings[key].timestamp) {
                mergedSettings[key] = value;
            }
        }

        this.localData.set('settings', {
            data: mergedSettings,
            timestamp: Date.now(),
            deviceId: this.deviceId
        });
    }

    mergeBlockedSites() {
        // Merge blocked sites from multiple devices
        const localSites = this.localData.get('blockedSites')?.data || [];
        const remoteSites = this.remoteData.get('blockedSites')?.data || [];

        // Combine unique sites
        const mergedSites = [...new Set([...localSites, ...remoteSites])];

        this.localData.set('blockedSites', {
            data: mergedSites,
            timestamp: Date.now(),
            deviceId: this.deviceId
        });
    }

    mergeUserPreferences() {
        // Merge user preferences
        const localPrefs = this.localData.get('userPreferences')?.data || {};
        const remotePrefs = this.remoteData.get('userPreferences')?.data || {};

        const mergedPrefs = { ...localPrefs, ...remotePrefs };

        this.localData.set('userPreferences', {
            data: mergedPrefs,
            timestamp: Date.now(),
            deviceId: this.deviceId
        });
    }

    handlePotentialConflict(dataType, localData, remoteData) {
        console.log('⚠️ Potential conflict detected:', dataType);

        switch (this.conflictResolution) {
            case 'timestamp':
                // Use most recent data
                if (remoteData.timestamp > localData.timestamp) {
                    this.applyRemoteData(dataType, remoteData.data, remoteData.timestamp);
                }
                break;

            case 'merge':
                // Attempt automatic merge
                this.attemptAutoMerge(dataType, localData, remoteData);
                break;

            case 'manual':
                // Request manual resolution
                this.requestManualResolution(dataType, { localData, remoteData });
                break;
        }
    }

    attemptAutoMerge(dataType, localData, remoteData) {
        try {
            // Attempt to automatically merge data
            let mergedData;

            switch (dataType) {
                case 'settings':
                    mergedData = { ...localData.data, ...remoteData.data };
                    break;
                case 'blockedSites':
                    mergedData = [...new Set([...localData.data, ...remoteData.data])];
                    break;
                default:
                    // Use most recent data
                    mergedData = remoteData.timestamp > localData.timestamp ? remoteData.data : localData.data;
            }

            this.applyRemoteData(dataType, mergedData, Math.max(localData.timestamp, remoteData.timestamp));

        } catch (error) {
            console.error('❌ Auto-merge failed:', error);
            this.requestManualResolution(dataType, { localData, remoteData });
        }
    }

    requestManualResolution(dataType, conflictData) {
        console.log('👤 Manual resolution required for:', dataType);

        // Notify user about conflict
        this.notifyConflict(dataType, conflictData);
    }

    notifyConflict(dataType, conflictData) {
        // Send notification about conflict requiring manual resolution
        const conflictNotification = {
            type: 'CONFLICT_DETECTED',
            payload: {
                dataType: dataType,
                conflictData: conflictData,
                timestamp: Date.now()
            }
        };

        // This would typically show a UI for manual resolution
        console.log('⚠️ Conflict notification:', conflictNotification);
    }

    // Utility Methods
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    requestInitialSync() {
        const syncRequest = {
            type: 'REQUEST_INITIAL_SYNC',
            payload: {
                deviceId: this.deviceId,
                userId: this.userId,
                lastSyncTimestamp: this.lastSyncTimestamp
            }
        };

        this.sendMessage(syncRequest);
    }

    startPeriodicSync() {
        // Sync every 30 seconds
        setInterval(() => {
            this.performPeriodicSync();
        }, 30000);
    }

    performPeriodicSync() {
        if (!this.isConnected) {
            return;
        }

        // Send any pending changes
        this.processSyncQueue();

        // Request updates from server
        this.requestServerUpdates();
    }

    processSyncQueue() {
        while (this.syncQueue.length > 0) {
            const change = this.syncQueue.shift();
            this.sendDataToServer(change.dataType, change.data, change.timestamp);
        }
    }

    requestServerUpdates() {
        const updateRequest = {
            type: 'REQUEST_UPDATES',
            payload: {
                deviceId: this.deviceId,
                userId: this.userId,
                lastSyncTimestamp: this.lastSyncTimestamp
            }
        };

        this.sendMessage(updateRequest);
    }

    async saveToPersistentStorage(dataType, data, timestamp) {
        try {
            // Save to local storage or database
            const storageKey = `sync_${dataType}`;
            const storageData = {
                data: data,
                timestamp: timestamp,
                deviceId: this.deviceId
            };

            // This would typically save to a database
            console.log('💾 Saved to persistent storage:', dataType);

        } catch (error) {
            console.error('❌ Error saving to persistent storage:', error);
        }
    }

    loadSyncState() {
        try {
            // Load last sync timestamp from storage
            this.lastSyncTimestamp = 0; // Would load from storage
        } catch (error) {
            console.error('❌ Error loading sync state:', error);
        }
    }

    // Public API
    async syncSettings(settings) {
        await this.syncData('settings', settings);
    }

    async syncBlockedSites(sites) {
        await this.syncData('blockedSites', sites);
    }

    async syncUserPreferences(preferences) {
        await this.syncData('userPreferences', preferences);
    }

    getSyncStatus() {
        return {
            isConnected: this.isConnected,
            deviceId: this.deviceId,
            userId: this.userId,
            lastSyncTimestamp: this.lastSyncTimestamp,
            pendingChanges: this.syncQueue.length,
            conflictResolution: this.conflictResolution
        };
    }

    setConflictResolution(strategy) {
        this.conflictResolution = strategy;
    }

    // Cleanup
    cleanup() {
        try {
            if (this.ws) {
                this.ws.close();
            }

            // Process any remaining sync items
            this.processSyncQueue();

        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

module.exports = SyncManager;
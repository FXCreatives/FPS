const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class CollaborationManager {
    constructor(options = {}) {
        this.port = options.port || 8080;
        this.server = null;
        this.wss = null;
        this.connectedUsers = new Map();
        this.rooms = new Map();
        this.jwtSecret = options.jwtSecret || 'collaboration-secret';
        this.maxUsersPerRoom = options.maxUsersPerRoom || 50;
        this.messageHistory = new Map();

        // Initialize WebSocket server
        this.initializeWebSocketServer();
    }

    initializeWebSocketServer() {
        console.log('🤝 Initializing Collaboration Manager...');

        // Create HTTP server
        this.server = require('http').createServer();

        // Create WebSocket server
        this.wss = new WebSocket.Server({ server: this.server });

        // Set up WebSocket event handlers
        this.setupWebSocketHandlers();

        // Start server
        this.server.listen(this.port, () => {
            console.log(`✅ Collaboration server running on port ${this.port}`);
        });
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
    }

    handleConnection(ws, request) {
        console.log('🔗 New collaboration connection established');

        ws.on('message', (message) => {
            this.handleMessage(ws, message);
        });

        ws.on('close', () => {
            this.handleDisconnection(ws);
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });
    }

    handleMessage(ws, message) {
        try {
            const data = JSON.parse(message.toString());
            const { type, payload, token, roomId } = data;

            // Validate user authentication
            if (!this.validateToken(token)) {
                this.sendError(ws, 'Invalid authentication token');
                return;
            }

            // Get user info from token
            const userInfo = this.getUserFromToken(token);

            // Handle different message types
            switch (type) {
                case 'JOIN_ROOM':
                    this.handleJoinRoom(ws, userInfo, payload.roomId);
                    break;

                case 'LEAVE_ROOM':
                    this.handleLeaveRoom(ws, userInfo, roomId);
                    break;

                case 'SEND_MESSAGE':
                    this.handleSendMessage(ws, userInfo, payload);
                    break;

                case 'UPDATE_FILTERS':
                    this.handleUpdateFilters(ws, userInfo, payload);
                    break;

                case 'SYNC_SETTINGS':
                    this.handleSyncSettings(ws, userInfo, payload);
                    break;

                case 'REQUEST_HISTORY':
                    this.handleRequestHistory(ws, userInfo, roomId);
                    break;

                case 'USER_TYPING':
                    this.handleUserTyping(ws, userInfo, payload);
                    break;

                default:
                    this.sendError(ws, 'Unknown message type');
            }

        } catch (error) {
            console.error('❌ Error handling message:', error);
            this.sendError(ws, 'Invalid message format');
        }
    }

    validateToken(token) {
        try {
            if (!token) return false;

            const decoded = jwt.verify(token, this.jwtSecret);
            return decoded.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    }

    getUserFromToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    handleJoinRoom(ws, userInfo, roomId) {
        try {
            // Create or join room
            if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, {
                    id: roomId,
                    users: new Map(),
                    createdAt: new Date(),
                    settings: {}
                });
            }

            const room = this.rooms.get(roomId);

            // Check room capacity
            if (room.users.size >= this.maxUsersPerRoom) {
                this.sendError(ws, 'Room is full');
                return;
            }

            // Add user to room
            room.users.set(userInfo.userId, {
                ws: ws,
                userInfo: userInfo,
                joinedAt: new Date()
            });

            // Store user connection
            this.connectedUsers.set(userInfo.userId, {
                ws: ws,
                roomId: roomId,
                userInfo: userInfo
            });

            // Send room joined confirmation
            this.sendToUser(ws, {
                type: 'ROOM_JOINED',
                payload: {
                    roomId: roomId,
                    userCount: room.users.size,
                    users: Array.from(room.users.values()).map(u => u.userInfo)
                }
            });

            // Notify other users in room
            this.broadcastToRoom(roomId, {
                type: 'USER_JOINED',
                payload: {
                    user: userInfo,
                    userCount: room.users.size
                }
            }, userInfo.userId);

            console.log(`👤 User ${userInfo.email} joined room ${roomId}`);

        } catch (error) {
            console.error('❌ Error joining room:', error);
            this.sendError(ws, 'Failed to join room');
        }
    }

    handleLeaveRoom(ws, userInfo, roomId) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) return;

            // Remove user from room
            room.users.delete(userInfo.userId);

            // Remove user connection
            this.connectedUsers.delete(userInfo.userId);

            // If room is empty, delete it
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                this.messageHistory.delete(roomId);
            } else {
                // Notify other users
                this.broadcastToRoom(roomId, {
                    type: 'USER_LEFT',
                    payload: {
                        user: userInfo,
                        userCount: room.users.size
                    }
                }, userInfo.userId);
            }

            console.log(`👤 User ${userInfo.email} left room ${roomId}`);

        } catch (error) {
            console.error('❌ Error leaving room:', error);
        }
    }

    handleSendMessage(ws, userInfo, payload) {
        try {
            const { roomId, message, messageType = 'text' } = payload;

            const room = this.rooms.get(roomId);
            if (!room) {
                this.sendError(ws, 'Room not found');
                return;
            }

            // Create message object
            const messageObj = {
                id: crypto.randomUUID(),
                userId: userInfo.userId,
                userName: userInfo.firstName + ' ' + userInfo.lastName,
                message: message,
                messageType: messageType,
                timestamp: new Date().toISOString(),
                roomId: roomId
            };

            // Store in history
            if (!this.messageHistory.has(roomId)) {
                this.messageHistory.set(roomId, []);
            }
            this.messageHistory.get(roomId).push(messageObj);

            // Keep only last 1000 messages
            const messages = this.messageHistory.get(roomId);
            if (messages.length > 1000) {
                messages.splice(0, messages.length - 1000);
            }

            // Broadcast to all users in room
            this.broadcastToRoom(roomId, {
                type: 'NEW_MESSAGE',
                payload: messageObj
            });

        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.sendError(ws, 'Failed to send message');
        }
    }

    handleUpdateFilters(ws, userInfo, payload) {
        try {
            const { roomId, filters } = payload;

            const room = this.rooms.get(roomId);
            if (!room) {
                this.sendError(ws, 'Room not found');
                return;
            }

            // Update room filters
            room.settings.filters = filters;

            // Broadcast filter update to all users in room
            this.broadcastToRoom(roomId, {
                type: 'FILTERS_UPDATED',
                payload: {
                    filters: filters,
                    updatedBy: userInfo.userId
                }
            });

            console.log(`⚙️ Filters updated by ${userInfo.email} in room ${roomId}`);

        } catch (error) {
            console.error('❌ Error updating filters:', error);
            this.sendError(ws, 'Failed to update filters');
        }
    }

    handleSyncSettings(ws, userInfo, payload) {
        try {
            const { roomId, settings } = payload;

            const room = this.rooms.get(roomId);
            if (!room) {
                this.sendError(ws, 'Room not found');
                return;
            }

            // Update room settings
            room.settings = { ...room.settings, ...settings };

            // Broadcast settings sync to all users in room
            this.broadcastToRoom(roomId, {
                type: 'SETTINGS_SYNCED',
                payload: {
                    settings: settings,
                    syncedBy: userInfo.userId
                }
            });

        } catch (error) {
            console.error('❌ Error syncing settings:', error);
            this.sendError(ws, 'Failed to sync settings');
        }
    }

    handleRequestHistory(ws, userInfo, roomId) {
        try {
            const messages = this.messageHistory.get(roomId) || [];

            this.sendToUser(ws, {
                type: 'MESSAGE_HISTORY',
                payload: {
                    messages: messages.slice(-100) // Last 100 messages
                }
            });

        } catch (error) {
            console.error('❌ Error getting message history:', error);
            this.sendError(ws, 'Failed to get message history');
        }
    }

    handleUserTyping(ws, userInfo, payload) {
        try {
            const { roomId, isTyping } = payload;

            // Broadcast typing status to other users in room
            this.broadcastToRoom(roomId, {
                type: 'USER_TYPING',
                payload: {
                    user: userInfo,
                    isTyping: isTyping
                }
            }, userInfo.userId);

        } catch (error) {
            console.error('❌ Error handling user typing:', error);
        }
    }

    handleDisconnection(ws) {
        try {
            // Find user connection
            for (const [userId, connection] of this.connectedUsers.entries()) {
                if (connection.ws === ws) {
                    const roomId = connection.roomId;

                    // Remove from room
                    const room = this.rooms.get(roomId);
                    if (room) {
                        room.users.delete(userId);

                        // Notify other users
                        this.broadcastToRoom(roomId, {
                            type: 'USER_LEFT',
                            payload: {
                                user: connection.userInfo,
                                userCount: room.users.size
                            }
                        }, userId);

                        // Clean up empty rooms
                        if (room.users.size === 0) {
                            this.rooms.delete(roomId);
                            this.messageHistory.delete(roomId);
                        }
                    }

                    // Remove connection
                    this.connectedUsers.delete(userId);
                    break;
                }
            }

        } catch (error) {
            console.error('❌ Error handling disconnection:', error);
        }
    }

    // Utility Methods
    broadcastToRoom(roomId, message, excludeUserId = null) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) return;

            for (const [userId, connection] of room.users.entries()) {
                if (excludeUserId && userId === excludeUserId) continue;

                this.sendToUser(connection.ws, message);
            }
        } catch (error) {
            console.error('❌ Error broadcasting to room:', error);
        }
    }

    sendToUser(ws, message) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('❌ Error sending to user:', error);
        }
    }

    sendError(ws, errorMessage) {
        this.sendToUser(ws, {
            type: 'ERROR',
            payload: {
                message: errorMessage
            }
        });
    }

    // Room Management
    createRoom(roomId, settings = {}) {
        if (this.rooms.has(roomId)) {
            throw new Error('Room already exists');
        }

        this.rooms.set(roomId, {
            id: roomId,
            users: new Map(),
            createdAt: new Date(),
            settings: settings
        });

        this.messageHistory.set(roomId, []);

        console.log('🏠 Room created:', roomId);
    }

    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Notify all users in room
        this.broadcastToRoom(roomId, {
            type: 'ROOM_DELETED',
            payload: {
                roomId: roomId
            }
        });

        // Remove room and history
        this.rooms.delete(roomId);
        this.messageHistory.delete(roomId);

        console.log('🏠 Room deleted:', roomId);
    }

    getRoomInfo(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        return {
            id: room.id,
            userCount: room.users.size,
            createdAt: room.createdAt,
            settings: room.settings,
            users: Array.from(room.users.values()).map(u => u.userInfo)
        };
    }

    // User Management
    generateAuthToken(userInfo) {
        return jwt.sign(userInfo, this.jwtSecret, { expiresIn: '24h' });
    }

    validateUserPermissions(userInfo, requiredPermission) {
        // Check if user has required permission
        const userPermissions = userInfo.permissions || [];
        return userPermissions.includes(requiredPermission);
    }

    // Statistics
    getCollaborationStats() {
        return {
            totalUsers: this.connectedUsers.size,
            totalRooms: this.rooms.size,
            rooms: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
                id: roomId,
                userCount: room.users.size,
                createdAt: room.createdAt
            })),
            messageHistorySize: Array.from(this.messageHistory.values()).reduce((total, messages) => total + messages.length, 0)
        };
    }

    // Cleanup
    cleanup() {
        try {
            // Close all connections
            for (const [userId, connection] of this.connectedUsers.entries()) {
                connection.ws.close();
            }

            this.connectedUsers.clear();
            this.rooms.clear();
            this.messageHistory.clear();

            // Close WebSocket server
            if (this.wss) {
                this.wss.close();
            }

            // Close HTTP server
            if (this.server) {
                this.server.close();
            }

            console.log('✅ Collaboration Manager cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

module.exports = CollaborationManager;
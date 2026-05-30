const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class UserManager {
    constructor(options = {}) {
        this.databasePath = options.databasePath || path.join(__dirname, '../../../data/users.db');
        this.jwtSecret = options.jwtSecret || 'your-secret-key';
        this.sessionTimeout = options.sessionTimeout || 3600; // 1 hour
        this.maxLoginAttempts = options.maxLoginAttempts || 5;
        this.lockoutDuration = options.lockoutDuration || 900; // 15 minutes

        // User roles and permissions
        this.roles = {
            SUPER_ADMIN: 'super_admin',
            ADMIN: 'admin',
            PARENT: 'parent',
            CHILD: 'child',
            GUEST: 'guest'
        };

        this.permissions = {
            // Content filtering permissions
            MANAGE_FILTERS: 'manage_filters',
            VIEW_ANALYTICS: 'view_analytics',
            MANAGE_USERS: 'manage_users',
            VIEW_REPORTS: 'view_reports',
            CONFIGURE_SYSTEM: 'configure_system',

            // User management permissions
            CREATE_USERS: 'create_users',
            EDIT_USERS: 'edit_users',
            DELETE_USERS: 'delete_users',
            MANAGE_ROLES: 'manage_roles',

            // Security permissions
            VIEW_SECURITY_LOGS: 'view_security_logs',
            MANAGE_SECURITY: 'manage_security',
            ACCESS_ADVANCED_SETTINGS: 'access_advanced_settings',

            // Reporting permissions
            GENERATE_REPORTS: 'generate_reports',
            EXPORT_DATA: 'export_data',
            VIEW_DETAILED_ANALYTICS: 'view_detailed_analytics'
        };

        // Role-based permissions mapping
        this.rolePermissions = {
            [this.roles.SUPER_ADMIN]: [
                this.permissions.MANAGE_FILTERS,
                this.permissions.VIEW_ANALYTICS,
                this.permissions.MANAGE_USERS,
                this.permissions.VIEW_REPORTS,
                this.permissions.CONFIGURE_SYSTEM,
                this.permissions.CREATE_USERS,
                this.permissions.EDIT_USERS,
                this.permissions.DELETE_USERS,
                this.permissions.MANAGE_ROLES,
                this.permissions.VIEW_SECURITY_LOGS,
                this.permissions.MANAGE_SECURITY,
                this.permissions.ACCESS_ADVANCED_SETTINGS,
                this.permissions.GENERATE_REPORTS,
                this.permissions.EXPORT_DATA,
                this.permissions.VIEW_DETAILED_ANALYTICS
            ],
            [this.roles.ADMIN]: [
                this.permissions.MANAGE_FILTERS,
                this.permissions.VIEW_ANALYTICS,
                this.permissions.MANAGE_USERS,
                this.permissions.VIEW_REPORTS,
                this.permissions.CONFIGURE_SYSTEM,
                this.permissions.CREATE_USERS,
                this.permissions.EDIT_USERS,
                this.permissions.VIEW_SECURITY_LOGS,
                this.permissions.GENERATE_REPORTS,
                this.permissions.EXPORT_DATA,
                this.permissions.VIEW_DETAILED_ANALYTICS
            ],
            [this.roles.PARENT]: [
                this.permissions.VIEW_ANALYTICS,
                this.permissions.VIEW_REPORTS,
                this.permissions.GENERATE_REPORTS,
                this.permissions.VIEW_DETAILED_ANALYTICS
            ],
            [this.roles.CHILD]: [
                this.permissions.VIEW_REPORTS
            ],
            [this.roles.GUEST]: []
        };

        this.initialize();
    }

    async initialize() {
        try {
            console.log('👥 Initializing User Manager...');

            // Initialize database
            await this.initializeDatabase();

            // Create default admin user if not exists
            await this.createDefaultAdmin();

            console.log('✅ User Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize User Manager:', error);
            throw error;
        }
    }

    async initializeDatabase() {
        try {
            const Database = require('better-sqlite3');
            this.db = new Database(this.databasePath);

            // Create users table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'child',
                    first_name TEXT,
                    last_name TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    last_login INTEGER,
                    login_attempts INTEGER DEFAULT 0,
                    locked_until INTEGER
                )
            `);

            // Create user_sessions table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token_hash TEXT UNIQUE NOT NULL,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);

            // Create user_permissions table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS user_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    permission TEXT NOT NULL,
                    granted_by INTEGER,
                    granted_at INTEGER NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);

            console.log('✅ User database initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async createDefaultAdmin() {
        try {
            // Check if admin user exists
            const existingAdmin = this.db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get(this.roles.SUPER_ADMIN);

            if (!existingAdmin) {
                // Create default admin user
                const defaultPassword = 'Admin123!@#';
                const passwordHash = await bcrypt.hash(defaultPassword, 12);

                const stmt = this.db.prepare(`
                    INSERT INTO users (email, password_hash, role, first_name, last_name, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                stmt.run(
                    'admin@contentfilter.com',
                    passwordHash,
                    this.roles.SUPER_ADMIN,
                    'System',
                    'Administrator',
                    Date.now(),
                    Date.now()
                );

                console.log('✅ Default admin user created');
                console.log('📧 Email: admin@contentfilter.com');
                console.log('🔑 Password: Admin123!@#');
            }
        } catch (error) {
            console.error('❌ Error creating default admin:', error);
        }
    }

    // User Authentication
    async authenticateUser(email, password) {
        try {
            // Get user from database
            const stmt = this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
            const user = stmt.get(email);

            if (!user) {
                throw new Error('User not found');
            }

            // Check if account is locked
            if (user.locked_until && user.locked_until > Date.now()) {
                throw new Error('Account temporarily locked due to failed login attempts');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                // Increment failed attempts
                this.incrementLoginAttempts(user.id);

                // Check if should lock account
                if (user.login_attempts >= this.maxLoginAttempts) {
                    this.lockAccount(user.id);
                    throw new Error('Account locked due to too many failed attempts');
                }

                throw new Error('Invalid password');
            }

            // Reset login attempts on successful login
            this.resetLoginAttempts(user.id);

            // Update last login
            this.updateLastLogin(user.id);

            // Generate session token
            const sessionToken = this.generateSessionToken();

            // Create session
            await this.createSession(user.id, sessionToken);

            // Get user permissions
            const permissions = this.getUserPermissions(user.id);

            const userInfo = {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                permissions: permissions,
                sessionToken: sessionToken
            };

            console.log('✅ User authenticated:', user.email);
            return userInfo;

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const { email, password, role, firstName, lastName } = userData;

            // Validate role
            if (!Object.values(this.roles).includes(role)) {
                throw new Error('Invalid role specified');
            }

            // Check if user already exists
            const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Create user
            const stmt = this.db.prepare(`
                INSERT INTO users (email, password_hash, role, first_name, last_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                email,
                passwordHash,
                role,
                firstName,
                lastName,
                Date.now(),
                Date.now()
            );

            // Grant role-based permissions
            await this.grantRolePermissions(result.lastInsertRowid, role);

            console.log('✅ User created:', email);
            return result.lastInsertRowid;

        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const { email, firstName, lastName, role } = userData;

            // Check if new email conflicts with existing user
            if (email) {
                const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
                if (existingUser) {
                    throw new Error('Email already in use');
                }
            }

            // Update user
            const updateFields = [];
            const updateValues = [];

            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            if (firstName) {
                updateFields.push('first_name = ?');
                updateValues.push(firstName);
            }

            if (lastName) {
                updateFields.push('last_name = ?');
                updateValues.push(lastName);
            }

            if (role) {
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            updateFields.push('updated_at = ?');
            updateValues.push(Date.now());

            updateValues.push(userId);

            const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            const stmt = this.db.prepare(query);
            stmt.run(...updateValues);

            // Update permissions if role changed
            if (role) {
                await this.updateUserPermissions(userId, role);
            }

            console.log('✅ User updated:', userId);
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            // Check if user exists
            const user = this.db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Delete user sessions
            this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);

            // Delete user permissions
            this.db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);

            // Delete user
            this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);

            console.log('✅ User deleted:', userId);
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            throw error;
        }
    }

    // Session Management
    generateSessionToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    async createSession(userId, token) {
        try {
            const expiresAt = Date.now() + (this.sessionTimeout * 1000);

            const stmt = this.db.prepare(`
                INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run(userId, this.hashToken(token), expiresAt, Date.now());

            console.log('✅ Session created for user:', userId);
        } catch (error) {
            console.error('❌ Error creating session:', error);
            throw error;
        }
    }

    async validateSession(token) {
        try {
            const tokenHash = this.hashToken(token);

            const stmt = this.db.prepare(`
                SELECT u.* FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.token_hash = ? AND s.expires_at > ? AND s.is_active = 1 AND u.is_active = 1
            `);

            const user = stmt.get(tokenHash, Date.now());

            if (user) {
                console.log('✅ Session validated for user:', user.email);
                return user;
            }

            throw new Error('Invalid or expired session');
        } catch (error) {
            console.error('❌ Session validation failed:', error);
            throw error;
        }
    }

    async invalidateSession(token) {
        try {
            const tokenHash = this.hashToken(token);

            const stmt = this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE token_hash = ?');
            stmt.run(tokenHash);

            console.log('✅ Session invalidated');
        } catch (error) {
            console.error('❌ Error invalidating session:', error);
        }
    }

    // Permission Management
    async grantRolePermissions(userId, role) {
        try {
            // Remove existing permissions
            this.db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);

            // Get role permissions
            const permissions = this.rolePermissions[role] || [];

            // Grant new permissions
            for (const permission of permissions) {
                const stmt = this.db.prepare(`
                    INSERT INTO user_permissions (user_id, permission, granted_by, granted_at)
                    VALUES (?, ?, ?, ?)
                `);

                stmt.run(userId, permission, null, Date.now());
            }

            console.log('✅ Role permissions granted:', role);
        } catch (error) {
            console.error('❌ Error granting role permissions:', error);
        }
    }

    async updateUserPermissions(userId, role) {
        await this.grantRolePermissions(userId, role);
    }

    getUserPermissions(userId) {
        try {
            const stmt = this.db.prepare('SELECT permission FROM user_permissions WHERE user_id = ?');
            const permissions = stmt.all(userId);

            return permissions.map(p => p.permission);
        } catch (error) {
            console.error('❌ Error getting user permissions:', error);
            return [];
        }
    }

    hasPermission(userId, permission) {
        try {
            const stmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM user_permissions
                WHERE user_id = ? AND permission = ?
            `);

            const result = stmt.get(userId, permission);
            return result.count > 0;
        } catch (error) {
            console.error('❌ Error checking permission:', error);
            return false;
        }
    }

    // User Account Management
    incrementLoginAttempts(userId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE users
                SET login_attempts = login_attempts + 1
                WHERE id = ?
            `);
            stmt.run(userId);
        } catch (error) {
            console.error('❌ Error incrementing login attempts:', error);
        }
    }

    resetLoginAttempts(userId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE users
                SET login_attempts = 0, locked_until = NULL
                WHERE id = ?
            `);
            stmt.run(userId);
        } catch (error) {
            console.error('❌ Error resetting login attempts:', error);
        }
    }

    lockAccount(userId) {
        try {
            const lockedUntil = Date.now() + (this.lockoutDuration * 1000);

            const stmt = this.db.prepare(`
                UPDATE users
                SET locked_until = ?
                WHERE id = ?
            `);
            stmt.run(lockedUntil, userId);
        } catch (error) {
            console.error('❌ Error locking account:', error);
        }
    }

    updateLastLogin(userId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE users
                SET last_login = ?
                WHERE id = ?
            `);
            stmt.run(Date.now(), userId);
        } catch (error) {
            console.error('❌ Error updating last login:', error);
        }
    }

    // Utility Methods
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async hashPassword(password) {
        return await bcrypt.hash(password, 12);
    }

    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        return password;
    }

    // User Queries
    getUserById(userId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
            return stmt.get(userId);
        } catch (error) {
            console.error('❌ Error getting user by ID:', error);
            return null;
        }
    }

    getUserByEmail(email) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
            return stmt.get(email);
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            return null;
        }
    }

    getAllUsers() {
        try {
            const stmt = this.db.prepare('SELECT id, email, role, first_name, last_name, is_active, created_at, last_login FROM users ORDER BY created_at DESC');
            return stmt.all();
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return [];
        }
    }

    getUsersByRole(role) {
        try {
            const stmt = this.db.prepare('SELECT id, email, first_name, last_name, is_active, created_at, last_login FROM users WHERE role = ? ORDER BY created_at DESC');
            return stmt.all(role);
        } catch (error) {
            console.error('❌ Error getting users by role:', error);
            return [];
        }
    }

    // Statistics
    getUserStatistics() {
        try {
            const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
            const activeUsers = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get();
            const usersByRole = {};

            for (const role of Object.values(this.roles)) {
                const count = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role);
                usersByRole[role] = count.count;
            }

            return {
                totalUsers: totalUsers.count,
                activeUsers: activeUsers.count,
                usersByRole: usersByRole,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting user statistics:', error);
            return null;
        }
    }

    // Cleanup
    cleanup() {
        try {
            if (this.db) {
                // Clean up expired sessions
                this.db.prepare('DELETE FROM user_sessions WHERE expires_at < ?').run(Date.now());

                // Clean up old security logs
                this.cleanupOldLogs();

                this.db.close();
                console.log('✅ User Manager cleanup completed');
            }
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }

    cleanupOldLogs() {
        try {
            // Keep only last 30 days of logs
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            this.db.prepare('DELETE FROM activity_logs WHERE timestamp < ?').run(thirtyDaysAgo);
        } catch (error) {
            console.error('❌ Error cleaning old logs:', error);
        }
    }
}

module.exports = UserManager;
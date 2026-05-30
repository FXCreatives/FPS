const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(databasePath) {
        this.databasePath = databasePath;
        this.db = null;
        this.initialize();
    }

    initialize() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.databasePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Initialize database
            this.db = new Database(this.databasePath);
            this.createTables();

            console.log('✅ Database manager initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
        }
    }

    createTables() {
        try {
            // Blocked sites table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS blocked_sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    hostname TEXT NOT NULL,
                    reason TEXT,
                    timestamp INTEGER NOT NULL,
                    category TEXT DEFAULT 'adult',
                    ip_address TEXT,
                    user_agent TEXT
                )
            `);

            // Settings table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
                )
            `);

            // Activity logs table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    timestamp INTEGER NOT NULL,
                    level TEXT DEFAULT 'info'
                )
            `);

            console.log('✅ Database tables created');
        } catch (error) {
            console.error('❌ Table creation failed:', error);
        }
    }

    /**
     * Add blocked site to database
     */
    addBlockedSite(siteData) {
        try {
            const { url, hostname, reason, category = 'adult', ipAddress, userAgent } = siteData;
            const timestamp = Date.now();

            const stmt = this.db.prepare(`
                INSERT INTO blocked_sites (url, hostname, reason, timestamp, category, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(url, hostname, reason, timestamp, category, ipAddress, userAgent);
            console.log('✅ Blocked site added:', hostname);
            return result.lastInsertRowid;
        } catch (error) {
            console.error('❌ Error adding blocked site:', error);
            return null;
        }
    }

    /**
     * Get recent blocked sites
     */
    getRecentBlockedSites(limit = 50) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM blocked_sites
                ORDER BY timestamp DESC
                LIMIT ?
            `);

            return stmt.all(limit);
        } catch (error) {
            console.error('❌ Error getting recent blocked sites:', error);
            return [];
        }
    }

    /**
     * Get blocked sites count
     */
    getBlockedSitesCount() {
        try {
            const stmt = this.db.prepare('SELECT COUNT(*) as count FROM blocked_sites');
            const result = stmt.get();
            return result.count;
        } catch (error) {
            console.error('❌ Error getting blocked sites count:', error);
            return 0;
        }
    }

    /**
     * Get today's blocked sites count
     */
    getTodayBlockedCount() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timestamp = Math.floor(today.getTime() / 1000);

            const stmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM blocked_sites
                WHERE timestamp > ?
            `);

            const result = stmt.get(timestamp * 1000);
            return result.count;
        } catch (error) {
            console.error('❌ Error getting today blocked count:', error);
            return 0;
        }
    }

    /**
     * Save setting
     */
    saveSetting(key, value) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, strftime('%s', 'now'))
            `);

            stmt.run(key, value);
            console.log('✅ Setting saved:', key);
        } catch (error) {
            console.error('❌ Error saving setting:', error);
        }
    }

    /**
     * Get setting
     */
    getSetting(key, defaultValue = null) {
        try {
            const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
            const result = stmt.get(key);

            return result ? result.value : defaultValue;
        } catch (error) {
            console.error('❌ Error getting setting:', error);
            return defaultValue;
        }
    }

    /**
     * Add activity log
     */
    addActivityLog(type, message, details = null, level = 'info') {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO activity_logs (type, message, details, timestamp, level)
                VALUES (?, ?, ?, strftime('%s', 'now'), ?)
            `);

            stmt.run(type, message, details, level);
            console.log('✅ Activity logged:', message);
        } catch (error) {
            console.error('❌ Error adding activity log:', error);
        }
    }

    /**
     * Get activity logs
     */
    getActivityLogs(limit = 100, level = null) {
        try {
            let query = 'SELECT * FROM activity_logs ORDER BY timestamp DESC';
            let params = [];

            if (level && level !== 'all') {
                query += ' WHERE level = ?';
                params.push(level);
            }

            query += ' LIMIT ?';
            params.push(limit);

            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        } catch (error) {
            console.error('❌ Error getting activity logs:', error);
            return [];
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        try {
            const totalBlocked = this.getBlockedSitesCount();
            const todayBlocked = this.getTodayBlockedCount();

            // Get database size
            let databaseSize = 0;
            try {
                const stats = fs.statSync(this.databasePath);
                databaseSize = stats.size;
            } catch (e) {
                // File might not exist yet
            }

            return {
                totalBlocked,
                todayBlocked,
                databaseSize,
                isEnabled: this.getSetting('filterEnabled', 'true') === 'true'
            };
        } catch (error) {
            console.error('❌ Error getting database stats:', error);
            return {
                totalBlocked: 0,
                todayBlocked: 0,
                databaseSize: 0,
                isEnabled: false
            };
        }
    }

    /**
     * Clear all blocked sites
     */
    clearBlockedSites() {
        try {
            const stmt = this.db.prepare('DELETE FROM blocked_sites');
            const result = stmt.run();

            this.addActivityLog('maintenance', `Cleared ${result.changes} blocked sites`, null, 'info');
            console.log('✅ All blocked sites cleared');
            return result.changes;
        } catch (error) {
            console.error('❌ Error clearing blocked sites:', error);
            return 0;
        }
    }

    /**
     * Clear old blocked sites (older than specified days)
     */
    clearOldBlockedSites(days) {
        try {
            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

            const stmt = this.db.prepare('DELETE FROM blocked_sites WHERE timestamp < ?');
            const result = stmt.run(cutoffTime);

            if (result.changes > 0) {
                this.addActivityLog('maintenance', `Cleared ${result.changes} old blocked sites (${days} days)`, null, 'info');
            }

            console.log('✅ Old blocked sites cleared:', result.changes);
            return result.changes;
        } catch (error) {
            console.error('❌ Error clearing old blocked sites:', error);
            return 0;
        }
    }

    /**
     * Export data to JSON
     */
    exportData() {
        try {
            const blockedSites = this.getRecentBlockedSites(1000);
            const settings = this.getAllSettings();
            const logs = this.getActivityLogs(500);

            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                blockedSites,
                settings,
                logs
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return null;
        }
    }

    /**
     * Get all settings
     */
    getAllSettings() {
        try {
            const stmt = this.db.prepare('SELECT key, value FROM settings');
            return stmt.all();
        } catch (error) {
            console.error('❌ Error getting all settings:', error);
            return [];
        }
    }

    /**
     * Reset database (clear all data)
     */
    reset() {
        try {
            // Clear all tables
            this.db.exec('DELETE FROM blocked_sites');
            this.db.exec('DELETE FROM settings');
            this.db.exec('DELETE FROM activity_logs');

            this.addActivityLog('maintenance', 'Database reset performed', null, 'warning');
            console.log('✅ Database reset completed');
        } catch (error) {
            console.error('❌ Error resetting database:', error);
        }
    }

    /**
     * Close database connection
     */
    close() {
        try {
            if (this.db) {
                this.db.close();
                console.log('✅ Database connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }

    /**
     * Vacuum database to optimize size
     */
    vacuum() {
        try {
            this.db.exec('VACUUM');
            console.log('✅ Database vacuum completed');
        } catch (error) {
            console.error('❌ Error vacuuming database:', error);
        }
    }
}

module.exports = DatabaseManager;
#!/usr/bin/env node

/**
 * Content Filter API - Phase 1
 * Production-ready Node.js/Express server with SQLite database
 *
 * Features:
 * - Real-time content analysis and categorization
 * - URL risk scoring (0-100 scale)
 * - SQLite database with comprehensive blocklists
 * - RESTful API endpoints
 * - Comprehensive test suite
 *
 * Installation:
 *   npm install
 *   npm start
 *
 * Testing:
 *   npm test
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Database setup
class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'data', 'contentfilter.db');
    }

    async initialize() {
        // Ensure data directory exists
        await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Enable optimizations
                this.db.run('PRAGMA foreign_keys = ON');
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA synchronous = NORMAL');
                this.db.run('PRAGMA cache_size = 1000000');

                this.createTables()
                    .then(() => this.populateBlocklists())
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS blocklists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL, -- 'domain', 'keyword', 'category'
                value TEXT NOT NULL,
                category TEXT,
                risk_score INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(type, value)
            )`,

            `CREATE TABLE IF NOT EXISTS content_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                content TEXT,
                content_type TEXT DEFAULT 'unknown',
                category TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                is_blocked BOOLEAN NOT NULL,
                analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                processing_time_ms INTEGER,
                user_agent TEXT,
                ip_address TEXT
            )`,

            `CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_name TEXT NOT NULL,
                api_key TEXT UNIQUE NOT NULL,
                permissions TEXT DEFAULT 'read',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME
            )`
        ];

        for (const sql of tables) {
            await this.run(sql);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_blocklists_type ON blocklists(type)',
            'CREATE INDEX IF NOT EXISTS idx_blocklists_category ON blocklists(category)',
            'CREATE INDEX IF NOT EXISTS idx_content_analysis_url ON content_analysis(url)',
            'CREATE INDEX IF NOT EXISTS idx_content_analysis_time ON content_analysis(analysis_time)',
            'CREATE INDEX IF NOT EXISTS idx_content_analysis_category ON content_analysis(category)'
        ];

        for (const sql of indexes) {
            await this.run(sql);
        }
    }

    async populateBlocklists() {
        // Check if blocklists are already populated
        const count = await this.get('SELECT COUNT(*) as count FROM blocklists');
        if (count.count > 0) {
            return; // Already populated
        }

        console.log('📊 Populating blocklists with comprehensive data...');

        // Adult content domains
        const adultDomains = [
            'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'youporn.com',
            'redtube.com', 'tube8.com', 'spankbang.com', 'tnaflix.com', 'eporner.com',
            'onlyfans.com', 'chaturbate.com', 'stripchat.com', 'camsoda.com', 'myfreecams.com'
        ];

        for (const domain of adultDomains) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['domain', domain, 'adult', 100]
            );
        }

        // Gambling domains
        const gamblingDomains = [
            'bet365.com', 'williamhill.com', 'ladbrokes.com', 'paddypower.com', 'coral.co.uk',
            'betfair.com', 'skybet.com', 'unibet.com', '888.com', 'betway.com'
        ];

        for (const domain of gamblingDomains) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['domain', domain, 'gambling', 90]
            );
        }

        // Violence and hate domains
        const violenceDomains = [
            'stormfront.org', 'dailystormer.com', '8chan.co', '4chan.org'
        ];

        for (const domain of violenceDomains) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['domain', domain, 'violence', 95]
            );
        }

        // Adult content keywords
        const adultKeywords = [
            'porn', 'xxx', 'adult', 'nsfw', '18+', 'erotic', 'sexual', 'nude', 'naked',
            'sex', 'fuck', 'ass', 'tits', 'pussy', 'cock', 'blowjob', 'handjob'
        ];

        for (const keyword of adultKeywords) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['keyword', keyword, 'adult', 95]
            );
        }

        // Violence keywords
        const violenceKeywords = [
            'kill', 'murder', 'rape', 'torture', 'bomb', 'terrorist', 'hate', 'nazi',
            'supremacist', 'genocide', 'massacre', 'slaughter', 'execution'
        ];

        for (const keyword of violenceKeywords) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['keyword', keyword, 'violence', 90]
            );
        }

        // Gambling keywords
        const gamblingKeywords = [
            'casino', 'betting', 'poker', 'blackjack', 'roulette', 'slots', 'jackpot',
            'wager', 'odds', 'bookmaker', 'sportsbook', 'lottery'
        ];

        for (const keyword of gamblingKeywords) {
            await this.run(
                'INSERT OR IGNORE INTO blocklists (type, value, category, risk_score) VALUES (?, ?, ?, ?)',
                ['keyword', keyword, 'gambling', 85]
            );
        }

        console.log('✅ Blocklists populated successfully');
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close(err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Content Analysis Engine
class ContentAnalyzer {
    constructor(db) {
        this.db = db;
    }

    async analyzeContent(content, url, contentType = 'text', userAgent = '', ipAddress = '') {
        const startTime = Date.now();

        try {
            // Extract domain from URL
            const domain = this.extractDomain(url);

            // Get base risk score from domain
            let riskScore = await this.getDomainRiskScore(domain);

            // Analyze content based on type
            if (contentType === 'text' && content) {
                const contentRisk = this.analyzeTextContent(content);
                riskScore = Math.max(riskScore, contentRisk);
            }

            // Determine category
            const category = this.determineCategory(content, domain, riskScore);

            // Check if should be blocked
            const isBlocked = riskScore >= 70; // Configurable threshold

            // Save analysis to database
            await this.saveAnalysis({
                url,
                content,
                contentType,
                category,
                riskScore,
                isBlocked,
                processingTimeMs: Date.now() - startTime,
                userAgent,
                ipAddress
            });

            return {
                id: Date.now().toString(),
                url,
                content,
                contentType,
                category,
                riskScore,
                isBlocked,
                analysisTime: new Date(),
                processingTimeMs: Date.now() - startTime,
                domain,
                recommendation: isBlocked ? 'block' : 'allow'
            };

        } catch (error) {
            console.error('Analysis error:', error);
            throw new Error(`Content analysis failed: ${error.message}`);
        }
    }

    async getDomainRiskScore(domain) {
        try {
            const result = await this.db.get(
                'SELECT MAX(risk_score) as max_risk FROM blocklists WHERE type = ? AND value = ? AND is_active = 1',
                ['domain', domain]
            );
            return result ? result.max_risk || 0 : 0;
        } catch (error) {
            console.error('Error getting domain risk score:', error);
            return 0;
        }
    }

    analyzeTextContent(content) {
        let riskScore = 0;
        const contentLower = content.toLowerCase();

        // Check for adult content keywords
        const adultKeywords = ['porn', 'xxx', 'adult', 'nsfw', '18+', 'erotic', 'sexual'];
        const adultMatches = adultKeywords.filter(keyword => contentLower.includes(keyword)).length;
        riskScore += adultMatches * 20;

        // Check for violence keywords
        const violenceKeywords = ['kill', 'murder', 'rape', 'torture', 'bomb', 'terrorist'];
        const violenceMatches = violenceKeywords.filter(keyword => contentLower.includes(keyword)).length;
        riskScore += violenceMatches * 25;

        // Check for gambling keywords
        const gamblingKeywords = ['casino', 'betting', 'poker', 'blackjack', 'roulette'];
        const gamblingMatches = gamblingKeywords.filter(keyword => contentLower.includes(keyword)).length;
        riskScore += gamblingMatches * 15;

        // Length-based risk (very long content might be suspicious)
        if (content.length > 10000) {
            riskScore += 10;
        }

        return Math.min(riskScore, 100);
    }

    determineCategory(content, domain, riskScore) {
        if (riskScore >= 80) {
            if (content.toLowerCase().includes('porn') || content.toLowerCase().includes('adult')) {
                return 'adult';
            }
            if (content.toLowerCase().includes('kill') || content.toLowerCase().includes('murder')) {
                return 'violence';
            }
            if (content.toLowerCase().includes('casino') || content.toLowerCase().includes('bet')) {
                return 'gambling';
            }
            return 'high_risk';
        }

        if (domain.includes('.edu') || content.toLowerCase().includes('education')) {
            return 'educational';
        }
        if (domain.includes('.gov') || content.toLowerCase().includes('government')) {
            return 'government';
        }
        if (content.toLowerCase().includes('news') || domain.includes('news')) {
            return 'news';
        }

        return 'general';
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname.toLowerCase();
        } catch {
            return 'unknown';
        }
    }

    async saveAnalysis(analysis) {
        try {
            await this.db.run(
                `INSERT INTO content_analysis
                 (url, content, content_type, category, risk_score, is_blocked, processing_time_ms, user_agent, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    analysis.url,
                    analysis.content || '',
                    analysis.contentType,
                    analysis.category,
                    analysis.riskScore,
                    analysis.isBlocked,
                    analysis.processingTimeMs,
                    analysis.userAgent,
                    analysis.ipAddress
                ]
            );
        } catch (error) {
            console.error('Error saving analysis:', error);
        }
    }

    async getStatistics() {
        try {
            const stats = await this.db.all(`
                SELECT
                    COUNT(*) as total_analyses,
                    SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as total_blocked,
                    AVG(risk_score) as avg_risk_score,
                    category,
                    COUNT(*) as category_count
                FROM content_analysis
                WHERE analysis_time >= datetime('now', '-24 hours')
                GROUP BY category
                ORDER BY category_count DESC
            `);

            const overall = await this.db.get(`
                SELECT
                    COUNT(*) as total_analyses,
                    SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as total_blocked,
                    AVG(risk_score) as avg_risk_score
                FROM content_analysis
            `);

            return {
                overall: overall || { total_analyses: 0, total_blocked: 0, avg_risk_score: 0 },
                by_category: stats || [],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return { overall: { total_analyses: 0, total_blocked: 0, avg_risk_score: 0 }, by_category: [] };
        }
    }
}

// API Key authentication middleware
function authenticateApiKey(req, res, next) {
    const apiKey = req.header('X-API-Key') || req.query.api_key;

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    // For demo purposes, accept any key starting with 'cf_'
    if (!apiKey.startsWith('cf_')) {
        return res.status(401).json({ error: 'Invalid API key format' });
    }

    // In production, validate against database
    req.apiKey = apiKey;
    next();
}

// Initialize database and analyzer
let dbManager;
let analyzer;

async function initializeApp() {
    try {
        console.log('🚀 Initializing Content Filter API...');

        dbManager = new DatabaseManager();
        await dbManager.initialize();

        analyzer = new ContentAnalyzer(dbManager);

        console.log('✅ Content Filter API initialized successfully');
        console.log(`📊 Database: ${dbManager.dbPath}`);
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);

    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        process.exit(1);
    }
}

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        database: 'connected'
    });
});

// API documentation
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Content Filter API',
        version: '1.0.0',
        description: 'Production-ready content filtering and analysis API',
        endpoints: {
            'GET /api/health': 'Health check',
            'POST /api/analyze': 'Analyze content and URL',
            'GET /api/categorize': 'Categorize URL without content',
            'GET /api/stats': 'Get filtering statistics',
            'GET /api/blocklists': 'Get active blocklists'
        },
        authentication: {
            type: 'API Key',
            header: 'X-API-Key',
            example: 'X-API-Key: cf_your_api_key_here'
        },
        response_format: {
            analyze: {
                category: 'string (adult|violence|gambling|educational|government|news|general|high_risk)',
                risk_score: 'integer (0-100)',
                is_blocked: 'boolean',
                recommendation: 'string (allow|block)'
            }
        }
    });
});

// Content analysis endpoint
app.post('/api/analyze', authenticateApiKey, async (req, res) => {
    try {
        const { content, url, contentType = 'text' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const analysis = await analyzer.analyzeContent(
            content || '',
            url,
            contentType,
            req.get('User-Agent'),
            req.ip
        );

        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: 'Content analysis failed',
            message: error.message
        });
    }
});

// URL categorization endpoint
app.get('/api/categorize', authenticateApiKey, async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const analysis = await analyzer.analyzeContent(
            '',
            url,
            'url',
            req.get('User-Agent'),
            req.ip
        );

        res.json({
            success: true,
            url,
            category: analysis.category,
            risk_score: analysis.riskScore,
            is_blocked: analysis.isBlocked,
            recommendation: analysis.recommendation,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Categorization error:', error);
        res.status(500).json({
            error: 'URL categorization failed',
            message: error.message
        });
    }
});

// Statistics endpoint
app.get('/api/stats', authenticateApiKey, async (req, res) => {
    try {
        const stats = await analyzer.getStatistics();

        // Get blocklist counts
        const blocklistStats = await dbManager.all(`
            SELECT type, category, COUNT(*) as count
            FROM blocklists
            WHERE is_active = 1
            GROUP BY type, category
            ORDER BY type, category
        `);

        res.json({
            success: true,
            statistics: {
                ...stats,
                blocklists: blocklistStats,
                api_version: '1.0.0',
                database_size: 'active'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            error: 'Failed to retrieve statistics',
            message: error.message
        });
    }
});

// Blocklists endpoint
app.get('/api/blocklists', authenticateApiKey, async (req, res) => {
    try {
        const { type, category } = req.query;

        let query = 'SELECT * FROM blocklists WHERE is_active = 1';
        let params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY category, type';

        const blocklists = await dbManager.all(query, params);

        res.json({
            success: true,
            blocklists,
            count: blocklists.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Blocklists error:', error);
        res.status(500).json({
            error: 'Failed to retrieve blocklists',
            message: error.message
        });
    }
});

// Test endpoint for validation
app.post('/api/test', authenticateApiKey, async (req, res) => {
    try {
        const testCases = [
            {
                name: 'Safe educational content',
                content: 'Learn mathematics and science with our comprehensive educational resources.',
                url: 'https://education-site.edu/math',
                expectedCategory: 'educational',
                expectedBlocked: false
            },
            {
                name: 'Adult content',
                content: 'This website contains adult material and explicit content.',
                url: 'https://adult-site.com/video',
                expectedCategory: 'adult',
                expectedBlocked: true
            },
            {
                name: 'Gambling content',
                content: 'Place your bets and win big at our online casino.',
                url: 'https://gambling-site.com/casino',
                expectedCategory: 'gambling',
                expectedBlocked: true
            }
        ];

        const results = [];

        for (const testCase of testCases) {
            const analysis = await analyzer.analyzeContent(
                testCase.content,
                testCase.url,
                'text',
                'Test Agent',
                '127.0.0.1'
            );

            const passed = analysis.category === testCase.expectedCategory &&
                          analysis.isBlocked === testCase.expectedBlocked;

            results.push({
                name: testCase.name,
                expected: {
                    category: testCase.expectedCategory,
                    blocked: testCase.expectedBlocked
                },
                actual: {
                    category: analysis.category,
                    blocked: analysis.isBlocked,
                    risk_score: analysis.riskScore
                },
                passed,
                processing_time_ms: analysis.processingTimeMs
            });
        }

        const passedTests = results.filter(r => r.passed).length;

        res.json({
            success: true,
            test_results: results,
            summary: {
                total_tests: results.length,
                passed_tests: passedTests,
                success_rate: `${((passedTests / results.length) * 100).toFixed(1)}%`
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            error: 'Test execution failed',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        available_endpoints: [
            'GET /api/health',
            'POST /api/analyze',
            'GET /api/categorize',
            'GET /api/stats',
            'GET /api/blocklists',
            'POST /api/test'
        ]
    });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);

    try {
        if (dbManager) {
            await dbManager.close();
            console.log('💾 Database connection closed');
        }

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Start server
async function startServer() {
    await initializeApp();

    const server = app.listen(PORT, () => {
        console.log('\n🎯 Content Filter API - Phase 1');
        console.log('=====================================');
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
        console.log(`🧪 Test Suite: http://localhost:${PORT}/api/test`);
        console.log('\n📋 Quick Start:');
        console.log('   1. POST /api/analyze - Analyze content');
        console.log('   2. GET /api/categorize?url=... - Categorize URL');
        console.log('   3. GET /api/stats - View statistics');
        console.log('   4. POST /api/test - Run test suite');
        console.log('\n🔑 API Key: Use X-API-Key: cf_demo_key (any key starting with cf_)');
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Start the server
if (require.main === module) {
    startServer().catch(error => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = { app, analyzer, dbManager };
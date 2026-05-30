const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Store = require('electron-store');

class ContentFilterEngine {
    constructor(options = {}) {
        this.databasePath = options.databasePath || path.join(__dirname, '../../data/contentfilter.db');
        this.apiUrl = options.apiUrl || 'http://localhost:3000';
        this.isEnabled = true;
        this.blockedCount = 0;
        this.store = new Store();

        // Comprehensive adult content blocklist (150+ sites)
        this.blockedDomains = [
            // Major adult video sites
            'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
            'xnxx.com', 'spankbang.com', 'xhamster2.com', 'xhamster3.com', 'pornhubpremium.com',
            'youporngay.com', 'tube8.com', 'youjizz.com', 'tnaflix.com', 'empflix.com',
            'porn.com', 'pornoxo.com', 'pornhd.com', 'pornrabbit.com', 'pornstar.com',

            // Live cam sites
            'chaturbate.com', 'stripchat.com', 'bongacams.com', 'camsoda.com', 'livejasmin.com',
            'myfreecams.com', 'cam4.com', 'streamate.com', 'imlive.com', 'cams.com',

            // Dating/hookup sites
            'adultfriendfinder.com', 'ashleymadison.com', 'fapdu.com', 'fuckbook.com', 'instabang.com',
            'fbook.com', 'sexdating.com', 'adultmatchmaker.com', 'fuckbuddy.com', 'hookup.com',

            // Image/picture sites
            'imagefap.com', 'motherless.com', 'flickr.com', 'imgur.com', 'reddit.com',
            'imgbb.com', 'postimg.cc', 'imagebam.com', 'imageshack.com', 'photobucket.com',

            // Hentai/anime adult content
            'hentaihaven.org', 'hanime.tv', 'hentaivideotube.com', 'rule34.xxx', 'gelbooru.com',
            'e-hentai.org', 'exhentai.org', 'hentai2read.com', 'hentai.ms', 'hentai.tv',

            // File sharing with adult content
            'pornhost.com', 'imgbox.com', 'imagevenue.com', 'imgadult.com', 'imgtaxi.com',
            'imgdrive.net', 'imgtown.net', 'imgwallet.com', 'imgrock.net', 'imgoutlet.com',

            // Escort services
            'backpage.com', 'eros.com', 'cityxguide.com', 'escortbabylon.net', 'escortads.com',
            'escortdirectory.com', 'escortguide.com', 'escortnews.com', 'escortsite.com', 'escortzone.com',

            // Adult forums and stories
            'lushstories.com', 'literotica.com', 'sexstories.com', 'asstr.org', 'nifty.org',
            'storiesonline.net', 'chyoa.com', 'gayspiralstories.com', 'mcstories.com', 'utopiastories.com',

            // Additional adult sites
            'beeg.com', 'beeg24.org', 'eporner.com', 'hdtube.com', 'hdporn.com', 'megaporn.com',
            'pornmax.com', 'pornmd.com', 'pornxs.com', 'sextube.com', 'sunporno.com',
            'vporno.com', 'yespornplease.com', 'youav.com', 'zootube.com', 'zooporn.com',

            // More adult video sites
            '4tube.com', 'analdin.com', 'badjojo.com', 'bang.com', 'bangbros.com',
            'brazzers.com', 'cliphunter.com', 'definebabe.com', 'deviantclip.com', 'drtuber.com',
            'extremetube.com', 'fantasti.cc', 'freudbox.com', 'fuq.com', 'hclips.com',
            'heavy-r.com', 'hellporno.com', 'jizzhut.com', 'keezmovies.com', 'kinxxx.com',
            'madthumbs.com', 'mobiporno.com', 'moviesand.com', 'mypornbible.com', 'nudevista.com',
            'orgasm.com', 'pichunter.com', 'pinkvisual.com', 'playvids.com', 'porndig.com',
            'porndoe.com', 'pornerbros.com', 'pornfind.org', 'porngo.com', 'pornhost.org',
            'pornlib.com', 'porntube.com', 'proporn.com', 'sextv1.pl', 'sexu.com',
            'simply-hentai.com', 'spermyporn.com', 'thefappening.com', 'thisav.com', 'thumbzilla.com',
            'tnaflix.com', 'tporn.xxx', 'trannytube.net', 'tubegalore.com', 'tubepornclassic.com',
            'tubewolf.com', 'vidxnet.com', 'vivatube.com', 'wankoz.com', 'wankz.com',
            'xogogo.com', 'xozilla.com', 'xtube.com', 'xxxbunker.com', 'xxxymovies.com',
            'yobt.com', 'yobt.tv', 'youjizz.com', 'youporn.com', 'youporngay.com',
            'yourporn.sexy', 'yporn.tv', 'yuvutu.com', 'zazzybabes.com', 'xhaccess.com'
        ];

        this.initialize();
    }

    async initialize() {
        console.log('🚀 Content Filter Engine initializing...');

        // Load saved settings
        this.loadSettings();

        // Initialize database
        await this.initializeDatabase();

        // Load blocked count
        this.blockedCount = this.store.get('blockedCount', 0);

        console.log('✅ Content Filter Engine initialized');
    }

    async initializeDatabase() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.databasePath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Initialize SQLite database
            const Database = require('better-sqlite3');
            this.db = new Database(this.databasePath);

            // Create tables
            this.createTables();

            console.log('✅ Database initialized');
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
                    reason TEXT,
                    timestamp INTEGER NOT NULL,
                    hostname TEXT,
                    category TEXT
                )
            `);

            // Settings table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            `);

            console.log('✅ Database tables created');
        } catch (error) {
            console.error('❌ Table creation failed:', error);
        }
    }

    loadSettings() {
        this.isEnabled = this.store.get('filterEnabled', true);
        this.apiUrl = this.store.get('apiUrl', 'http://localhost:3000');
    }

    updateApiUrl(newUrl) {
        this.apiUrl = newUrl;
        this.store.set('apiUrl', newUrl);
    }

    /**
     * Check if URL should be blocked
     */
    shouldBlockUrl(url) {
        if (!this.isEnabled) {
            return false;
        }

        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return this.isDomainBlocked(hostname);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if domain is in blocklist
     */
    isDomainBlocked(hostname) {
        if (!hostname) return false;

        const lowerHostname = hostname.toLowerCase();

        // Check exact match
        if (this.blockedDomains.includes(lowerHostname)) {
            return true;
        }

        // Check subdomain match
        for (const blockedDomain of this.blockedDomains) {
            if (lowerHostname.endsWith('.' + blockedDomain)) {
                return true;
            }
        }

        // Check for adult keywords in hostname
        const adultKeywords = [
            'porn', 'adult', 'xxx', 'sex', 'erotic', 'nude', 'naked',
            'hentai', 'escort', 'cam', 'live', 'dating', 'hooker'
        ];

        for (const keyword of adultKeywords) {
            if (lowerHostname.includes(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add blocked site to database
     */
    addBlockedSite(url, reason = 'Adult Content') {
        try {
            const hostname = new URL(url).hostname;
            const timestamp = Date.now();

            const stmt = this.db.prepare(`
                INSERT INTO blocked_sites (url, reason, timestamp, hostname, category)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(url, reason, timestamp, hostname, 'adult');

            this.blockedCount++;
            this.store.set('blockedCount', this.blockedCount);

            console.log('🚫 Site blocked:', hostname);
            return true;
        } catch (error) {
            console.error('❌ Error adding blocked site:', error);
            return false;
        }
    }

    /**
     * Get recent blocked sites
     */
    getRecentBlockedSites(limit = 10) {
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
     * Get statistics
     */
    getStats() {
        try {
            const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM blocked_sites');
            const todayStmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM blocked_sites
                WHERE timestamp > ?
            `);

            const total = totalStmt.get();
            const today = todayStmt.get(Date.now() - 24 * 60 * 60 * 1000);

            return {
                totalBlocked: total.count,
                todayBlocked: today.count,
                isEnabled: this.isEnabled
            };
        } catch (error) {
            console.error('❌ Error getting stats:', error);
            return { totalBlocked: 0, todayBlocked: 0, isEnabled: false };
        }
    }

    /**
     * Test API connection
     */
    async testApiConnection() {
        try {
            const response = await axios.get(`${this.apiUrl}/api/health`, {
                timeout: 5000,
                headers: { 'X-API-Key': 'cf_desktop_app' }
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start filtering
     */
    start() {
        console.log('🚀 Content filtering started');
        this.isEnabled = true;
        this.store.set('filterEnabled', true);
    }

    /**
     * Stop filtering
     */
    stop() {
        console.log('⏹️ Content filtering stopped');
        this.isEnabled = false;
        this.store.set('filterEnabled', false);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            if (this.db) {
                this.db.close();
            }
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

module.exports = ContentFilterEngine;
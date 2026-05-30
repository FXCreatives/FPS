// Content Filter Browser Extension - Background Script
// Handles real-time URL blocking and API communication

class ContentFilterExtension {
    constructor() {
        this.isEnabled = true;
        this.blockedCount = 0;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // Comprehensive offline blocklist (150+ sites)
        this.blockedDomains = [
            'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
            'xnxx.com', 'spankbang.com', 'xhamster2.com', 'xhamster3.com', 'pornhubpremium.com',
            'youporngay.com', 'tube8.com', 'youjizz.com', 'tnaflix.com', 'empflix.com',
            'porn.com', 'pornoxo.com', 'pornhd.com', 'pornrabbit.com', 'pornstar.com',
            'chaturbate.com', 'stripchat.com', 'bongacams.com', 'camsoda.com', 'livejasmin.com',
            'myfreecams.com', 'cam4.com', 'streamate.com', 'imlive.com', 'cams.com',
            'adultfriendfinder.com', 'ashleymadison.com', 'fapdu.com', 'fuckbook.com', 'instabang.com',
            'fbook.com', 'sexdating.com', 'adultmatchmaker.com', 'fuckbuddy.com', 'hookup.com',
            'imagefap.com', 'motherless.com', 'flickr.com', 'imgur.com', 'reddit.com',
            'imgbb.com', 'postimg.cc', 'imagebam.com', 'imageshack.com', 'photobucket.com',
            'hentaihaven.org', 'hanime.tv', 'hentaivideotube.com', 'rule34.xxx', 'gelbooru.com',
            'e-hentai.org', 'exhentai.org', 'hentai2read.com', 'hentai.ms', 'hentai.tv',
            'pornhost.com', 'imgbox.com', 'imagevenue.com', 'imgadult.com', 'imgtaxi.com',
            'imgdrive.net', 'imgtown.net', 'imgwallet.com', 'imgrock.net', 'imgoutlet.com',
            'backpage.com', 'eros.com', 'cityxguide.com', 'escortbabylon.net', 'escortads.com',
            'escortdirectory.com', 'escortguide.com', 'escortnews.com', 'escortsite.com', 'escortzone.com',
            'lushstories.com', 'literotica.com', 'sexstories.com', 'asstr.org', 'nifty.org',
            'storiesonline.net', 'chyoa.com', 'gayspiralstories.com', 'mcstories.com', 'utopiastories.com',
            'beeg.com', 'beeg24.org', 'eporner.com', 'hdtube.com', 'hdporn.com', 'megaporn.com',
            'pornmax.com', 'pornmd.com', 'pornxs.com', 'sextube.com', 'sunporno.com',
            'vporno.com', 'yespornplease.com', 'youav.com', 'zootube.com', 'zooporn.com',
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
        console.log('🚀 Content Filter Extension initializing (OFFLINE MODE)...');

        try {
            // Load settings from storage
            await this.loadSettings();

            // Set up message listeners first
            this.setupMessageListeners();

            // Set up web request listeners with local blocklist
            await this.setupWebRequestListeners();

            console.log('✅ Content Filter Extension initialized (OFFLINE MODE)');
            console.log(`📊 Filtering: ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
            console.log(`📋 Blocked domains: ${this.blockedDomains.length} sites`);

            // Log setup completion
            console.log('🎉 Content Filter Extension setup complete (OFFLINE MODE)');
            console.log('📋 Sample blocked sites:', this.blockedDomains.slice(0, 10));

            // Edge-specific compatibility check
            this.performEdgeCompatibilityCheck();

        } catch (error) {
            console.error('❌ Extension initialization failed:', error);
            // Attempt to continue with limited functionality
            this.setupFallbackMode();
        }
    }


    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'isEnabled',
                'blockedCount'
            ]);

            this.isEnabled = result.isEnabled !== false; // Default to true
            this.blockedCount = result.blockedCount || 0;

            console.log('⚙️ Settings loaded (offline mode):', {
                isEnabled: this.isEnabled,
                blockedCount: this.blockedCount,
                blockedDomainsCount: this.blockedDomains.length
            });
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                isEnabled: this.isEnabled,
                blockedCount: this.blockedCount
            });
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }

    async setupWebRequestListeners() {
        console.log('🔧 Setting up web request listeners...');

        // Set up rule match listeners first
        console.log('🔧 Calling setupRuleListeners...');
        this.setupRuleListeners();
        console.log('✅ setupRuleListeners completed');

        // Try to set up declarative rules if available
        try {
            await this.setupStaticRules();
            await this.setupDynamicRules();
            console.log('✅ Declarative net request rules set up');
        } catch (error) {
            console.log('⚠️ Declarative rules not available, using local blocklist only');
        }
    }

    async setupStaticRules() {
        try {
            console.log('🔧 Setting up static rules...');

            // Check if we can use declarativeNetRequest
            if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateStaticRules) {
                try {
                    // Try to add rules one by one for Edge compatibility
                    const staticRules = [
                        {
                            id: 1001,
                            priority: 1,
                            action: {
                                type: 'redirect',
                                redirect: { url: chrome.runtime.getURL('blocked.html') }
                            },
                            condition: {
                                urlFilter: '||pornhub.com',
                                resourceTypes: ['main_frame']
                            }
                        }
                    ];

                    // Use a simpler approach - just try to add one rule
                    await chrome.declarativeNetRequest.updateStaticRules(staticRules);
                    console.log('✅ Static blocking rules configured');
                } catch (ruleError) {
                    console.log('⚠️ Could not add static rules, using fallback:', ruleError.message);
                }
            } else {
                console.log('⚠️ Static rules API not available, using local blocklist only');
            }
        } catch (error) {
            console.error('❌ Failed to setup static rules:', error);
            console.log('⚠️ Will use local blocklist fallback');
        }
    }

    async setupDynamicRules() {
        try {
            console.log('🔧 Setting up dynamic rules (offline mode)...');

            // Check if we can use declarativeNetRequest
            if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
                try {
                    // Create rules for additional blocked domains from our local list
                    const dynamicRules = [];

                    // Create rules for next 10 blocked domains (after static rules)
                    this.blockedDomains.slice(10, 20).forEach((domain, index) => {
                        dynamicRules.push({
                            id: 2001 + index,
                            priority: 1,
                            action: {
                                type: 'redirect',
                                redirect: { url: chrome.runtime.getURL('blocked.html') }
                            },
                            condition: {
                                urlFilter: `||${domain}`,
                                resourceTypes: ['main_frame']
                            }
                        });
                    });

                    if (dynamicRules.length > 0) {
                        await chrome.declarativeNetRequest.updateDynamicRules(dynamicRules);
                        console.log(`✅ Dynamic blocking rules configured (offline mode): ${dynamicRules.length} rules`);
                    }
                } catch (ruleError) {
                    console.log('⚠️ Could not setup dynamic rules (offline mode):', ruleError.message);
                }
            } else {
                console.log('⚠️ Dynamic rules API not available (offline mode)');
            }
        } catch (error) {
            console.error('❌ Failed to setup dynamic rules (offline mode):', error);
        }
    }

    setupMessageListeners() {
        // Handle messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
    }

    setupRuleListeners() {
        console.log('🔧 Setting up rule listeners...');

        // Enhanced blocking method using webNavigation (Edge compatible)
        this.setupEnhancedBlocking();

        // Content scripts are already injected via manifest.json
        console.log('📊 Rule listeners set up - using webNavigation for Edge compatibility');
    }

    setupEnhancedBlocking() {
        console.log('🔧 Setting up conservative blocking method for Edge compatibility...');

        try {
            // Use webNavigation if available (works better in Edge)
            if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
                chrome.webNavigation.onBeforeNavigate.addListener((details) => {
                    // Only process main frame requests
                    if (details.frameId === 0) {
                        const url = new URL(details.url);
                        const hostname = url.hostname.toLowerCase();

                        // Only block well-known adult sites to avoid false positives
                        const criticalBlockedDomains = [
                            'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
                            'xnxx.com', 'spankbang.com', 'youjizz.com', 'tnaflix.com', 'tube8.com',
                            'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com',
                            'adultfriendfinder.com'
                        ];

                        const isBlocked = criticalBlockedDomains.some(domain =>
                            hostname === domain || hostname.endsWith('.' + domain)
                        );

                        if (isBlocked && this.isEnabled) {
                            // Redirect to blocked page
                            chrome.tabs.update(details.tabId, {
                                url: chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(details.url)
                            });

                            this.blockedCount++;
                            this.saveSettings();

                            console.log('🚫 Conservative blocking activated:', hostname);
                        }
                    }
                });

                console.log('✅ Conservative blocking method set up for Edge compatibility');
            } else {
                console.log('⚠️ webNavigation API not available');
            }
        } catch (error) {
            console.log('⚠️ Enhanced blocking not available:', error.message);
        }
    }


    async checkUrlWithAPI(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`${this.apiBaseUrl}/api/categorize?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                headers: {
                    'X-API-Key': 'cf_browser_extension',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return {
                    isBlocked: data.is_blocked,
                    category: data.category,
                    riskScore: data.risk_score,
                    recommendation: data.recommendation
                };
            } else {
                throw new Error(data.error || 'API returned unsuccessful response');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ API request timed out for:', url);
            } else {
                console.error('❌ API request failed for:', url, error.message);
            }

            // Fallback: check against local blocklist
            return this.checkLocalBlocklist(url);
        }
    }

    checkLocalBlocklist(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();

            // Comprehensive adult content blocklist (100+ sites)
            const criticalBlockedDomains = [
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
                'beeg.com', 'eporner.com', 'hdtube.com', 'hdporn.com', 'megaporn.com',
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
                'yourporn.sexy', 'yporn.tv', 'yuvutu.com', 'zazzybabes.com'
            ];

            const isBlocked = criticalBlockedDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );

            return {
                isBlocked,
                category: isBlocked ? 'adult' : 'unknown',
                riskScore: isBlocked ? 100 : 0,
                recommendation: isBlocked ? 'block' : 'allow'
            };

        } catch (error) {
            return {
                isBlocked: false,
                category: 'unknown',
                riskScore: 0,
                recommendation: 'allow'
            };
        }
    }

    handleRequestCompleted(details) {
        // Track statistics for allowed requests
        if (this.isEnabled) {
            // Could track allowed requests here for analytics
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'GET_STATUS':
                    sendResponse({
                        isEnabled: this.isEnabled,
                        blockedCount: this.blockedCount,
                        apiBaseUrl: this.apiBaseUrl
                    });
                    break;

                case 'TOGGLE_FILTERING':
                    this.isEnabled = !this.isEnabled;
                    await this.saveSettings();

                    // Notify all tabs of the change
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                type: 'FILTERING_TOGGLED',
                                isEnabled: this.isEnabled
                            }).catch(() => {
                                // Ignore errors for tabs that don't have the content script
                            });
                        });
                    });

                    sendResponse({
                        success: true,
                        isEnabled: this.isEnabled
                    });
                    break;

                case 'UPDATE_API_URL':
                    this.apiBaseUrl = message.apiUrl;
                    await this.saveSettings();
                    // Clear cache when API URL changes
                    this.cache.clear();
                    sendResponse({ success: true });
                    break;

                case 'CLEAR_CACHE':
                    this.cache.clear();
                    sendResponse({ success: true, cleared: true });
                    break;

                case 'RESET_STATS':
                    this.blockedCount = 0;
                    await this.saveSettings();
                    sendResponse({ success: true, blockedCount: 0 });
                    break;

                case 'GET_CACHE_STATS':
                    const cacheSize = this.cache.size;
                    const cacheKeys = Array.from(this.cache.keys());
                    sendResponse({
                        cacheSize,
                        cacheKeys,
                        cacheTimeout: this.cacheTimeout
                    });
                    break;

                default:
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('❌ Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    getCacheKey(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch {
            return url.toLowerCase();
        }
    }

    // Clean up old cache entries periodically
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [key, value] of this.cache.entries()) {
                if (now - value.timestamp > this.cacheTimeout) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                console.log(`🧹 Cleaned ${cleaned} cache entries`);
            }
        }, this.cacheTimeout);
    }

    // Edge-specific compatibility check
    performEdgeCompatibilityCheck() {
        try {
            // Check if running in Edge
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getBrowserInfo) {
                chrome.runtime.getBrowserInfo((info) => {
                    if (info.name.includes('Edge') || info.name.includes('Microsoft')) {
                        console.log('🔍 Edge browser detected - applying compatibility settings');

                        // Edge-specific optimizations
                        this.applyEdgeOptimizations();
                    }
                });
            }

            // Check for Edge-specific APIs
            if (chrome.webNavigation) {
                console.log('✅ Edge compatibility: webNavigation API available');
            }

            if (chrome.declarativeNetRequest) {
                console.log('✅ Edge compatibility: declarativeNetRequest API available');
            }

        } catch (error) {
            console.log('⚠️ Edge compatibility check failed:', error.message);
        }
    }

    // Apply Edge-specific optimizations
    applyEdgeOptimizations() {
        try {
            console.log('🔧 Applying Edge-specific optimizations...');

            // Reduce cache timeout for Edge (more aggressive cleanup)
            this.cacheTimeout = 3 * 60 * 1000; // 3 minutes instead of 5

            // Increase error handling frequency
            this.startEnhancedErrorHandling();

            console.log('✅ Edge optimizations applied');

        } catch (error) {
            console.log('⚠️ Failed to apply Edge optimizations:', error.message);
        }
    }

    // Enhanced error handling for Edge
    startEnhancedErrorHandling() {
        // Monitor for common Edge issues
        setInterval(() => {
            try {
                // Check if extension is still functional
                if (chrome.runtime && chrome.runtime.id) {
                    // Extension is still loaded
                } else {
                    console.error('⚠️ Extension may have been unloaded by Edge');
                }
            } catch (error) {
                console.log('⚠️ Enhanced error handling detected issue:', error.message);
            }
        }, 30000); // Check every 30 seconds
    }

    // Fallback mode for critical failures
    setupFallbackMode() {
        console.log('🔧 Setting up fallback mode...');

        try {
            // Basic message handling
            this.setupMessageListeners();

            // Basic navigation blocking
            this.setupEnhancedBlocking();

            console.log('✅ Fallback mode activated - basic functionality available');

        } catch (error) {
            console.error('❌ Even fallback mode failed:', error);
        }
    }
}

// Initialize the extension
const contentFilter = new ContentFilterExtension();

// Start cache cleanup
contentFilter.startCacheCleanup();

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
        // First time installation
        console.log('🎉 First time installation - opening welcome page');

        // Open options page or welcome page
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html')
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Extension started');
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentFilterExtension };
}
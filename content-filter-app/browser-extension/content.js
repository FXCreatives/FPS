// Content Filter Extension - Content Script
// Handles communication between web pages and the extension

class ContentScriptManager {
    constructor() {
        this.isEnabled = true;
        this.originalUrl = window.location.href;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('📄 Content script initializing for:', this.originalUrl);

            // Add safety check - only run on HTTP/HTTPS pages
            if (!this.originalUrl.startsWith('http://') && !this.originalUrl.startsWith('https://')) {
                console.log('📄 Skipping non-HTTP page:', this.originalUrl);
                return;
            }

            // Check if extension is enabled first
            await this.requestFilteringStatus();

            // Only do instant blocking if enabled
            if (this.isEnabled) {
                this.instantBlockCheck();
            }

            // Listen for messages from background script
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
            });

            // Start monitoring search results for adult keywords (only on search engines)
            this.startSearchResultMonitoring();

            console.log('✅ Content script initialized');
        } catch (error) {
            console.log('⚠️ Content script initialization error:', error.message);
            // Fail gracefully - don't break the page
        }
    }

    instantBlockCheck() {
        try {
            const hostname = window.location.hostname.toLowerCase();

            // ONLY block the most well-known, major adult content sites
            // Reduced to top 15 most problematic sites to avoid false positives
            const criticalAdultDomains = [
                'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
                'xnxx.com', 'spankbang.com', 'youjizz.com', 'tnaflix.com', 'tube8.com',
                'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com',
                'adultfriendfinder.com'
            ];

            const isBlocked = criticalAdultDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );

            // Only block if it's a definite adult site match - NO pattern matching
            if (isBlocked) {
                console.log('🚫 CRITICAL BLOCK: Blocking major adult site', hostname);

                // Simple, clean redirect - no content replacement
                const blockedUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(this.originalUrl);
                window.location.href = blockedUrl;
            }
            // If not a critical adult site, DO NOTHING - let normal sites work
        } catch (error) {
            // Fail silently - never interfere with normal browsing
            console.log('⚠️ Block check failed silently:', error.message);
        }
    }

    async requestFilteringStatus() {
        try {
            const response = await this.sendMessage({
                type: 'GET_STATUS'
            });

            if (response) {
                this.isEnabled = response.isEnabled;
                console.log('📊 Filtering status:', this.isEnabled ? 'ENABLED' : 'DISABLED');
            }
        } catch (error) {
            console.error('❌ Failed to get filtering status:', error);
        }
    }

    handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'FILTERING_TOGGLED':
                    this.isEnabled = message.isEnabled;
                    console.log('🔄 Filtering toggled:', this.isEnabled ? 'ENABLED' : 'DISABLED');
                    break;
                default:
                    console.log('📨 Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error handling message:', error);
        }
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            try {
                // Add timeout for Edge compatibility
                const timeout = setTimeout(() => {
                    reject(new Error('Message timeout - possible Edge compatibility issue'));
                }, 5000);

                chrome.runtime.sendMessage(message, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    startSearchResultMonitoring() {
        // Only monitor search results if we're on a search engine
        const isSearchEngine = window.location.hostname.includes('google.com') ||
                              window.location.hostname.includes('bing.com') ||
                              window.location.hostname.includes('duckduckgo.com') ||
                              window.location.hostname.includes('yahoo.com');

        if (!isSearchEngine) {
            return; // Don't monitor non-search sites
        }

        console.log('🔍 Starting search result monitoring...');

        try {
            // Monitor search results - but only on actual search pages
            if (window.location.pathname.includes('search') || window.location.search.includes('q=')) {
                this.monitorSearchResults();

                // Monitor for new search results being added
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            this.monitorSearchResults();
                        }
                    });
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        } catch (error) {
            console.log('⚠️ Search monitoring error:', error.message);
        }
    }

    monitorSearchResults() {
        try {
            // Only block search results with obvious adult site names
            const obviousAdultKeywords = [
                'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
                'xnxx.com', 'spankbang.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com'
            ];

            // Find links in search results (be more specific with selectors)
            const searchLinks = document.querySelectorAll('h3 a, .rc a, .b_algo a, cite a');

            searchLinks.forEach((link) => {
                const href = link.href.toLowerCase();

                // Check if link is obviously an adult site
                const hasAdultSite = obviousAdultKeywords.some(keyword =>
                    href.includes(keyword)
                );

                if (hasAdultSite && this.isEnabled) {
                    console.log('🚫 Blocking search result:', href);
                    this.blockSearchResult(link);
                }
            });

        } catch (error) {
            console.log('⚠️ Search result monitoring error:', error.message);
        }
    }

    blockSearchResult(element) {
        try {
            if (!element || !element.parentNode) return;

            // Create blocked overlay for search results
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                display: inline-block;
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid red;
                color: red;
                font-size: 11px;
                text-align: center;
                padding: 2px 4px;
                border-radius: 3px;
                font-weight: bold;
            `;
            overlay.textContent = '🚫 ADULT CONTENT';

            // Replace the link text
            element.textContent = '🚫 BLOCKED - Adult Content';
            element.style.color = 'red';
            element.style.textDecoration = 'line-through';

            // Prevent clicking
            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 Blocked adult search result click');
                return false;
            });

            console.log('✅ Search result blocked');
        } catch (error) {
            console.log('⚠️ Could not block search result:', error.message);
        }
    }
}

// Initialize content script
const contentScript = new ContentScriptManager();

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentScriptManager };
}
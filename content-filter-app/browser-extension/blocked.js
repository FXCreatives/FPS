// Content Filter Extension - Blocked Page Script
// Handles blocked page functionality and user interactions

class BlockedPageManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('🚫 Blocked page initializing...');

            // Get blocked page information
            const info = this.getBlockedInfo();
            this.updateDetails(info);

            // Set up event listeners
            this.setupEventListeners();

            console.log('✅ Blocked page initialized:', info);
        } catch (error) {
            console.error('❌ Failed to initialize blocked page:', error);
        }
    }

    getBlockedInfo() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const category = urlParams.get('category') || 'adult';
            const riskScore = urlParams.get('risk') || '100';
            const originalUrl = urlParams.get('url') || window.location.href;

            // Extract hostname from URL
            let hostname = 'unknown';
            try {
                hostname = new URL(originalUrl).hostname;
            } catch (e) {
                hostname = originalUrl;
            }

            return {
                category,
                riskScore: parseInt(riskScore),
                originalUrl: hostname,
                timestamp: new Date().toLocaleString()
            };
        } catch (error) {
            console.error('Error getting blocked info:', error);
            return {
                category: 'unknown',
                riskScore: 0,
                originalUrl: 'unknown',
                timestamp: new Date().toLocaleString()
            };
        }
    }

    updateDetails(info) {
        try {
            // Update category
            const categoryEl = document.getElementById('category');
            if (categoryEl) {
                categoryEl.textContent = info.category.charAt(0).toUpperCase() + info.category.slice(1);
            }

            // Update risk score
            const riskEl = document.getElementById('riskScore');
            if (riskEl) {
                riskEl.textContent = `${info.riskScore}/100`;

                // Color code risk level
                if (info.riskScore >= 80) {
                    riskEl.className = 'detail-value risk-high';
                } else if (info.riskScore >= 50) {
                    riskEl.className = 'detail-value risk-medium';
                } else {
                    riskEl.className = 'detail-value risk-low';
                }
            }

            // Update timestamp
            const timestampEl = document.getElementById('timestamp');
            if (timestampEl) {
                timestampEl.textContent = info.timestamp;
            }

            console.log('✅ Blocked page details updated');
        } catch (error) {
            console.error('❌ Failed to update details:', error);
        }
    }

    setupEventListeners() {
        try {
            // Go back button
            const goBackBtn = document.getElementById('goBackBtn');
            if (goBackBtn) {
                goBackBtn.addEventListener('click', () => this.goBack());
            }

            // Open options button
            const openOptionsBtn = document.getElementById('openOptionsBtn');
            if (openOptionsBtn) {
                openOptionsBtn.addEventListener('click', () => this.openOptions());
            }

            console.log('✅ Event listeners set up');
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
        }
    }

    goBack() {
        try {
            console.log('⬅️ Go back button clicked');

            // Try to go back in history
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // If no history, go to a safe page
                window.location.href = 'https://www.google.com';
            }
        } catch (error) {
            console.log('Could not go back:', error.message);
            // Fallback to safe page
            window.location.href = 'https://www.google.com';
        }
    }

    openOptions() {
        try {
            console.log('⚙️ Open options button clicked');

            // Use the proper Chrome extension API to open options page
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                // Fallback for browsers that don't support openOptionsPage
                alert('To access extension settings:\n\n1. Go to chrome://extensions/\n2. Find "Content Filtering Extension"\n3. Click "Details"\n4. Click "Extension options"');
            }
        } catch (error) {
            console.log('Could not open options:', error.message);
            alert('Please navigate to chrome://extensions/ and configure the Content Filtering Extension manually.');
        }
    }
}

// Initialize blocked page when DOM is ready
const blockedPageManager = new BlockedPageManager();

// Handle browser back button
window.addEventListener('popstate', () => {
    try {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'https://www.google.com';
        }
    } catch (error) {
        console.log('Popstate handler error:', error.message);
    }
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlockedPageManager };
}
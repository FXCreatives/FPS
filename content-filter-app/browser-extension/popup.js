// Content Filter Extension - Popup Script
// Handles user interface interactions and communication with background script

class PopupManager {
    constructor() {
        this.isEnabled = true;
        this.blockedCount = 0;
        this.cacheSize = 0;
        this.apiBaseUrl = 'http://localhost:3000';

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
            // Get elements
            this.loadingEl = document.getElementById('loading');
            this.mainContentEl = document.getElementById('main-content');
            this.errorEl = document.getElementById('error');

            this.statusDotEl = document.getElementById('statusDot');
            this.statusTextEl = document.getElementById('statusText');
            this.apiStatusEl = document.getElementById('apiStatus');
            this.blockedCountEl = document.getElementById('blockedCount');
            this.cacheSizeEl = document.getElementById('cacheSize');
            this.apiUrlEl = document.getElementById('apiUrl');

            // Get buttons
            this.toggleBtn = document.getElementById('toggleBtn');
            this.clearCacheBtn = document.getElementById('clearCacheBtn');
            this.resetStatsBtn = document.getElementById('resetStatsBtn');
            this.optionsLink = document.getElementById('optionsLink');

            // Load current status
            await this.loadStatus();

            // Set up event listeners
            this.setupEventListeners();

            // Hide loading, show content
            this.loadingEl.style.display = 'none';
            this.mainContentEl.style.display = 'block';

        } catch (error) {
            this.showError(`Initialization failed: ${error.message}`);
        }
    }

    async loadStatus() {
        try {
            const response = await this.sendMessage({
                type: 'GET_STATUS'
            });

            if (response) {
                this.isEnabled = response.isEnabled;
                this.blockedCount = response.blockedCount;
                this.apiBaseUrl = response.apiBaseUrl;

                this.updateUI();
                await this.checkApiConnection();
            } else {
                throw new Error('No response from background script');
            }
        } catch (error) {
            console.error('Failed to load status:', error);
            this.showError('Failed to connect to extension');
        }
    }

    updateUI() {
        // Update status indicator
        this.statusDotEl.className = this.isEnabled ? 'status-dot' : 'status-dot disabled';
        this.statusTextEl.textContent = this.isEnabled ? 'Enabled' : 'Disabled';

        // Update toggle button
        this.toggleBtn.innerHTML = this.isEnabled
            ? '🔄 Disable Filtering'
            : '✅ Enable Filtering';
        this.toggleBtn.className = this.isEnabled
            ? 'btn btn-primary'
            : 'btn btn-secondary';

        // Update statistics
        this.blockedCountEl.textContent = this.blockedCount.toLocaleString();
        this.apiUrlEl.textContent = new URL(this.apiBaseUrl).host;
    }

    async checkApiConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`${this.apiBaseUrl}/api/health`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.apiStatusEl.textContent = `API: Connected (${data.version})`;
                this.apiStatusEl.style.color = '#4ade80';
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.apiStatusEl.textContent = 'API: Timeout';
            } else {
                this.apiStatusEl.textContent = 'API: Disconnected';
            }
            this.apiStatusEl.style.color = '#f87171';
        }
    }

    setupEventListeners() {
        // Toggle filtering button
        this.toggleBtn.addEventListener('click', async () => {
            await this.toggleFiltering();
        });

        // Clear cache button
        this.clearCacheBtn.addEventListener('click', async () => {
            await this.clearCache();
        });

        // Reset statistics button
        this.resetStatsBtn.addEventListener('click', async () => {
            await this.resetStatistics();
        });

        // Options link
        this.optionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openOptionsPage();
        });

        // Refresh data periodically
        setInterval(async () => {
            await this.loadStatus();
        }, 5000);
    }

    async toggleFiltering() {
        try {
            this.toggleBtn.disabled = true;
            this.toggleBtn.textContent = '⏳ Updating...';

            const response = await this.sendMessage({
                type: 'TOGGLE_FILTERING'
            });

            if (response && response.success) {
                this.isEnabled = response.isEnabled;
                this.updateUI();

                // Show notification
                this.showNotification(
                    `Filtering ${this.isEnabled ? 'enabled' : 'disabled'}`,
                    this.isEnabled ? 'success' : 'warning'
                );
            } else {
                throw new Error('Toggle failed');
            }
        } catch (error) {
            console.error('Toggle failed:', error);
            this.showError('Failed to toggle filtering');
        } finally {
            this.toggleBtn.disabled = false;
        }
    }

    async clearCache() {
        try {
            this.clearCacheBtn.disabled = true;
            this.clearCacheBtn.textContent = '⏳ Clearing...';

            const response = await this.sendMessage({
                type: 'CLEAR_CACHE'
            });

            if (response && response.success) {
                this.showNotification('Cache cleared', 'success');
                await this.loadStatus(); // Refresh data
            } else {
                throw new Error('Clear cache failed');
            }
        } catch (error) {
            console.error('Clear cache failed:', error);
            this.showError('Failed to clear cache');
        } finally {
            this.clearCacheBtn.disabled = false;
            this.clearCacheBtn.innerHTML = '🧹 Clear Cache';
        }
    }

    async resetStatistics() {
        try {
            this.resetStatsBtn.disabled = true;
            this.resetStatsBtn.textContent = '⏳ Resetting...';

            const response = await this.sendMessage({
                type: 'RESET_STATS'
            });

            if (response && response.success) {
                this.blockedCount = 0;
                this.updateUI();
                this.showNotification('Statistics reset', 'success');
            } else {
                throw new Error('Reset stats failed');
            }
        } catch (error) {
            console.error('Reset stats failed:', error);
            this.showError('Failed to reset statistics');
        } finally {
            this.resetStatsBtn.disabled = false;
            this.resetStatsBtn.innerHTML = '📊 Reset Statistics';
        }
    }

    openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
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

    showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.errorEl.style.display = 'none';
        }, 3000);
    }

    showNotification(message, type = 'info') {
        try {
            // Create temporary notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: ${type === 'success' ? '#4ade80' : type === 'warning' ? '#fbbf24' : '#6b7280'};
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;

            if (document.body) {
                document.body.appendChild(notification);

                // Remove after 2 seconds
                setTimeout(() => {
                    if (notification.style) {
                        notification.style.animation = 'slideOut 0.3s ease';
                    }
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 2000);
            }
        } catch (error) {
            console.log('⚠️ Could not show notification:', error.message);
        }
    }
}

// Initialize popup when DOM is ready
const popupManager = new PopupManager();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
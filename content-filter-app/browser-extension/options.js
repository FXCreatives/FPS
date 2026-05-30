// Content Filter Extension - Options Page Script
// Handles advanced settings and configuration

class OptionsManager {
    constructor() {
        this.isEnabled = true;
        this.apiBaseUrl = 'http://localhost:3000';
        this.blockedCount = 0;
        this.cacheTimeout = 5;

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
            // Get form elements
            this.apiUrlInput = document.getElementById('apiUrl');
            this.filteringToggle = document.getElementById('filteringEnabled');
            this.cacheTimeoutSelect = document.getElementById('cacheTimeout');
            this.blockedCountDisplay = document.getElementById('blockedCount');
            this.filteringStatusDisplay = document.getElementById('filteringStatus');
            this.statusMessageEl = document.getElementById('statusMessage');

            // Get buttons
            this.testApiBtn = document.getElementById('testApiBtn');
            this.resetStatsBtn = document.getElementById('resetStatsBtn');
            this.clearCacheBtn = document.getElementById('clearCacheBtn');
            this.exportSettingsBtn = document.getElementById('exportSettingsBtn');
            this.settingsForm = document.getElementById('settingsForm');

            // Load current settings
            await this.loadSettings();

            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to initialize options:', error);
        }
    }

    async loadSettings() {
        try {
            const response = await this.sendMessage({
                type: 'GET_STATUS'
            });

            if (response) {
                this.isEnabled = response.isEnabled;
                this.apiBaseUrl = response.apiBaseUrl;
                this.blockedCount = response.blockedCount;

                this.updateUI();
            } else {
                throw new Error('No response from background script');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showStatus('Failed to load settings', 'error');
        }
    }

    updateUI() {
        // Update form fields
        this.apiUrlInput.value = this.apiBaseUrl;
        this.filteringToggle.checked = this.isEnabled;
        this.cacheTimeoutSelect.value = this.cacheTimeout;
        this.blockedCountDisplay.textContent = this.blockedCount.toLocaleString();
        this.filteringStatusDisplay.textContent = this.isEnabled ? 'Enabled' : 'Disabled';

        // Update toggle appearance
        this.filteringStatusDisplay.style.color = this.isEnabled ? '#4ade80' : '#f87171';
    }

    setupEventListeners() {
        // Test API connection
        this.testApiBtn.addEventListener('click', async () => {
            await this.testApiConnection();
        });

        // Reset statistics
        this.resetStatsBtn.addEventListener('click', async () => {
            await this.resetStatistics();
        });

        // Clear cache
        this.clearCacheBtn.addEventListener('click', async () => {
            await this.clearCache();
        });

        // Export settings
        this.exportSettingsBtn.addEventListener('click', () => {
            this.exportSettings();
        });

        // Form submission
        this.settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });

        // Real-time updates
        this.filteringToggle.addEventListener('change', async () => {
            await this.toggleFiltering();
        });

        this.apiUrlInput.addEventListener('input', () => {
            // Validate URL format
            const url = this.apiUrlInput.value;
            if (url && !this.isValidUrl(url)) {
                this.apiUrlInput.style.borderColor = '#ef4444';
            } else {
                this.apiUrlInput.style.borderColor = '';
            }
        });
    }

    async testApiConnection() {
        const apiUrl = this.apiUrlInput.value;

        if (!apiUrl) {
            this.showStatus('Please enter an API URL', 'error');
            return;
        }

        if (!this.isValidUrl(apiUrl)) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        try {
            this.testApiBtn.disabled = true;
            this.testApiBtn.textContent = '⏳ Testing...';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${apiUrl}/api/health`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.showStatus(`✅ API Connected (${data.version})`, 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showStatus('❌ API test timed out', 'error');
            } else {
                this.showStatus(`❌ API test failed: ${error.message}`, 'error');
            }
        } finally {
            this.testApiBtn.disabled = false;
            this.testApiBtn.innerHTML = '🧪 Test API Connection';
        }
    }

    async toggleFiltering() {
        try {
            const response = await this.sendMessage({
                type: 'TOGGLE_FILTERING'
            });

            if (response && response.success) {
                this.isEnabled = response.isEnabled;
                this.updateUI();
                this.showStatus(`Filtering ${this.isEnabled ? 'enabled' : 'disabled'}`, 'success');
            } else {
                throw new Error('Toggle failed');
            }
        } catch (error) {
            console.error('Toggle failed:', error);
            this.showStatus('Failed to toggle filtering', 'error');
            // Revert UI change
            this.filteringToggle.checked = this.isEnabled;
        }
    }

    async resetStatistics() {
        try {
            const response = await this.sendMessage({
                type: 'RESET_STATS'
            });

            if (response && response.success) {
                this.blockedCount = 0;
                this.updateUI();
                this.showStatus('Statistics reset', 'success');
            } else {
                throw new Error('Reset failed');
            }
        } catch (error) {
            console.error('Reset statistics failed:', error);
            this.showStatus('Failed to reset statistics', 'error');
        }
    }

    async clearCache() {
        try {
            const response = await this.sendMessage({
                type: 'CLEAR_CACHE'
            });

            if (response && response.success) {
                this.showStatus('Cache cleared', 'success');
            } else {
                throw new Error('Clear cache failed');
            }
        } catch (error) {
            console.error('Clear cache failed:', error);
            this.showStatus('Failed to clear cache', 'error');
        }
    }

    exportSettings() {
        try {
            const settings = {
                isEnabled: this.isEnabled,
                apiBaseUrl: this.apiBaseUrl,
                blockedCount: this.blockedCount,
                cacheTimeout: this.cacheTimeout,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            };

            const dataStr = JSON.stringify(settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `content-filter-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showStatus('Settings exported', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showStatus('Failed to export settings', 'error');
        }
    }

    async saveSettings() {
        try {
            const newApiUrl = this.apiUrlInput.value;

            if (!newApiUrl) {
                this.showStatus('API URL is required', 'error');
                return;
            }

            if (!this.isValidUrl(newApiUrl)) {
                this.showStatus('Please enter a valid API URL', 'error');
                return;
            }

            // Update API URL
            const response = await this.sendMessage({
                type: 'UPDATE_API_URL',
                apiUrl: newApiUrl
            });

            if (response && response.success) {
                this.apiBaseUrl = newApiUrl;
                this.updateUI();
                this.showStatus('Settings saved successfully', 'success');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save settings failed:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
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

    showStatus(message, type) {
        try {
            if (this.statusMessageEl) {
                this.statusMessageEl.textContent = message;
                this.statusMessageEl.className = `status-message status-${type}`;
                this.statusMessageEl.style.display = 'block';

                // Auto-hide after 3 seconds
                setTimeout(() => {
                    if (this.statusMessageEl) {
                        this.statusMessageEl.style.display = 'none';
                    }
                }, 3000);
            }
        } catch (error) {
            console.log('⚠️ Could not show status:', error.message);
        }
    }
}

// Initialize options page
const optionsManager = new OptionsManager();
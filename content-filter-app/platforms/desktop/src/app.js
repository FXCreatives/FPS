// Content Filter Desktop - Main Application JavaScript
// Handles all UI interactions and real-time updates

class DesktopApp {
    constructor() {
        this.currentSection = 'overview';
        this.isFilterEnabled = true;
        this.blockedCount = 0;
        this.apiBaseUrl = 'http://localhost:3000';
        this.updateInterval = null;

        this.initialize();
    }

    async initialize() {
        console.log('🚀 Desktop app initializing...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            // Set up navigation
            this.setupNavigation();

            // Load initial data
            await this.loadDashboardData();

            // Set up real-time updates
            this.startRealTimeUpdates();

            // Initialize charts
            this.initializeCharts();

            // Hide loading overlay
            this.hideLoadingOverlay();

            console.log('✅ Desktop app initialized');
        } catch (error) {
            console.error('❌ Desktop app initialization failed:', error);
        }
    }

    setupNavigation() {
        // Handle navigation clicks
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }

        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    async loadDashboardData() {
        try {
            // Load system statistics
            await this.loadSystemStats();

            // Load platform information
            this.loadPlatformInfo();

            // Load recent activity
            this.loadRecentActivity();

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
        }
    }

    async loadSystemStats() {
        try {
            // Get data from Electron main process
            const stats = await window.electronAPI.getBlockedStats();

            // Update stat cards
            this.updateStatCard('totalBlocked', stats.totalBlocked || 0);
            this.updateStatCard('todayBlocked', stats.todayBlocked || 0);
            this.updateStatCard('blockedSites', 150);

        } catch (error) {
            console.error('❌ Failed to load system stats:', error);
            // Use fallback data
            this.updateStatCard('totalBlocked', 0);
            this.updateStatCard('todayBlocked', 0);
            this.updateStatCard('blockedSites', 150);
        }
    }

    updateStatCard(cardId, value) {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = value.toLocaleString();
        }
    }

    loadPlatformInfo() {
        try {
            // Get platform information
            const platform = window.electronAPI.platform;
            const platformElement = document.getElementById('platform');
            if (platformElement) {
                const platformNames = {
                    'win32': 'Windows',
                    'darwin': 'macOS',
                    'linux': 'Linux'
                };
                platformElement.textContent = platformNames[platform] || platform;
            }

            // Load system information
            this.loadSystemInformation();

        } catch (error) {
            console.error('❌ Failed to load platform info:', error);
        }
    }

    async loadSystemInformation() {
        try {
            const systemInfo = await window.electronAPI.getSystemStats();

            // Update system information
            const cpuElement = document.getElementById('cpuUsage');
            const memoryElement = document.getElementById('memoryUsage');

            if (cpuElement) {
                cpuElement.textContent = Math.round(systemInfo.cpu) + '%';
            }

            if (memoryElement) {
                memoryElement.textContent = Math.round(systemInfo.memory) + '%';
            }

        } catch (error) {
            console.error('❌ Failed to load system information:', error);
        }
    }

    loadRecentActivity() {
        // Load recent blocking activity
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        // Sample recent activity
        const activities = [
            { site: 'pornhub.com', time: '2 minutes ago', type: 'block' },
            { site: 'xvideos.com', time: '5 minutes ago', type: 'block' },
            { site: 'beeg.com', time: '8 minutes ago', type: 'block' }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <i class="fas fa-ban"></i>
                <span>${activity.site} blocked</span>
            </div>
        `).join('');
    }

    startRealTimeUpdates() {
        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);

        console.log('📊 Real-time updates started');
    }

    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    initializeCharts() {
        this.createBlockingChart();
        this.createSitesChart();
    }

    createBlockingChart() {
        const ctx = document.getElementById('blockingChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.blockingChart) {
            this.blockingChart.destroy();
        }

        this.blockingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Sites Blocked',
                    data: [12, 19, 3, 5, 2, 3, 7],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 123, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 123, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    createSitesChart() {
        const ctx = document.getElementById('sitesChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.sitesChart) {
            this.sitesChart.destroy();
        }

        this.sitesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Adult Sites', 'Safe Sites', 'Other'],
                datasets: [{
                    data: [150, 1000, 50],
                    backgroundColor: [
                        '#dc3545',
                        '#28a745',
                        '#ffc107'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Settings Management
    async saveSettings() {
        try {
            const settings = {
                filterEnabled: document.getElementById('filterEnabled').checked,
                apiUrl: document.getElementById('apiUrl').value,
                autoStart: document.getElementById('autoStart').checked,
                requirePassword: document.getElementById('requirePassword').checked,
                blockNotifications: document.getElementById('blockNotifications').checked
            };

            const result = await window.electronAPI.saveSettings(settings);

            if (result.success) {
                alert('Settings saved successfully!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            alert('Failed to save settings: ' + error.message);
        }
    }

    async testApiConnection() {
        try {
            const apiUrl = document.getElementById('apiUrl').value;

            if (!apiUrl) {
                alert('Please enter API URL first');
                return;
            }

            const result = await window.electronAPI.testApiConnection(apiUrl);

            if (result.success) {
                alert('✅ API connection successful!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ API connection failed:', error);
            alert('❌ API connection failed: ' + error.message);
        }
    }

    // Utility Methods
    formatNumber(num) {
        return num.toLocaleString();
    }

    formatDate(date) {
        return new Date(date).toLocaleString();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Event Handlers
    async handleSiteBlocked(siteInfo) {
        console.log('🚫 Site blocked:', siteInfo);

        // Update statistics
        this.blockedCount++;
        this.updateStatCard('totalBlocked', this.blockedCount);

        // Add to recent activity
        this.addToRecentActivity(siteInfo);

        // Show notification
        this.showNotification(`Blocked: ${siteInfo.hostname}`, 'warning');
    }

    addToRecentActivity(siteInfo) {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <i class="fas fa-ban"></i>
            <span>${siteInfo.hostname} blocked</span>
        `;

        // Add to beginning of list
        activityList.insertBefore(activityItem, activityList.firstChild);

        // Keep only last 10 items
        while (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }

    // Cleanup
    cleanup() {
        this.stopRealTimeUpdates();

        if (this.blockingChart) {
            this.blockingChart.destroy();
        }
        if (this.sitesChart) {
            this.sitesChart.destroy();
        }
    }
}

// Global app instance
const desktopApp = new DesktopApp();

// Handle real-time updates from main process
if (window.electronAPI) {
    window.electronAPI.onSiteBlocked((siteInfo) => {
        desktopApp.handleSiteBlocked(siteInfo);
    });
}

// Global functions for HTML onclick handlers
async function saveSettings() {
    await desktopApp.saveSettings();
}

async function testApiConnection() {
    await desktopApp.testApiConnection();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    desktopApp.cleanup();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DesktopApp };
}
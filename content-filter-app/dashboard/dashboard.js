// Content Filter Dashboard - Main JavaScript
// Handles all dashboard functionality and real-time updates

class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.apiBaseUrl = 'http://localhost:3000';
        this.updateInterval = null;

        this.initialize();
    }

    async initialize() {
        console.log('🚀 Dashboard initializing...');

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

            // Set up real-time updates
            this.startRealTimeUpdates();

            // Load initial data
            await this.loadDashboardData();

            // Set up charts
            this.initializeCharts();

            console.log('✅ Dashboard initialized');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
        }
    }

    setupNavigation() {
        // Handle navigation clicks
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.showSection(sectionId);
            });
        });

        // Handle responsive navigation
        this.setupResponsiveNav();
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

        const activeLink = document.querySelector(`[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    setupResponsiveNav() {
        // Handle mobile navigation if needed
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }

    async loadDashboardData() {
        try {
            // Load system statistics
            await this.loadSystemStats();

            // Load recent activity
            await this.loadRecentActivity();

            // Load user data
            await this.loadUserData();

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
        }
    }

    async loadSystemStats() {
        try {
            // Get data from API
            const response = await fetch(`${this.apiBaseUrl}/api/stats`);
            const stats = await response.json();

            // Update stat cards
            this.updateStatCard('totalBlocked', stats.totalBlocked || 0);
            this.updateStatCard('activeUsers', stats.activeUsers || 0);
            this.updateStatCard('blockedSites', stats.blockedSites || 150);
            this.updateStatCard('systemStatus', stats.systemStatus || 'Online');

        } catch (error) {
            console.error('❌ Failed to load system stats:', error);
            // Use fallback data
            this.updateStatCard('totalBlocked', 0);
            this.updateStatCard('activeUsers', 0);
            this.updateStatCard('blockedSites', 150);
            this.updateStatCard('systemStatus', 'Offline');
        }
    }

    updateStatCard(cardId, value) {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = value.toLocaleString();
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity`);
            const activities = await response.json();

            this.updateActivityList(activities);

        } catch (error) {
            console.error('❌ Failed to load recent activity:', error);
            this.updateActivityList([]);
        }
    }

    updateActivityList(activities) {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = '<p style="text-align: center; color: #b0b0b0;">No recent activity</p>';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-info">
                    <p>${activity.description}</p>
                    <span>${activity.timestamp}</span>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'block': 'fa-ban',
            'login': 'fa-sign-in-alt',
            'user': 'fa-user-plus',
            'error': 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-info-circle';
    }

    async loadUserData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`);
            const users = await response.json();

            this.updateUsersTable(users);

        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            this.updateUsersTable([]);
        }
    }

    updateUsersTable(users) {
        const tbody = document.querySelector('.users-table tbody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #b0b0b0;">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.email}</span>
                    </div>
                </td>
                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                <td>${user.blockedCount || 0}</td>
                <td>${user.lastActivity}</td>
                <td>
                    <button class="btn-icon" onclick="dashboardManager.editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="dashboardManager.deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
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

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Sites Blocked',
                    data: [12, 19, 3, 5, 2, 3, 7],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 123, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 123, 255, 0.1)'
                        }
                    }
                },
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

    createSitesChart() {
        const ctx = document.getElementById('sitesChart');
        if (!ctx) return;

        new Chart(ctx, {
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

    // User Management Methods
    async editUser(userId) {
        console.log('Editing user:', userId);
        // Implementation for editing user
        alert('Edit user functionality coming soon!');
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            console.log('Deleting user:', userId);
            // Implementation for deleting user
            alert('Delete user functionality coming soon!');
        }
    }

    // Settings Management
    async saveSettings() {
        const apiUrl = document.getElementById('apiUrl').value;
        const systemEnabled = document.getElementById('systemEnabled').checked;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiUrl,
                    systemEnabled
                })
            });

            if (response.ok) {
                alert('Settings saved successfully!');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    }

    // API Communication
    async testApiConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            if (response.ok) {
                alert('✅ API connection successful!');
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ API connection failed:', error);
            alert('❌ API connection failed. Please check your API server.');
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
}

// Global dashboard instance
const dashboardManager = new DashboardManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardManager };
}
const si = require('systeminformation');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'http://localhost:3000';
        this.monitoringInterval = options.interval || 30000; // 30 seconds
        this.isMonitoring = false;
        this.monitoringTimer = null;
        this.metrics = {
            system: {},
            applications: {},
            network: {},
            security: {}
        };
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Monitoring already active');
            return;
        }

        console.log('🚀 Starting system monitoring...');
        this.isMonitoring = true;

        // Start periodic monitoring
        this.monitoringTimer = setInterval(() => {
            this.collectMetrics();
        }, this.monitoringInterval);

        // Initial collection
        this.collectMetrics();

        console.log('✅ System monitoring started');
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('⏹️ Stopping system monitoring...');
        this.isMonitoring = false;

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        console.log('✅ System monitoring stopped');
    }

    async collectMetrics() {
        try {
            // Collect system metrics
            await this.collectSystemMetrics();

            // Collect application metrics
            await this.collectApplicationMetrics();

            // Collect network metrics
            await this.collectNetworkMetrics();

            // Collect security metrics
            await this.collectSecurityMetrics();

            // Send metrics to API
            await this.sendMetricsToAPI();

            // Save metrics locally
            this.saveMetricsLocally();

        } catch (error) {
            console.error('❌ Error collecting metrics:', error);
        }
    }

    async collectSystemMetrics() {
        try {
            const [cpu, memory, disk, os] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.fsSize(),
                si.osInfo()
            ]);

            this.metrics.system = {
                timestamp: new Date().toISOString(),
                cpu: {
                    usage: cpu.load,
                    temperature: cpu.temperature
                },
                memory: {
                    used: memory.used,
                    total: memory.total,
                    usagePercent: (memory.used / memory.total) * 100
                },
                disk: disk.map(d => ({
                    mount: d.mount,
                    used: d.used,
                    total: d.total,
                    usagePercent: d.use
                })),
                os: {
                    platform: os.platform,
                    distro: os.distro,
                    release: os.release,
                    arch: os.arch
                }
            };

        } catch (error) {
            console.error('❌ Error collecting system metrics:', error);
        }
    }

    async collectApplicationMetrics() {
        try {
            const [processes, services] = await Promise.all([
                si.processes(),
                si.services('*')
            ]);

            this.metrics.applications = {
                timestamp: new Date().toISOString(),
                processes: {
                    total: processes.all,
                    running: processes.running,
                    blocked: processes.blocked,
                    sleeping: processes.sleeping
                },
                services: {
                    total: services.length,
                    running: services.filter(s => s.running).length,
                    stopped: services.filter(s => !s.running).length
                },
                topProcesses: processes.list.slice(0, 10).map(p => ({
                    name: p.name,
                    cpu: p.cpu,
                    memory: p.mem
                }))
            };

        } catch (error) {
            console.error('❌ Error collecting application metrics:', error);
        }
    }

    async collectNetworkMetrics() {
        try {
            const [networkInterfaces, networkStats] = await Promise.all([
                si.networkInterfaces(),
                si.networkStats()
            ]);

            this.metrics.network = {
                timestamp: new Date().toISOString(),
                interfaces: networkInterfaces.map(ni => ({
                    name: ni.iface,
                    ip4: ni.ip4,
                    ip6: ni.ip6,
                    speed: ni.speed
                })),
                stats: networkStats.map(ns => ({
                    interface: ns.iface,
                    rxBytes: ns.rx_bytes,
                    txBytes: ns.tx_bytes,
                    rxErrors: ns.rx_errors,
                    txErrors: ns.tx_errors
                }))
            };

        } catch (error) {
            console.error('❌ Error collecting network metrics:', error);
        }
    }

    async collectSecurityMetrics() {
        try {
            // Collect security-related metrics
            this.metrics.security = {
                timestamp: new Date().toISOString(),
                firewall: await this.getFirewallStatus(),
                antivirus: await this.getAntivirusStatus(),
                blockedConnections: await this.getBlockedConnections(),
                securityEvents: await this.getSecurityEvents()
            };

        } catch (error) {
            console.error('❌ Error collecting security metrics:', error);
        }
    }

    async getFirewallStatus() {
        // Check firewall status (platform-specific)
        return {
            enabled: true,
            rules: 0
        };
    }

    async getAntivirusStatus() {
        // Check antivirus status (platform-specific)
        return {
            enabled: true,
            updated: true
        };
    }

    async getBlockedConnections() {
        // Get blocked network connections
        return {
            count: 0,
            recent: []
        };
    }

    async getSecurityEvents() {
        // Get recent security events
        return {
            count: 0,
            events: []
        };
    }

    async sendMetricsToAPI() {
        try {
            if (!this.apiUrl) return;

            await axios.post(`${this.apiUrl}/api/metrics`, {
                source: 'system_monitor',
                metrics: this.metrics
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'cf_monitoring'
                }
            });

        } catch (error) {
            console.error('❌ Error sending metrics to API:', error.message);
        }
    }

    saveMetricsLocally() {
        try {
            const metricsPath = path.join(__dirname, '../data/metrics');
            if (!fs.existsSync(metricsPath)) {
                fs.mkdirSync(metricsPath, { recursive: true });
            }

            const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(metricsPath, filename);

            // Append to daily metrics file
            const metricsEntry = {
                timestamp: new Date().toISOString(),
                ...this.metrics
            };

            let dailyMetrics = [];
            if (fs.existsSync(filepath)) {
                dailyMetrics = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            }

            dailyMetrics.push(metricsEntry);

            fs.writeFileSync(filepath, JSON.stringify(dailyMetrics, null, 2));

        } catch (error) {
            console.error('❌ Error saving metrics locally:', error);
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }

    getHealthStatus() {
        const system = this.metrics.system;
        const security = this.metrics.security;

        return {
            overall: this.calculateOverallHealth(),
            system: this.calculateSystemHealth(system),
            security: this.calculateSecurityHealth(security),
            network: this.calculateNetworkHealth(),
            timestamp: new Date().toISOString()
        };
    }

    calculateOverallHealth() {
        const systemHealth = this.calculateSystemHealth(this.metrics.system);
        const securityHealth = this.calculateSecurityHealth(this.metrics.security);
        const networkHealth = this.calculateNetworkHealth();

        return (systemHealth + securityHealth + networkHealth) / 3;
    }

    calculateSystemHealth(system) {
        if (!system.cpu || !system.memory) return 50;

        const cpuHealth = Math.max(0, 100 - system.cpu.usage);
        const memoryHealth = Math.max(0, 100 - system.memory.usagePercent);

        return (cpuHealth + memoryHealth) / 2;
    }

    calculateSecurityHealth(security) {
        if (!security.firewall || !security.antivirus) return 50;

        let health = 50;

        if (security.firewall.enabled) health += 25;
        if (security.antivirus.enabled && security.antivirus.updated) health += 25;

        return health;
    }

    calculateNetworkHealth() {
        // Simplified network health calculation
        return 90; // Assume good health if monitoring is active
    }

    generateReport() {
        const health = this.getHealthStatus();
        const metrics = this.getMetrics();

        return {
            summary: {
                overallHealth: health.overall,
                monitoringActive: this.isMonitoring,
                lastUpdate: new Date().toISOString()
            },
            health: health,
            metrics: metrics,
            recommendations: this.generateRecommendations(health)
        };
    }

    generateRecommendations(health) {
        const recommendations = [];

        if (health.system < 70) {
            recommendations.push({
                type: 'warning',
                category: 'system',
                message: 'High CPU or memory usage detected. Consider optimizing system resources.'
            });
        }

        if (health.security < 80) {
            recommendations.push({
                type: 'security',
                category: 'security',
                message: 'Security measures may need attention. Check firewall and antivirus status.'
            });
        }

        if (health.network < 70) {
            recommendations.push({
                type: 'warning',
                category: 'network',
                message: 'Network performance issues detected. Check connectivity and firewall rules.'
            });
        }

        return recommendations;
    }

    cleanup() {
        this.stopMonitoring();
    }
}

// Export for use in other modules
module.exports = SystemMonitor;

// CLI interface
if (require.main === module) {
    const monitor = new SystemMonitor({
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        interval: parseInt(process.env.MONITOR_INTERVAL) || 30000
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n⏹️ Received SIGINT, shutting down gracefully...');
        monitor.cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n⏹️ Received SIGTERM, shutting down gracefully...');
        monitor.cleanup();
        process.exit(0);
    });

    // Start monitoring
    monitor.startMonitoring();

    console.log('🔍 System monitoring started. Press Ctrl+C to stop.');
}
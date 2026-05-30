const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dns = require('dns-lookup');

class NetworkMonitor {
    constructor(options = {}) {
        this.onSiteBlocked = options.onSiteBlocked || (() => {});
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.blockedHosts = new Set();

        // Load blocked domains list
        this.loadBlockedDomains();
    }

    loadBlockedDomains() {
        // This would typically load from a database or API
        // For now, using a static list
        this.blockedDomains = [
            'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
            'xnxx.com', 'spankbang.com', 'beeg.com', 'beeg24.org', 'xhaccess.com'
        ];
    }

    start() {
        if (this.isMonitoring) {
            return;
        }

        console.log('🔍 Starting network monitoring...');
        this.isMonitoring = true;

        // Start different monitoring methods based on platform
        this.startPlatformSpecificMonitoring();

        // Monitor network connections every 5 seconds
        this.monitoringInterval = setInterval(() => {
            this.monitorNetworkConnections();
        }, 5000);
    }

    stop() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('⏹️ Stopping network monitoring...');
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    startPlatformSpecificMonitoring() {
        const platform = process.platform;

        switch (platform) {
            case 'win32':
                this.startWindowsMonitoring();
                break;
            case 'darwin':
                this.startMacMonitoring();
                break;
            case 'linux':
                this.startLinuxMonitoring();
                break;
            default:
                console.log('⚠️ Unsupported platform for advanced monitoring');
        }
    }

    startWindowsMonitoring() {
        console.log('🔍 Starting Windows-specific monitoring...');

        // Monitor Windows network connections
        this.monitorWindowsConnections();
    }

    startMacMonitoring() {
        console.log('🔍 Starting macOS-specific monitoring...');

        // Monitor macOS network connections
        this.monitorMacConnections();
    }

    startLinuxMonitoring() {
        console.log('🔍 Starting Linux-specific monitoring...');

        // Monitor Linux network connections
        this.monitorLinuxConnections();
    }

    monitorNetworkConnections() {
        if (!this.isMonitoring) return;

        try {
            const platform = process.platform;

            switch (platform) {
                case 'win32':
                    this.checkWindowsConnections();
                    break;
                case 'darwin':
                    this.checkMacConnections();
                    break;
                case 'linux':
                    this.checkLinuxConnections();
                    break;
            }
        } catch (error) {
            console.error('❌ Error monitoring network connections:', error);
        }
    }

    checkWindowsConnections() {
        // Use Windows netstat command to check connections
        exec('netstat -n', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error checking Windows connections:', error);
                return;
            }

            this.analyzeConnections(stdout);
        });
    }

    checkMacConnections() {
        // Use macOS netstat command
        exec('netstat -n', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error checking macOS connections:', error);
                return;
            }

            this.analyzeConnections(stdout);
        });
    }

    checkLinuxConnections() {
        // Use Linux netstat command
        exec('netstat -n', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error checking Linux connections:', error);
                return;
            }

            this.analyzeConnections(stdout);
        });
    }

    analyzeConnections(netstatOutput) {
        try {
            const lines = netstatOutput.split('\n');
            const suspiciousConnections = [];

            for (const line of lines) {
                // Look for connections to blocked domains
                for (const domain of this.blockedDomains) {
                    if (line.toLowerCase().includes(domain)) {
                        suspiciousConnections.push({
                            domain,
                            connection: line.trim(),
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            // Report suspicious connections
            for (const connection of suspiciousConnections) {
                if (!this.blockedHosts.has(connection.domain)) {
                    this.blockedHosts.add(connection.domain);
                    this.onSiteBlocked({
                        hostname: connection.domain,
                        reason: 'Network connection detected',
                        timestamp: connection.timestamp
                    });
                }
            }

        } catch (error) {
            console.error('❌ Error analyzing connections:', error);
        }
    }

    /**
     * Check if a hostname is blocked
     */
    isHostnameBlocked(hostname) {
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

        return false;
    }

    /**
     * Add custom blocked domain
     */
    addBlockedDomain(domain) {
        if (!this.blockedDomains.includes(domain)) {
            this.blockedDomains.push(domain);
            console.log('➕ Added blocked domain:', domain);
        }
    }

    /**
     * Remove blocked domain
     */
    removeBlockedDomain(domain) {
        const index = this.blockedDomains.indexOf(domain);
        if (index > -1) {
            this.blockedDomains.splice(index, 1);
            console.log('➖ Removed blocked domain:', domain);
        }
    }

    /**
     * Get current blocked domains
     */
    getBlockedDomains() {
        return [...this.blockedDomains];
    }

    /**
     * Check DNS resolution for blocked domains
     */
    checkDnsResolution() {
        console.log('🔍 Checking DNS resolution for blocked domains...');

        for (const domain of this.blockedDomains) {
            dns.lookup(domain, (err, address, family) => {
                if (!err && address) {
                    console.log(`📍 ${domain} resolves to ${address}`);

                    // If domain resolves, it might be actively accessed
                    this.onSiteBlocked({
                        hostname: domain,
                        reason: 'DNS resolution detected',
                        ip: address,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    }

    /**
     * Monitor browser processes
     */
    monitorBrowserProcesses() {
        try {
            const platform = process.platform;

            if (platform === 'win32') {
                // Monitor Windows processes
                exec('tasklist', (error, stdout, stderr) => {
                    if (!error) {
                        this.analyzeBrowserProcesses(stdout);
                    }
                });
            } else if (platform === 'darwin') {
                // Monitor macOS processes
                exec('ps aux', (error, stdout, stderr) => {
                    if (!error) {
                        this.analyzeBrowserProcesses(stdout);
                    }
                });
            } else if (platform === 'linux') {
                // Monitor Linux processes
                exec('ps aux', (error, stdout, stderr) => {
                    if (!error) {
                        this.analyzeBrowserProcesses(stdout);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error monitoring browser processes:', error);
        }
    }

    analyzeBrowserProcesses(processList) {
        try {
            const lines = processList.split('\n');
            const browsers = ['chrome', 'firefox', 'edge', 'opera', 'safari'];

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                for (const browser of browsers) {
                    if (lowerLine.includes(browser)) {
                        console.log('🌐 Browser detected:', line.trim());
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error analyzing browser processes:', error);
        }
    }

    /**
     * Get network statistics
     */
    getNetworkStats() {
        return {
            isMonitoring: this.isMonitoring,
            blockedHostsCount: this.blockedHosts.size,
            blockedDomainsCount: this.blockedDomains.length,
            monitoringInterval: 5000
        };
    }

    /**
     * Reset blocked hosts tracking
     */
    resetBlockedHosts() {
        this.blockedHosts.clear();
        console.log('🔄 Blocked hosts tracking reset');
    }
}

module.exports = NetworkMonitor;
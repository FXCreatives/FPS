const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // System statistics
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),

    // Blocked sites statistics
    getBlockedStats: () => ipcRenderer.invoke('get-blocked-stats'),

    // API connection testing
    testApiConnection: (apiUrl) => ipcRenderer.invoke('test-api-connection', apiUrl),

    // Settings management
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    getSettings: () => ipcRenderer.invoke('get-settings'),

    // Real-time updates
    onSiteBlocked: (callback) => {
        ipcRenderer.on('site-blocked', callback);
        // Return cleanup function
        return () => ipcRenderer.removeListener('site-blocked', callback);
    },

    // Navigation
    navigateTo: (section) => ipcRenderer.send('navigate-to', section),

    // Platform information
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development'
});

// Also expose a simple API for basic operations
contextBridge.exposeInMainWorld('contentFilter', {
    // Check if URL should be blocked
    shouldBlockUrl: async (url) => {
        try {
            const hostname = new URL(url).hostname;
            const blockedDomains = [
                'pornhub.com', 'xvideos.com', 'xhamster.com', 'youporn.com', 'redtube.com',
                'xnxx.com', 'spankbang.com', 'beeg.com', 'beeg24.org', 'xhaccess.com'
            ];

            return blockedDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch (error) {
            return false;
        }
    },

    // Get filter status
    isEnabled: async () => {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            return settings.filterEnabled !== false;
        } catch (error) {
            return true; // Default to enabled
        }
    },

    // Block site manually
    blockSite: async (url, reason) => {
        try {
            // This would integrate with the main filtering engine
            console.log('Manual block requested:', url, reason);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
});
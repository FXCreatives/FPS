const { app, BrowserWindow, Menu, ipcMain, shell, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const si = require('systeminformation');
const activeWin = require('active-win');
const ContentFilterEngine = require('./src/ContentFilterEngine');
const NetworkMonitor = require('./src/NetworkMonitor');
const DatabaseManager = require('./src/DatabaseManager');

// Keep a global reference of the window object
let mainWindow;
let filterEngine;
let networkMonitor;
let databaseManager;

// Initialize electron store for settings
const store = new Store();

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icons/icon.png'),
        titleBarStyle: 'default',
        show: false // Don't show until ready
    });

    // Load the app
    mainWindow.loadFile('src/index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Initialize content filtering
        initializeContentFiltering();

        // Start network monitoring
        startNetworkMonitoring();
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;

        // Cleanup
        if (filterEngine) {
            filterEngine.stop();
        }
        if (networkMonitor) {
            networkMonitor.stop();
        }
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    return mainWindow;
}

// Initialize content filtering engine
function initializeContentFiltering() {
    try {
        filterEngine = new ContentFilterEngine({
            databasePath: path.join(app.getPath('userData'), 'contentfilter.db'),
            apiUrl: store.get('apiUrl', 'http://localhost:3000')
        });

        filterEngine.start();
        console.log('✅ Content filtering engine initialized');

    } catch (error) {
        console.error('❌ Failed to initialize content filtering:', error);
    }
}

// Start network monitoring
function startNetworkMonitoring() {
    try {
        networkMonitor = new NetworkMonitor({
            onSiteBlocked: (siteInfo) => {
                // Send notification to renderer
                if (mainWindow) {
                    mainWindow.webContents.send('site-blocked', siteInfo);
                }

                // Show system notification
                showNotification({
                    title: 'Content Blocked',
                    body: `Blocked access to: ${siteInfo.hostname}`,
                    icon: path.join(__dirname, 'assets/icons/icon.png')
                });
            }
        });

        networkMonitor.start();
        console.log('✅ Network monitoring started');

    } catch (error) {
        console.error('❌ Failed to start network monitoring:', error);
    }
}

// Show system notification
function showNotification({ title, body, icon }) {
    try {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title,
                body,
                icon,
                silent: false
            });

            notification.show();

            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    } catch (error) {
        console.error('❌ Failed to show notification:', error);
    }
}

// App event listeners
app.whenReady().then(() => {
    createWindow();

    // Set up application menu
    setupApplicationMenu();

    // Handle app activation (macOS)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup on app quit
app.on('before-quit', () => {
    if (filterEngine) {
        filterEngine.stop();
    }
    if (networkMonitor) {
        networkMonitor.stop();
    }
});

// Set up application menu
function setupApplicationMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Settings',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('navigate-to', 'settings');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Tools',
            submenu: [
                {
                    label: 'Clear Cache',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.session.clearCache();
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'Cache Cleared',
                                message: 'Application cache has been cleared.'
                            });
                        }
                    }
                },
                {
                    label: 'Reset Database',
                    click: async () => {
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'warning',
                            buttons: ['Cancel', 'Reset'],
                            title: 'Reset Database',
                            message: 'This will clear all blocked sites history and statistics. Continue?'
                        });

                        if (result.response === 1) {
                            // Reset database
                            if (databaseManager) {
                                databaseManager.reset();
                            }
                        }
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Content Filter Desktop',
                            message: 'Advanced content filtering application for desktop platforms.',
                            detail: `Version: ${app.getVersion()}\nPlatform: ${process.platform}\nElectron: ${process.versions.electron}`
                        });
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu
        template.splice(3, 0, {
            label: 'Window',
            submenu: [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers for communication with renderer process
ipcMain.handle('get-system-stats', async () => {
    try {
        const [cpu, memory, network] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.networkStats()
        ]);

        return {
            cpu: cpu.load,
            memory: (memory.used / memory.total) * 100,
            network: network[0] || { rx: 0, tx: 0 }
        };
    } catch (error) {
        console.error('Error getting system stats:', error);
        return { cpu: 0, memory: 0, network: { rx: 0, tx: 0 } };
    }
});

ipcMain.handle('get-blocked-stats', async () => {
    try {
        if (databaseManager) {
            return await databaseManager.getStats();
        }
        return { totalBlocked: 0, todayBlocked: 0 };
    } catch (error) {
        console.error('Error getting blocked stats:', error);
        return { totalBlocked: 0, todayBlocked: 0 };
    }
});

ipcMain.handle('test-api-connection', async (event, apiUrl) => {
    try {
        const axios = require('axios');
        const response = await axios.get(`${apiUrl}/api/health`, { timeout: 5000 });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-settings', async (event, settings) => {
    try {
        store.set(settings);

        // Update filter engine if API URL changed
        if (settings.apiUrl && filterEngine) {
            filterEngine.updateApiUrl(settings.apiUrl);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-settings', () => {
    return store.store;
});

// Auto-updater (if enabled)
if (process.env.NODE_ENV === 'production') {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { createWindow };
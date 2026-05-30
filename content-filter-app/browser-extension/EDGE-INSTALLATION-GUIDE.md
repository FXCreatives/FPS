# Content Filter Extension - Microsoft Edge Installation Guide

## 🚀 Quick Installation

1. **Open Microsoft Edge** and go to `edge://extensions/`
2. **Enable Developer Mode** by toggling the switch in the bottom left corner
3. **Click "Load unpacked"** button
4. **Navigate to** `content-filter-app/browser-extension/` folder
5. **Select the folder** and click "Select Folder"
6. **Extension should now be installed** and visible in your extensions list

## 🧪 Testing the Extension

1. **Open the test page**: Go to `content-filter-app/browser-extension/test.html`
2. **Open Developer Tools** (F12) and check the Console tab
3. **The test suite will run automatically** and show results
4. **Manual testing**: Try to visit a blocked site (e.g., pornhub.com) - it should redirect to blocked.html

## 🔧 Troubleshooting

### Extension Not Working
- **Check if enabled**: Click the extension icon in toolbar and ensure it's enabled
- **Check permissions**: Go to `edge://extensions/` and click "Details" on the extension
- **Clear cache**: Sometimes Edge needs a restart after loading unpacked extensions

### Content Not Blocking
- **Check console**: Open Developer Tools and look for error messages
- **Verify installation**: Make sure all files are properly loaded
- **Test with known sites**: Try visiting pornhub.com or xvideos.com

### Common Edge Issues
- **Service Worker**: Edge sometimes requires a restart for service workers to load properly
- **Permissions**: Edge is stricter about permissions - make sure all required permissions are granted
- **CORS**: Some sites may have CORS issues in Edge

## 📊 Features That Should Work

✅ **Instant blocking** of adult content sites
✅ **Search result filtering** on Google, Bing, etc.
✅ **Customizable blocklist** via options page
✅ **Statistics tracking** of blocked requests
✅ **Real-time protection** for all websites

## 🐛 Known Edge Limitations

- Some advanced features may work differently than in Chrome
- Service worker debugging can be more challenging
- Extension updates require manual reloading in developer mode

## 📞 Support

If you're still having issues:
1. Check the browser console for error messages
2. Try restarting Edge completely
3. Reload the extension in `edge://extensions/`
4. Check that all files are present in the extension folder

## 🔄 Updates

When updating the extension:
1. Go to `edge://extensions/`
2. Find the Content Filter Extension
3. Click the refresh button or toggle it off and on
4. Sometimes a full browser restart is needed
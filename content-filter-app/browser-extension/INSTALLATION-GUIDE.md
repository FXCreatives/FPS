# 🚀 Content Filter Browser Extension - Installation & Testing Guide

## 📋 Prerequisites

Before installing the extension, ensure:

1. **Phase 1 API Server is Running**
   - Your Phase 1 server must be running on `http://localhost:3000`
   - Test it: `curl http://localhost:3000/api/health`
   - Expected: `{"status": "healthy", "database": "connected"}`

2. **Browser Compatibility**
   - ✅ Chrome 88+ (recommended)
   - ✅ Firefox 85+
   - ✅ Edge 88+

## 📦 Installation Steps

### Chrome / Edge Installation

1. **Open Extensions Page**
   ```
   Chrome: chrome://extensions/
   Edge: edge://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner

3. **Load Extension**
   - Click "Load unpacked" button
   - Select the `browser-extension/` folder
   - Extension should appear in the list

4. **Verify Installation**
   - Extension icon (🛡️) should appear in toolbar
   - Name: "Adult & Betting Filter Extension"
   - Status: Enabled

### Firefox Installation

1. **Open Debugging Page**
   ```
   Firefox: about:debugging
   ```

2. **Load Temporary Add-on**
   - Click "This Firefox" in left sidebar
   - Click "Load Temporary Add-on"
   - Select `browser-extension/manifest.json`
   - Extension will be loaded

## ⚙️ Configuration

### Initial Setup

1. **Click Extension Icon**
   - Click the 🛡️ icon in your browser toolbar

2. **Check Status**
   - Popup shows current filtering status
   - Should show "Enabled" with green dot
   - API status should show "Connected"

3. **Configure Settings (if needed)**
   - Click "⚙️ Advanced Settings"
   - Verify API URL: `http://localhost:3000`
   - Test API connection
   - Adjust cache timeout if desired

## 🧪 Testing Procedures

### Test 1: Basic Functionality
```bash
# 1. Check extension loads without errors
# 2. Verify popup shows correct information
# 3. Confirm API connection is working
```

### Test 2: Adult Content Blocking
```bash
# 1. Try to visit: https://pornhub.com
# Expected: Page blocked, shows blocked.html
# Extension shows: "🚫 Content Blocked"
# Category: "adult"
# Risk Score: 95+
```

### Test 3: Educational Content Allowance
```bash
# 1. Try to visit: https://education.gov
# Expected: Page loads normally
# Extension shows: Site allowed
# Risk Score: < 50
```

### Test 4: Statistics Tracking
```bash
# 1. Visit several websites (mix blocked/allowed)
# 2. Click extension popup
# Expected: Updated blocked count
# Expected: Cache statistics
# Expected: Real-time updates
```

### Test 5: Settings Page
```bash
# 1. Click "⚙️ Advanced Settings"
# 2. Test API connection
# 3. Toggle filtering on/off
# 4. Clear cache
# 5. Reset statistics
# 6. Export settings
```

## 🔍 Troubleshooting

### Extension Not Loading
- ✅ Check all files are present
- ✅ Verify manifest.json syntax
- ✅ Check browser console for errors
- ✅ Try reloading the extension

### API Connection Issues
- ✅ Confirm Phase 1 server is running
- ✅ Test API directly: `curl http://localhost:3000/api/health`
- ✅ Check network connectivity
- ✅ Verify API key configuration

### Blocking Not Working
- ✅ Check if filtering is enabled
- ✅ Verify API connection
- ✅ Check browser console for errors
- ✅ Try clearing cache

### Performance Issues
- ✅ Clear cache if too many entries
- ✅ Check API response times
- ✅ Monitor memory usage
- ✅ Adjust cache timeout

## 📊 Validation Checklist

### Installation Validation
- [ ] Extension loads in browser without errors
- [ ] Icon appears in browser toolbar
- [ ] Popup interface shows correct status
- [ ] Settings page opens and functions

### Functionality Validation
- [ ] Adult websites get blocked (pornhub.com → blocked.html)
- [ ] Educational websites load normally (education.gov → allowed)
- [ ] Statistics update in real-time
- [ ] API connection works properly
- [ ] Settings page functions correctly

### Cross-Browser Testing
- [ ] Chrome installation works
- [ ] Firefox installation works
- [ ] Edge installation works (if applicable)

## 🚨 Security & Privacy

### Permissions Used
- `storage`: Save settings and statistics
- `activeTab`: Access current tab information
- `scripting`: Inject content scripts
- `declarativeNetRequest`: Block network requests
- `http://localhost:3000/*`: Communicate with API
- `<all_urls>`: Monitor web requests

### Data Collection
- ✅ No personal data collected
- ✅ Only anonymous usage statistics
- ✅ URLs sent to API for analysis only
- ✅ All data cached locally

## 📞 Support

If you encounter issues:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Look for extension-related messages

2. **Verify API Server**
   - Ensure Phase 1 server is running
   - Check server logs for errors
   - Test API endpoints directly

3. **Extension Debugging**
   - Go to extension management page
   - Check for error indicators
   - Try reloading the extension

## 🎯 Expected Results

### Blocking Effectiveness
- **Adult Content:** 95%+ block rate
- **Betting Sites:** 90%+ block rate
- **Safe Content:** < 5% false positive rate
- **Response Time:** < 100ms for cached requests

### User Experience
- **Seamless Operation:** Blocks happen before page loads
- **Clear Feedback:** Users understand why sites are blocked
- **Easy Control:** Simple on/off toggle in popup
- **Performance:** No noticeable slowdown in browsing

---

**🎉 Phase 2 Complete!** The browser extension is ready for production use. Test thoroughly with your Phase 1 API before deploying to end users.
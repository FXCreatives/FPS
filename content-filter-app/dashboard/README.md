# 🛡️ Content Filter - Web Dashboard

## Overview

A professional, masculine-styled web dashboard for managing and monitoring your content filtering system. Built with modern web technologies and real-time updates.

## Features

### 📊 System Overview
- **Real-time Statistics**: Live updates of blocked sites, active users, and system status
- **Activity Monitoring**: Recent blocking activity and user actions
- **System Health**: API connectivity and service status

### 📈 Analytics & Reporting
- **Interactive Charts**: Visual representation of blocking trends
- **Site Statistics**: Top blocked sites and categories
- **Export Capabilities**: Generate reports for any time period
- **Data Visualization**: Modern charts with Chart.js

### 👥 User Management
- **User Administration**: Add, edit, and manage users
- **Activity Tracking**: Monitor user filtering activity
- **Permission Control**: Manage user access levels
- **Search & Filter**: Find users quickly

### ⚙️ System Settings
- **API Configuration**: Connect to your filtering API
- **Security Settings**: Authentication and session management
- **System Controls**: Enable/disable filtering features
- **Performance Tuning**: Cache and timeout settings

### 📋 System Logs
- **Real-time Logging**: Live system activity monitoring
- **Log Filtering**: Filter by level (Error, Warning, Info)
- **Search Functionality**: Find specific log entries
- **Export Options**: Download logs for analysis

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with masculine design theme
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome for professional iconography
- **Responsive**: Mobile-first responsive design

## File Structure

```
dashboard/
├── index.html          # Main dashboard page
├── styles.css          # Professional masculine styling
├── dashboard.js        # Main dashboard functionality
└── README.md          # This documentation
```

## Setup Instructions

### 1. Start Your API Server
```bash
cd content-filter-app
npm start
# or
node src/backend/main.ts
```

### 2. Open Dashboard
```bash
# Option 1: Direct file opening
open dashboard/index.html

# Option 2: Serve with local server
cd dashboard
python -m http.server 8000
# Then visit: http://localhost:8000
```

### 3. Configure API Connection
1. Open the dashboard
2. Navigate to **Settings** section
3. Enter your API URL: `http://localhost:3000`
4. Click **Test API Connection**
5. Save settings

## Usage Guide

### Navigation
- **Overview**: System statistics and recent activity
- **Analytics**: Charts and detailed reporting
- **Users**: User management and administration
- **Settings**: System configuration
- **Logs**: System monitoring and debugging

### Real-time Updates
- Dashboard automatically refreshes every 30 seconds
- Live statistics and activity monitoring
- Real-time user activity tracking

### Data Export
- Export analytics reports
- Download system logs
- Generate user activity reports

## API Integration

The dashboard expects the following API endpoints:

### Required Endpoints
- `GET /api/health` - System health check
- `GET /api/stats` - System statistics
- `GET /api/activity` - Recent activity
- `GET /api/users` - User management
- `POST /api/settings` - Update system settings

### Optional Endpoints
- `GET /api/analytics` - Detailed analytics data
- `GET /api/logs` - System logs
- `POST /api/users` - Create new users
- `DELETE /api/users/:id` - Delete users

## Customization

### Styling
- Modify `styles.css` for visual customization
- Dark blue/masculine theme can be adjusted
- Responsive breakpoints in CSS

### Functionality
- Extend `dashboard.js` for additional features
- Add new API endpoints in your backend
- Customize chart types and data visualization

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Edge 88+
- ✅ Safari 14+
- ✅ Mobile browsers

## Security Features

- **CSP Compliant**: Content Security Policy ready
- **XSS Protection**: Secure against cross-site scripting
- **Input Validation**: All user inputs validated
- **Error Handling**: Graceful error management

## Performance

- **Optimized Loading**: Fast initial load times
- **Efficient Updates**: Minimal data transfer
- **Caching Strategy**: Smart data caching
- **Responsive Design**: Works on all devices

## Troubleshooting

### Common Issues

1. **Dashboard not loading**
   - Ensure API server is running
   - Check browser console for errors
   - Verify file paths are correct

2. **Charts not displaying**
   - Ensure Chart.js is loaded
   - Check browser console for JavaScript errors
   - Verify canvas element exists

3. **API connection failed**
   - Confirm API server is running on correct port
   - Check CORS settings if needed
   - Verify API endpoints are accessible

### Debug Mode
Open browser console and check for:
- API connection status
- JavaScript errors
- Network requests

## Development

### Adding New Features
1. Update HTML structure in `index.html`
2. Add styles to `styles.css`
3. Implement functionality in `dashboard.js`
4. Test thoroughly before deployment

### API Development
When adding new endpoints:
1. Update backend API routes
2. Add frontend API calls in dashboard
3. Update UI to display new data
4. Test end-to-end functionality

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API server connectivity
3. Review dashboard logs
4. Check network tab for failed requests

---

**🎉 Web Dashboard Complete!** Ready to manage your content filtering system with professional analytics and monitoring capabilities.
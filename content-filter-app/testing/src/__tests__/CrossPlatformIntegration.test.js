const ContentFilterEngine = require('../../platforms/desktop/src/ContentFilterEngine');
const puppeteer = require('puppeteer');

describe('Cross-Platform Integration Tests', () => {
    let browser;
    let engine;

    beforeAll(async () => {
        // Start browser for extension testing
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        // Initialize content filter engine
        engine = new ContentFilterEngine({
            databasePath: ':memory:',
            apiUrl: 'http://localhost:3000'
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (engine) {
            engine.cleanup();
        }
    });

    describe('Browser Extension Integration', () => {
        test('should load extension without errors', async () => {
            const page = await browser.newPage();

            // Load extension popup
            await page.goto('file://' + process.cwd() + '/../browser-extension/popup.html');

            // Check if extension loads
            const title = await page.title();
            expect(title).toBe('Content Filter');

            // Check if elements are present
            const statusElement = await page.$('#statusText');
            expect(statusElement).toBeTruthy();

            await page.close();
        });

        test('should block adult content URLs', async () => {
            const adultUrls = [
                'https://pornhub.com',
                'https://xvideos.com',
                'https://xhamster.com'
            ];

            for (const url of adultUrls) {
                const shouldBlock = engine.shouldBlockUrl(url);
                expect(shouldBlock).toBe(true);
            }
        });

        test('should allow safe content URLs', async () => {
            const safeUrls = [
                'https://google.com',
                'https://github.com',
                'https://stackoverflow.com'
            ];

            for (const url of safeUrls) {
                const shouldBlock = engine.shouldBlockUrl(url);
                expect(shouldBlock).toBe(false);
            }
        });
    });

    describe('API Integration', () => {
        test('should handle API communication', async () => {
            // Test API health check
            const healthResponse = await fetch('http://localhost:3000/api/health');
            expect(healthResponse.status).toBe(200);

            const healthData = await healthResponse.json();
            expect(healthData.status).toBe('healthy');
        });

        test('should handle content categorization', async () => {
            const testUrl = 'https://pornhub.com/video/123';

            const categorizeResponse = await fetch('http://localhost:3000/api/categorize?url=' + encodeURIComponent(testUrl));
            expect(categorizeResponse.status).toBe(200);

            const categorizeData = await categorizeResponse.json();
            expect(categorizeData).toHaveProperty('success');
        });
    });

    describe('Database Integration', () => {
        test('should store and retrieve blocked sites', async () => {
            // Add blocked site
            const testUrl = 'https://test-adult-site.com';
            const result = engine.addBlockedSite(testUrl, 'Test block');

            expect(result).toBe(true);

            // Retrieve blocked sites
            const recentSites = engine.getRecentBlockedSites(10);
            expect(recentSites.length).toBeGreaterThan(0);

            const foundSite = recentSites.find(site => site.url === testUrl);
            expect(foundSite).toBeTruthy();
        });

        test('should track blocking statistics', async () => {
            const initialStats = engine.getStats();

            // Block a few sites
            engine.addBlockedSite('https://test1.com', 'Test 1');
            engine.addBlockedSite('https://test2.com', 'Test 2');

            const newStats = engine.getStats();
            expect(newStats.totalBlocked).toBe(initialStats.totalBlocked + 2);
        });
    });

    describe('Real-time Updates', () => {
        test('should handle real-time blocking events', async () => {
            const testUrl = 'https://beeg.com/video/123';

            // Simulate real-time blocking
            const shouldBlock = engine.shouldBlockUrl(testUrl);
            expect(shouldBlock).toBe(true);

            // Add to blocked sites
            engine.addBlockedSite(testUrl, 'Real-time block');

            const stats = engine.getStats();
            expect(stats.totalBlocked).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            // Test with invalid API URL
            const invalidEngine = new ContentFilterEngine({
                apiUrl: 'http://invalid-url-12345.com'
            });

            const result = await invalidEngine.testApiConnection();
            expect(result.success).toBe(false);

            invalidEngine.cleanup();
        });

        test('should handle database errors gracefully', async () => {
            // Test with invalid database path
            const invalidEngine = new ContentFilterEngine({
                databasePath: '/invalid/path/database.db'
            });

            expect(invalidEngine).toBeDefined();
            invalidEngine.cleanup();
        });
    });

    describe('Performance', () => {
        test('should handle large blocklists efficiently', () => {
            const startTime = Date.now();

            // Test blocking check with large list
            for (let i = 0; i < 1000; i++) {
                const testUrl = `https://test-site-${i}.com`;
                engine.shouldBlockUrl(testUrl);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (less than 1 second)
            expect(duration).toBeLessThan(1000);
        });

        test('should handle concurrent requests', async () => {
            const promises = [];

            // Create multiple concurrent blocking checks
            for (let i = 0; i < 100; i++) {
                const promise = new Promise((resolve) => {
                    const shouldBlock = engine.shouldBlockUrl(`https://test-${i}.com`);
                    resolve(shouldBlock);
                });
                promises.push(promise);
            }

            const results = await Promise.all(promises);
            expect(results.length).toBe(100);
        });
    });

    describe('Security', () => {
        test('should validate input data', () => {
            const maliciousUrls = [
                'javascript:alert("xss")',
                '<script>alert("xss")</script>',
                'data:text/html,<script>alert("xss")</script>',
                '../../../etc/passwd'
            ];

            maliciousUrls.forEach(url => {
                // Should not throw errors
                expect(() => engine.shouldBlockUrl(url)).not.toThrow();
            });
        });

        test('should prevent SQL injection in database operations', () => {
            const maliciousInput = "'; DROP TABLE blocked_sites; --";

            // Should not throw errors
            expect(() => {
                engine.addBlockedSite(`https://${maliciousInput}.com`, 'Test');
            }).not.toThrow();
        });
    });
});
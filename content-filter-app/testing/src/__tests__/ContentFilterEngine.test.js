const ContentFilterEngine = require('../../platforms/desktop/src/ContentFilterEngine');

describe('ContentFilterEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new ContentFilterEngine({
            databasePath: ':memory:',
            apiUrl: 'http://localhost:3000'
        });
    });

    afterEach(() => {
        if (engine) {
            engine.cleanup();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(engine).toBeDefined();
            expect(engine.isEnabled).toBe(true);
            expect(engine.apiUrl).toBe('http://localhost:3000');
        });

        test('should initialize with custom options', () => {
            const customEngine = new ContentFilterEngine({
                apiUrl: 'http://custom-api.com'
            });

            expect(customEngine.apiUrl).toBe('http://custom-api.com');
            customEngine.cleanup();
        });
    });

    describe('URL Blocking', () => {
        test('should block adult content URLs', () => {
            const adultUrls = [
                'https://pornhub.com/video/123',
                'https://xvideos.com/video/456',
                'https://xhamster.com/video/789'
            ];

            adultUrls.forEach(url => {
                expect(engine.shouldBlockUrl(url)).toBe(true);
            });
        });

        test('should allow safe content URLs', () => {
            const safeUrls = [
                'https://google.com',
                'https://github.com',
                'https://stackoverflow.com',
                'https://education.gov'
            ];

            safeUrls.forEach(url => {
                expect(engine.shouldBlockUrl(url)).toBe(false);
            });
        });

        test('should handle invalid URLs gracefully', () => {
            const invalidUrls = [
                'not-a-url',
                '',
                null,
                undefined
            ];

            invalidUrls.forEach(url => {
                expect(() => engine.shouldBlockUrl(url)).not.toThrow();
                expect(engine.shouldBlockUrl(url)).toBe(false);
            });
        });
    });

    describe('Domain Blocking', () => {
        test('should block exact domain matches', () => {
            expect(engine.isDomainBlocked('pornhub.com')).toBe(true);
            expect(engine.isDomainBlocked('xvideos.com')).toBe(true);
        });

        test('should block subdomain matches', () => {
            expect(engine.isDomainBlocked('www.pornhub.com')).toBe(true);
            expect(engine.isDomainBlocked('mobile.xvideos.com')).toBe(true);
        });

        test('should not block safe domains', () => {
            expect(engine.isDomainBlocked('google.com')).toBe(false);
            expect(engine.isDomainBlocked('github.com')).toBe(false);
        });
    });

    describe('Settings Management', () => {
        test('should start and stop filtering', () => {
            expect(engine.isEnabled).toBe(true);

            engine.stop();
            expect(engine.isEnabled).toBe(false);

            engine.start();
            expect(engine.isEnabled).toBe(true);
        });

        test('should update API URL', () => {
            const newUrl = 'http://new-api.com';
            engine.updateApiUrl(newUrl);
            expect(engine.apiUrl).toBe(newUrl);
        });
    });

    describe('Statistics', () => {
        test('should track blocked sites', () => {
            const initialStats = engine.getStats();
            const initialCount = initialStats.totalBlocked;

            // Block a site
            engine.addBlockedSite('https://test.com', 'Test block');

            const newStats = engine.getStats();
            expect(newStats.totalBlocked).toBe(initialCount + 1);
        });

        test('should get recent blocked sites', () => {
            // Add some blocked sites
            engine.addBlockedSite('https://test1.com', 'Test 1');
            engine.addBlockedSite('https://test2.com', 'Test 2');

            const recentSites = engine.getRecentBlockedSites(10);
            expect(recentSites.length).toBeGreaterThan(0);
        });
    });

    describe('API Integration', () => {
        test('should test API connection', async () => {
            const result = await engine.testApiConnection();

            // Since we're using a mock URL, this might fail
            // but it should not throw an error
            expect(typeof result.success).toBe('boolean');
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors gracefully', () => {
            // Test with invalid database path
            const invalidEngine = new ContentFilterEngine({
                databasePath: '/invalid/path/database.db'
            });

            expect(invalidEngine).toBeDefined();
            invalidEngine.cleanup();
        });

        test('should handle network errors gracefully', async () => {
            const invalidEngine = new ContentFilterEngine({
                apiUrl: 'http://invalid-url-12345.com'
            });

            const result = await invalidEngine.testApiConnection();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            invalidEngine.cleanup();
        });
    });
});
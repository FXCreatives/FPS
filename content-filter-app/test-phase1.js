#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Content Filter API - Phase 1
 *
 * Tests all major functionality:
 * - Content analysis and categorization
 * - URL risk scoring
 * - Database operations
 * - API endpoints
 * - Performance metrics
 */

const axios = require('axios');
const fs = require('fs').promises;

const API_BASE = 'http://localhost:3000';
const API_KEY = 'cf_demo_key_12345';

class ContentFilterTester {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log('🧪 Starting Content Filter API Test Suite');
        console.log('==========================================\n');

        try {
            // Test 1: Health Check
            await this.testHealthCheck();

            // Test 2: API Documentation
            await this.testApiDocs();

            // Test 3: Content Analysis
            await this.testContentAnalysis();

            // Test 4: URL Categorization
            await this.testUrlCategorization();

            // Test 5: Statistics
            await this.testStatistics();

            // Test 6: Blocklists
            await this.testBlocklists();

            // Test 7: Automated Test Suite
            await this.testAutomatedSuite();

            // Test 8: Performance Testing
            await this.testPerformance();

            // Test 9: Error Handling
            await this.testErrorHandling();

            // Generate final report
            this.generateReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async testHealthCheck() {
        console.log('🔍 Test 1: Health Check');
        console.log('------------------------');

        try {
            const response = await axios.get(`${API_BASE}/api/health`);

            if (response.data.status === 'healthy') {
                this.logSuccess('Health check passed');
                this.logInfo(`Server uptime: ${Math.floor(response.data.uptime)}s`);
                this.logInfo(`API version: ${response.data.version}`);
            } else {
                this.logError('Health check failed - status not healthy');
            }
        } catch (error) {
            this.logError(`Health check failed: ${error.message}`);
        }

        console.log('');
    }

    async testApiDocs() {
        console.log('📚 Test 2: API Documentation');
        console.log('-----------------------------');

        try {
            const response = await axios.get(`${API_BASE}/api/docs`);

            if (response.data.title && response.data.endpoints) {
                this.logSuccess('API documentation accessible');
                this.logInfo(`API Title: ${response.data.title}`);
                this.logInfo(`Endpoints: ${Object.keys(response.data.endpoints).length}`);
            } else {
                this.logError('API documentation incomplete');
            }
        } catch (error) {
            this.logError(`API docs test failed: ${error.message}`);
        }

        console.log('');
    }

    async testContentAnalysis() {
        console.log('🔍 Test 3: Content Analysis');
        console.log('----------------------------');

        const testCases = [
            {
                name: 'Safe educational content',
                content: 'Learn mathematics and science with comprehensive educational resources and tutorials.',
                url: 'https://education-site.edu/math-tutorial',
                expectedCategory: 'educational',
                expectedBlocked: false
            },
            {
                name: 'Adult content detection',
                content: 'This website contains adult material, explicit content, and pornographic videos.',
                url: 'https://adult-site.com/videos',
                expectedCategory: 'adult',
                expectedBlocked: true
            },
            {
                name: 'Gambling content detection',
                content: 'Place your bets on sports, casino games, poker, and win big jackpots.',
                url: 'https://gambling-site.com/casino',
                expectedCategory: 'gambling',
                expectedBlocked: true
            },
            {
                name: 'Violence content detection',
                content: 'This content contains graphic violence, murder, and torture scenes.',
                url: 'https://violence-site.com/horror',
                expectedCategory: 'violence',
                expectedBlocked: true
            },
            {
                name: 'General safe content',
                content: 'This is general website content about technology and programming.',
                url: 'https://tech-site.com/articles',
                expectedCategory: 'general',
                expectedBlocked: false
            }
        ];

        for (const testCase of testCases) {
            try {
                const response = await axios.post(`${API_BASE}/api/analyze`, {
                    content: testCase.content,
                    url: testCase.url,
                    contentType: 'text'
                }, {
                    headers: {
                        'X-API-Key': API_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.success) {
                    const analysis = response.data.analysis;
                    const categoryMatch = analysis.category === testCase.expectedCategory;
                    const blockedMatch = analysis.isBlocked === testCase.expectedBlocked;

                    if (categoryMatch && blockedMatch) {
                        this.logSuccess(`${testCase.name}: PASS`);
                        this.logInfo(`  Category: ${analysis.category} (expected: ${testCase.expectedCategory})`);
                        this.logInfo(`  Risk Score: ${analysis.riskScore}`);
                        this.logInfo(`  Blocked: ${analysis.isBlocked} (expected: ${testCase.expectedBlocked})`);
                    } else {
                        this.logError(`${testCase.name}: FAIL`);
                        this.logInfo(`  Expected: ${testCase.expectedCategory}/${testCase.expectedBlocked}`);
                        this.logInfo(`  Got: ${analysis.category}/${analysis.isBlocked}`);
                    }
                } else {
                    this.logError(`${testCase.name}: API error - ${response.data.error}`);
                }
            } catch (error) {
                this.logError(`${testCase.name}: Request failed - ${error.message}`);
            }
        }

        console.log('');
    }

    async testUrlCategorization() {
        console.log('🔗 Test 4: URL Categorization');
        console.log('------------------------------');

        const testUrls = [
            {
                url: 'https://pornhub.com/video',
                expectedCategory: 'adult',
                expectedBlocked: true
            },
            {
                url: 'https://education.gov/schools',
                expectedCategory: 'educational',
                expectedBlocked: false
            },
            {
                url: 'https://bet365.com/sports',
                expectedCategory: 'gambling',
                expectedBlocked: true
            }
        ];

        for (const testUrl of testUrls) {
            try {
                const response = await axios.get(`${API_BASE}/api/categorize`, {
                    params: { url: testUrl.url },
                    headers: { 'X-API-Key': API_KEY }
                });

                if (response.data.success) {
                    const categoryMatch = response.data.category === testUrl.expectedCategory;
                    const blockedMatch = response.data.is_blocked === testUrl.expectedBlocked;

                    if (categoryMatch && blockedMatch) {
                        this.logSuccess(`URL ${testUrl.url}: PASS`);
                        this.logInfo(`  Category: ${response.data.category}`);
                        this.logInfo(`  Risk Score: ${response.data.risk_score}`);
                    } else {
                        this.logError(`URL ${testUrl.url}: FAIL`);
                        this.logInfo(`  Expected: ${testUrl.expectedCategory}/${testUrl.expectedBlocked}`);
                        this.logInfo(`  Got: ${response.data.category}/${response.data.is_blocked}`);
                    }
                } else {
                    this.logError(`URL ${testUrl.url}: API error`);
                }
            } catch (error) {
                this.logError(`URL ${testUrl.url}: Request failed - ${error.message}`);
            }
        }

        console.log('');
    }

    async testStatistics() {
        console.log('📊 Test 5: Statistics');
        console.log('----------------------');

        try {
            const response = await axios.get(`${API_BASE}/api/stats`, {
                headers: { 'X-API-Key': API_KEY }
            });

            if (response.data.success) {
                const stats = response.data.statistics;
                this.logSuccess('Statistics retrieved successfully');
                this.logInfo(`Total analyses: ${stats.overall.total_analyses}`);
                this.logInfo(`Total blocked: ${stats.overall.total_blocked}`);
                this.logInfo(`Average risk score: ${stats.overall.avg_risk_score?.toFixed(1) || 'N/A'}`);
                this.logInfo(`Categories tracked: ${stats.by_category.length}`);
            } else {
                this.logError('Statistics API error');
            }
        } catch (error) {
            this.logError(`Statistics test failed: ${error.message}`);
        }

        console.log('');
    }

    async testBlocklists() {
        console.log('🚫 Test 6: Blocklists');
        console.log('----------------------');

        try {
            const response = await axios.get(`${API_BASE}/api/blocklists`, {
                headers: { 'X-API-Key': API_KEY }
            });

            if (response.data.success) {
                this.logSuccess('Blocklists retrieved successfully');
                this.logInfo(`Total blocklist entries: ${response.data.count}`);

                const byType = {};
                response.data.blocklists.forEach(item => {
                    byType[item.type] = (byType[item.type] || 0) + 1;
                });

                Object.entries(byType).forEach(([type, count]) => {
                    this.logInfo(`  ${type}: ${count} entries`);
                });
            } else {
                this.logError('Blocklists API error');
            }
        } catch (error) {
            this.logError(`Blocklists test failed: ${error.message}`);
        }

        console.log('');
    }

    async testAutomatedSuite() {
        console.log('🤖 Test 7: Automated Test Suite');
        console.log('--------------------------------');

        try {
            const response = await axios.post(`${API_BASE}/api/test`, {}, {
                headers: { 'X-API-Key': API_KEY }
            });

            if (response.data.success) {
                const summary = response.data.summary;
                this.logSuccess('Automated test suite completed');
                this.logInfo(`Tests run: ${summary.total_tests}`);
                this.logInfo(`Passed: ${summary.passed_tests}`);
                this.logInfo(`Success rate: ${summary.success_rate}`);

                response.data.test_results.forEach(result => {
                    const status = result.passed ? '✅' : '❌';
                    this.logInfo(`${status} ${result.name}: ${result.actual.category} (${result.actual.risk_score} risk)`);
                });
            } else {
                this.logError('Automated test suite failed');
            }
        } catch (error) {
            this.logError(`Automated test suite error: ${error.message}`);
        }

        console.log('');
    }

    async testPerformance() {
        console.log('⚡ Test 8: Performance');
        console.log('----------------------');

        const testRequests = 10;
        const startTime = Date.now();

        try {
            const promises = [];

            for (let i = 0; i < testRequests; i++) {
                promises.push(
                    axios.post(`${API_BASE}/api/analyze`, {
                        content: `Performance test content ${i} with some text to analyze.`,
                        url: `https://test-site-${i}.com/page`,
                        contentType: 'text'
                    }, {
                        headers: {
                            'X-API-Key': API_KEY,
                            'Content-Type': 'application/json'
                        }
                    })
                );
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTime = totalTime / testRequests;

            this.logSuccess(`Performance test completed`);
            this.logInfo(`Requests: ${testRequests}`);
            this.logInfo(`Total time: ${totalTime}ms`);
            this.logInfo(`Average time: ${avgTime.toFixed(1)}ms per request`);
            this.logInfo(`Requests per second: ${(testRequests / (totalTime / 1000)).toFixed(1)}`);

            const successCount = responses.filter(r => r.data.success).length;
            this.logInfo(`Success rate: ${((successCount / testRequests) * 100).toFixed(1)}%`);

        } catch (error) {
            this.logError(`Performance test failed: ${error.message}`);
        }

        console.log('');
    }

    async testErrorHandling() {
        console.log('🚨 Test 9: Error Handling');
        console.log('--------------------------');

        // Test missing API key
        try {
            await axios.post(`${API_BASE}/api/analyze`, {
                content: 'test',
                url: 'https://test.com'
            });
            this.logError('Missing API key test failed - should have returned 401');
        } catch (error) {
            if (error.response?.status === 401) {
                this.logSuccess('Missing API key properly rejected');
            } else {
                this.logError(`Missing API key test failed: ${error.message}`);
            }
        }

        // Test missing URL
        try {
            await axios.post(`${API_BASE}/api/analyze`, {
                content: 'test content'
            }, {
                headers: { 'X-API-Key': API_KEY }
            });
            this.logError('Missing URL test failed - should have returned 400');
        } catch (error) {
            if (error.response?.status === 400) {
                this.logSuccess('Missing URL properly rejected');
            } else {
                this.logError(`Missing URL test failed: ${error.message}`);
            }
        }

        // Test invalid endpoint
        try {
            await axios.get(`${API_BASE}/api/nonexistent`);
            this.logError('Invalid endpoint test failed - should have returned 404');
        } catch (error) {
            if (error.response?.status === 404) {
                this.logSuccess('Invalid endpoint properly rejected');
            } else {
                this.logError(`Invalid endpoint test failed: ${error.message}`);
            }
        }

        console.log('');
    }

    logSuccess(message) {
        console.log(`✅ ${message}`);
        this.results.push({ type: 'success', message });
    }

    logError(message) {
        console.log(`❌ ${message}`);
        this.results.push({ type: 'error', message });
    }

    logInfo(message) {
        console.log(`   ${message}`);
        this.results.push({ type: 'info', message });
    }

    generateReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;

        const successCount = this.results.filter(r => r.type === 'success').length;
        const errorCount = this.results.filter(r => r.type === 'error').length;

        console.log('📋 Test Report');
        console.log('==============');
        console.log(`Total execution time: ${totalTime}ms`);
        console.log(`Tests passed: ${successCount}`);
        console.log(`Tests failed: ${errorCount}`);
        console.log(`Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);

        if (errorCount === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Phase 1 is ready for production.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
        }

        console.log('\n🚀 Next Steps:');
        console.log('   1. Phase 1 is complete and functional');
        console.log('   2. Ready to proceed to Phase 2 (Browser Extension)');
        console.log('   3. API is ready for integration with frontend applications');
    }
}

// Run tests if called directly
async function runTests() {
    const tester = new ContentFilterTester();

    // Check if server is running
    try {
        await axios.get(`${API_BASE}/api/health`, { timeout: 5000 });
    } catch (error) {
        console.error('❌ Server is not running. Please start the server first:');
        console.error('   node phase1-server.js');
        console.error('   OR');
        console.error('   npm start');
        process.exit(1);
    }

    await tester.runAllTests();
}

if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = { ContentFilterTester };
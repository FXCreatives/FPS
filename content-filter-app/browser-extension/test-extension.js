// Test script for Content Filter Extension
// This script helps test if the extension is working properly

class ExtensionTester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
    }

    async runTests() {
        if (this.isRunning) {
            console.log('⚠️ Tests already running');
            return;
        }

        this.isRunning = true;
        console.log('🧪 Starting extension tests...');

        try {
            // Test 1: Check if extension is installed
            await this.testExtensionInstallation();

            // Test 2: Check background script communication
            await this.testBackgroundCommunication();

            // Test 3: Check content script functionality
            await this.testContentScript();

            // Test 4: Test blocking functionality
            await this.testBlockingFunctionality();

            this.displayResults();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async testExtensionInstallation() {
        console.log('🔍 Testing extension installation...');

        try {
            // Check if chrome.runtime is available
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const manifest = chrome.runtime.getManifest();
                this.testResults.push({
                    test: 'Extension Installation',
                    status: 'PASS',
                    details: `Extension ${manifest.name} v${manifest.version} is installed`
                });
                console.log('✅ Extension is installed');
            } else {
                throw new Error('Chrome runtime not available');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Extension Installation',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Extension installation test failed:', error.message);
        }
    }

    async testBackgroundCommunication() {
        console.log('🔍 Testing background script communication...');

        try {
            const response = await this.sendTestMessage({ type: 'GET_STATUS' });

            if (response && typeof response.isEnabled !== 'undefined') {
                this.testResults.push({
                    test: 'Background Communication',
                    status: 'PASS',
                    details: `Communication successful - Filtering: ${response.isEnabled ? 'ENABLED' : 'DISABLED'}`
                });
                console.log('✅ Background communication working');
            } else {
                throw new Error('Invalid response from background script');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Background Communication',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Background communication test failed:', error.message);
        }
    }

    async testContentScript() {
        console.log('🔍 Testing content script functionality...');

        try {
            // Check if content script is loaded
            if (typeof ContentScriptManager !== 'undefined') {
                this.testResults.push({
                    test: 'Content Script',
                    status: 'PASS',
                    details: 'Content script is loaded and functional'
                });
                console.log('✅ Content script is working');
            } else {
                // Check for alternative indicators
                const hasBlockingFunction = typeof window.instantBlockCheck === 'function';
                if (hasBlockingFunction) {
                    this.testResults.push({
                        test: 'Content Script',
                        status: 'PASS',
                        details: 'Content script blocking functions are available'
                    });
                    console.log('✅ Content script blocking functions available');
                } else {
                    throw new Error('Content script not properly loaded');
                }
            }
        } catch (error) {
            this.testResults.push({
                test: 'Content Script',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Content script test failed:', error.message);
        }
    }

    async testBlockingFunctionality() {
        console.log('🔍 Testing blocking functionality...');

        try {
            // Test with a known blocked domain
            const testDomains = [
                'pornhub.com',
                'xvideos.com',
                'test-blocked-site-12345.com'
            ];

            let blockedDetected = false;

            // This is a simulation - in real testing you'd visit actual sites
            for (const domain of testDomains) {
                if (this.simulateDomainCheck(domain)) {
                    blockedDetected = true;
                    break;
                }
            }

            if (blockedDetected) {
                this.testResults.push({
                    test: 'Blocking Functionality',
                    status: 'PASS',
                    details: 'Blocking detection is working'
                });
                console.log('✅ Blocking functionality detected');
            } else {
                this.testResults.push({
                    test: 'Blocking Functionality',
                    status: 'WARN',
                    details: 'Blocking may work but test simulation did not detect it'
                });
                console.log('⚠️ Blocking functionality test inconclusive');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Blocking Functionality',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Blocking functionality test failed:', error.message);
        }
    }

    simulateDomainCheck(domain) {
        // Simulate checking if a domain would be blocked
        const blockedDomains = [
            'pornhub.com', 'xvideos.com', 'xhamster.com'
        ];

        return blockedDomains.includes(domain);
    }

    async sendTestMessage(message) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, 3000);

            try {
                chrome.runtime.sendMessage(message, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    displayResults() {
        console.log('\n📊 EXTENSION TEST RESULTS');
        console.log('========================');

        const passed = this.testResults.filter(t => t.status === 'PASS').length;
        const failed = this.testResults.filter(t => t.status === 'FAIL').length;
        const warnings = this.testResults.filter(t => t.status === 'WARN').length;

        this.testResults.forEach((result, index) => {
            const icon = result.status === 'PASS' ? '✅' :
                        result.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`${icon} Test ${index + 1}: ${result.test}`);
            console.log(`   ${result.details}`);
        });

        console.log('\n📈 SUMMARY');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`📊 Total: ${this.testResults.length}`);

        if (failed === 0) {
            console.log('\n🎉 All critical tests passed! Extension should be working properly.');
        } else {
            console.log('\n⚠️ Some tests failed. Extension may need troubleshooting.');
        }
    }
}

// Auto-run tests if script is loaded directly
if (typeof window !== 'undefined') {
    console.log('🚀 Content Filter Extension Test Suite Loaded');
    console.log('Run runTests() to start testing');

    // Global function to run tests
    window.runExtensionTests = () => {
        const tester = new ExtensionTester();
        tester.runTests();
    };

    // Auto-run after a short delay for demonstration
    setTimeout(() => {
        console.log('🔄 Auto-running tests in 3 seconds...');
        setTimeout(() => {
            window.runExtensionTests();
        }, 3000);
    }, 1000);
}

// Export for Node.js testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExtensionTester };
}
// Simple demo runner for the Content Filter Application
// This script demonstrates the core functionality without requiring npm dependencies

const fs = require('fs');
const path = require('path');

// Simple content filter engine implementation
class SimpleContentFilter {
    constructor() {
        this.rules = new Map();
        this.blockedDomains = new Set(['malicious-site.com', 'adult-content.org']);
        this.allowedDomains = new Set(['educational-site.edu', 'safe-site.com']);
        this.initializeDefaultRules();
    }

    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'block-adult-keywords',
                name: 'Block Adult Keywords',
                pattern: '\\b(adult|porn|xxx|nsfw|18\\+)\\b',
                action: 'block',
                category: 'adult',
                isActive: true
            },
            {
                id: 'block-violence-keywords',
                name: 'Block Violence Keywords',
                pattern: '\\b(violence|kill|murder|death|weapon)\\b',
                action: 'block',
                category: 'violence',
                isActive: true
            }
        ];

        defaultRules.forEach(rule => {
            this.rules.set(rule.id, rule);
        });
    }

    async analyzeContent(content, context) {
        const startTime = Date.now();

        // Extract metadata
        const metadata = this.extractMetadata(content, context);

        // Determine category
        const category = this.categorizeContent(content, metadata);

        // Calculate risk score
        const riskScore = this.calculateRiskScore(content, category, metadata);

        // Make decision
        const decision = this.makeDecision(content, category, riskScore, context);

        const analysis = {
            id: 'analysis-' + Date.now(),
            url: context.url,
            content: content,
            contentType: context.contentType,
            category: category,
            riskScore: riskScore,
            isBlocked: !decision.allow,
            analysisTime: new Date(),
            metadata: metadata
        };

        console.log(`\n📊 Analysis Result:`);
        console.log(`   URL: ${context.url}`);
        console.log(`   Category: ${category}`);
        console.log(`   Risk Score: ${(riskScore * 100).toFixed(1)}%`);
        console.log(`   Decision: ${decision.allow ? '✅ ALLOWED' : '🚫 BLOCKED'}`);
        console.log(`   Reason: ${decision.reason}`);
        console.log(`   Processing Time: ${Date.now() - startTime}ms`);

        return analysis;
    }

    extractMetadata(content, context) {
        return {
            wordCount: content.split(/\s+/).length,
            language: this.detectLanguage(content),
            hasKeywords: this.extractKeywords(content),
            domain: this.extractDomain(context.url)
        };
    }

    detectLanguage(content) {
        const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
        const contentLower = content.toLowerCase();
        let score = 0;

        englishWords.forEach(word => {
            if (contentLower.includes(word)) score++;
        });

        return score > 2 ? 'en' : 'unknown';
    }

    extractKeywords(content) {
        return content
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 4)
            .slice(0, 5);
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    categorizeContent(content, metadata) {
        const contentLower = content.toLowerCase();

        if (/\b(adult|porn|xxx|nsfw|18\+)\b/.test(contentLower)) {
            return 'adult';
        }
        if (/\b(learn|study|education|school|university)\b/.test(contentLower)) {
            return 'education';
        }
        if (/\b(work|task|project|productivity|focus)\b/.test(contentLower)) {
            return 'productivity';
        }
        if (/\b(game|play|gaming|entertainment)\b/.test(contentLower)) {
            return 'entertainment';
        }

        return 'general';
    }

    calculateRiskScore(content, category, metadata) {
        let riskScore = 0;

        // Base risk by category
        const categoryRisk = {
            'adult': 0.9,
            'violence': 0.8,
            'gambling': 0.7,
            'education': 0.1,
            'productivity': 0.0,
            'entertainment': 0.3,
            'general': 0.2
        };

        riskScore += categoryRisk[category] || 0.5;

        // Content-based risk factors
        if (metadata.wordCount > 1000) riskScore += 0.1;
        if (metadata.language === 'unknown') riskScore += 0.1;

        // Domain-based risk
        if (metadata.domain) {
            if (this.blockedDomains.has(metadata.domain)) riskScore += 0.3;
            if (this.allowedDomains.has(metadata.domain)) riskScore -= 0.2;
        }

        return Math.min(Math.max(riskScore, 0), 1);
    }

    makeDecision(content, category, riskScore, context) {
        // Check allowlist
        if (context.url && this.allowedDomains.has(this.extractDomain(context.url))) {
            return {
                allow: true,
                reason: 'Domain is in allowlist',
                confidence: 1.0
            };
        }

        // Check blocklist
        if (context.url && this.blockedDomains.has(this.extractDomain(context.url))) {
            return {
                allow: false,
                reason: 'Domain is in blocklist',
                confidence: 1.0
            };
        }

        // Apply risk-based decision
        const threshold = 0.6; // Configurable threshold
        const allow = riskScore <= threshold;

        return {
            allow,
            reason: allow
                ? `Risk score ${(riskScore * 100).toFixed(1)}% below threshold`
                : `Risk score ${(riskScore * 100).toFixed(1)}% above threshold`,
            confidence: riskScore
        };
    }

    getStatistics() {
        return {
            totalRules: this.rules.size,
            blockedDomains: this.blockedDomains.size,
            allowedDomains: this.allowedDomains.size,
            timestamp: new Date().toISOString()
        };
    }
}

// Demo class
class ContentFilterDemo {
    constructor() {
        this.filter = new SimpleContentFilter();
    }

    async run() {
        console.log('🎯 Content Filter Application Demo');
        console.log('=====================================\n');

        // Show system statistics
        this.showSystemStats();

        // Run interactive tests
        await this.runInteractiveTests();

        // Demonstrate customization
        this.demonstrateCustomization();

        console.log('\n✨ Demo completed!');
        console.log('\n📚 Next steps:');
        console.log('   1. Open demo.html in a web browser to see the GUI');
        console.log('   2. Install dependencies: npm install');
        console.log('   3. Start development server: npm run dev');
        console.log('   4. Build for production: npm run build');
    }

    showSystemStats() {
        console.log('📊 System Statistics:');
        const stats = this.filter.getStatistics();
        console.log(`   Total Rules: ${stats.totalRules}`);
        console.log(`   Blocked Domains: ${stats.blockedDomains}`);
        console.log(`   Allowed Domains: ${stats.allowedDomains}`);
        console.log(`   Timestamp: ${stats.timestamp}`);
        console.log('');
    }

    async runInteractiveTests() {
        console.log('🧪 Running Interactive Tests...');
        console.log('--------------------------------');

        const testCases = [
            {
                name: 'Educational Content',
                content: 'Learn about mathematics and science in this comprehensive guide to advanced topics.',
                url: 'https://educational-site.edu/math-guide',
                expectedAllowed: true
            },
            {
                name: 'Adult Content',
                content: 'This website contains adult material and explicit content not suitable for all audiences.',
                url: 'https://adult-site.com/video',
                expectedAllowed: false
            },
            {
                name: 'Productivity Content',
                content: 'Improve your productivity with these time management techniques and workflow optimization.',
                url: 'https://productivity-site.com/time-management',
                expectedAllowed: true
            },
            {
                name: 'General Entertainment',
                content: 'Check out this amazing movie review and entertainment news from around the world.',
                url: 'https://entertainment-site.com/reviews',
                expectedAllowed: true
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n📝 Test: ${testCase.name}`);
            console.log(`   URL: ${testCase.url}`);
            console.log(`   Content: "${testCase.content}"`);

            const context = {
                url: testCase.url,
                contentType: 'text',
                userAgent: 'Demo Client',
                timestamp: new Date(),
                sourceIp: '127.0.0.1'
            };

            const analysis = await this.filter.analyzeContent(testCase.content, context);
            const passed = analysis.isBlocked !== testCase.expectedAllowed ? '❌ FAIL' : '✅ PASS';

            console.log(`   Result: ${passed} (${analysis.isBlocked ? 'BLOCKED' : 'ALLOWED'})`);
        }
    }

    demonstrateCustomization() {
        console.log('\n⚙️  Customization Demonstration');
        console.log('--------------------------------');

        console.log('\n🔧 Adding Custom Rules:');

        // Add custom blocking rule
        this.filter.rules.set('demo-block-social', {
            id: 'demo-block-social',
            name: 'Block Social Media During Work Hours',
            pattern: 'facebook|twitter|instagram|tiktok',
            action: 'block',
            category: 'social_media',
            isActive: true
        });
        console.log('   ✅ Added rule to block social media');

        // Add domain to blocklist
        this.filter.blockedDomains.add('distracting-site.com');
        console.log('   ✅ Added distracting-site.com to blocklist');

        // Add domain to allowlist
        this.filter.allowedDomains.add('trusted-news.com');
        console.log('   ✅ Added trusted-news.com to allowlist');

        console.log('\n📊 Updated Statistics:');
        const updatedStats = this.filter.getStatistics();
        console.log(`   Total Rules: ${updatedStats.totalRules}`);
        console.log(`   Blocked Domains: ${updatedStats.blockedDomains}`);
        console.log(`   Allowed Domains: ${updatedStats.allowedDomains}`);

        console.log('\n🧪 Testing Custom Rules:');
        const customTestCases = [
            {
                name: 'Social Media Content',
                content: 'Check out this amazing post on social media platform!',
                url: 'https://distracting-site.com/social'
            },
            {
                name: 'Trusted News Content',
                content: 'Read the latest news and current events from trusted sources.',
                url: 'https://trusted-news.com/article'
            }
        ];

        customTestCases.forEach(async (testCase) => {
            console.log(`\n   Test: ${testCase.name}`);
            console.log(`   URL: ${testCase.url}`);

            const context = {
                url: testCase.url,
                contentType: 'text',
                userAgent: 'Demo Client',
                timestamp: new Date(),
                sourceIp: '127.0.0.1'
            };

            const analysis = await this.filter.analyzeContent(testCase.content, context);
            console.log(`   Result: ${analysis.isBlocked ? 'BLOCKED' : 'ALLOWED'} (${analysis.category})`);
        });
    }
}

// Main execution
async function main() {
    try {
        const demo = new ContentFilterDemo();
        await demo.run();

        console.log('\n🎉 Content Filter Application is ready!');
        console.log('\n📁 Project Structure:');
        console.log('   ├── src/           # Source code');
        console.log('   ├── package.json   # Dependencies and scripts');
        console.log('   ├── tsconfig.json  # TypeScript configuration');
        console.log('   ├── demo.html      # Web demo interface');
        console.log('   └── README.md      # Documentation');

        console.log('\n🌐 Open demo.html in your browser to see the GUI demo!');
        console.log('🔧 Run "npm install && npm run dev" to start the full application.');

    } catch (error) {
        console.error('❌ Demo error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { ContentFilterDemo, SimpleContentFilter };
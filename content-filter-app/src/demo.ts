// Demo script to showcase the Content Filter Application
// This can run without npm dependencies for demonstration purposes

import { SimpleServer } from './backend/SimpleServer';
import { ContentFilterEngine } from './core/ContentFilterEngine';
import { ContentCategory, FilteringLevel, RuleAction } from './types';

class ContentFilterDemo {
  private server: SimpleServer;
  private engine: ContentFilterEngine;

  constructor() {
    this.server = new SimpleServer(3001);
    this.engine = new ContentFilterEngine();
  }

  async run(): Promise<void> {
    console.log('🎯 Content Filter Application Demo');
    console.log('=====================================\n');

    // Start the server
    this.server.start();

    // Wait a moment for server to initialize
    await this.sleep(1000);

    // Run interactive tests
    await this.runInteractiveTests();

    // Demonstrate API usage
    await this.demonstrateAPIUsage();

    // Show customization examples
    await this.demonstrateCustomization();

    console.log('\n✨ Demo completed! The Content Filter Application is ready for use.');
    console.log('\n📚 Next steps:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Start development server: npm run dev');
    console.log('   3. Build for production: npm run build');
    console.log('   4. Package for distribution: npm run build:electron');
  }

  private async runInteractiveTests(): Promise<void> {
    console.log('\n🧪 Running Interactive Tests...');
    console.log('--------------------------------');

    await this.server.interactiveTest();
  }

  private async demonstrateAPIUsage(): Promise<void> {
    console.log('\n🔌 API Usage Demonstration');
    console.log('---------------------------');

    // Test various content types
    const testCases = [
      {
        name: 'Block adult content',
        content: 'This website contains adult material and explicit content.',
        url: 'https://adult-site.com/video',
        expectedBlocked: true
      },
      {
        name: 'Allow educational content',
        content: 'Learn mathematics with our comprehensive video tutorials.',
        url: 'https://education-site.edu/math',
        expectedBlocked: false
      },
      {
        name: 'Block gambling content',
        content: 'Place your bets and win big at our online casino.',
        url: 'https://gambling-site.com/casino',
        expectedBlocked: true
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`   URL: ${testCase.url}`);

      const result = await this.server.simulateFilterRequest({
        content: testCase.content,
        url: testCase.url,
        contentType: 'text'
      });

      if (result.success) {
        const wasBlocked = !result.decision.allow;
        const status = wasBlocked === testCase.expectedBlocked ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status}: ${wasBlocked ? 'BLOCKED' : 'ALLOWED'} (${result.analysis.category})`);
      } else {
        console.log(`   ❌ ERROR: ${result.error}`);
      }
    }
  }

  private async demonstrateCustomization(): Promise<void> {
    console.log('\n⚙️  Customization Demonstration');
    console.log('-------------------------------');

    console.log('\n📋 Current Statistics:');
    const stats = this.engine.getStatistics();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n🔧 Adding Custom Rules:');

    // Add custom blocking rule
    this.engine.addCustomRule({
      id: 'demo-block-social',
      name: 'Block Social Media During Work Hours',
      pattern: 'facebook|twitter|instagram|tiktok',
      action: RuleAction.BLOCK,
      category: ContentCategory.SOCIAL_MEDIA,
      isActive: true,
      createdAt: new Date()
    });
    console.log('   ✅ Added rule to block social media');

    // Add domain to blocklist
    this.engine.addToBlocklist('distracting-site.com', ContentCategory.ENTERTAINMENT);
    console.log('   ✅ Added distracting-site.com to blocklist');

    // Add domain to allowlist
    this.engine.addToAllowlist('trusted-news.com');
    console.log('   ✅ Added trusted-news.com to allowlist');

    console.log('\n📊 Updated Statistics:');
    const updatedStats = this.engine.getStatistics();
    console.log(JSON.stringify(updatedStats, null, 2));

    // Test the custom rules
    console.log('\n🧪 Testing Custom Rules:');

    const customTestResult = await this.server.simulateFilterRequest({
      content: 'Check out this post on social media platform',
      url: 'https://distracting-site.com/entertainment',
      contentType: 'text'
    });

    if (customTestResult.success) {
      console.log(`   Custom rule test: ${customTestResult.decision.allow ? 'ALLOWED' : 'BLOCKED'}`);
      console.log(`   Reason: ${customTestResult.decision.reason}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the demo if this file is executed directly
async function main() {
  const demo = new ContentFilterDemo();
  await demo.run();
}

// Export for use in other modules
export { ContentFilterDemo };

// Run demo if this is the main module
if (require.main === module) {
  main().catch(console.error);
}
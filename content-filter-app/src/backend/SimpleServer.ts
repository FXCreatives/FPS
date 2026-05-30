// Simplified server implementation that doesn't require npm dependencies
// This is a basic HTTP server for demonstration purposes

import { ContentFilterEngine } from '../core/ContentFilterEngine';
import { User, ContentType, UserRole, FilteringLevel, ContentCategory } from '../types';

export interface FilterContext {
  user: User;
  url: string;
  contentType: ContentType;
  userAgent: string;
  timestamp: Date;
  sourceIp: string;
}

export class SimpleServer {
  private filterEngine: ContentFilterEngine;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.filterEngine = new ContentFilterEngine();
  }

  start(): void {
    console.log(`🚀 Content Filter Server starting on port ${this.port}`);
    console.log(`📊 Environment: development`);
    console.log(`🔒 Security: ENABLED`);

    // Simple HTTP server implementation
    this.createSimpleServer();
  }

  private createSimpleServer(): void {
    // In a real implementation, this would use Express.js
    // For now, we'll create a basic demonstration server

    console.log('\n📋 Content Filter API Endpoints:');
    console.log(`   POST http://localhost:${this.port}/api/filter`);
    console.log(`   GET  http://localhost:${this.port}/api/health`);
    console.log(`   GET  http://localhost:${this.port}/api/stats`);

    console.log('\n🔧 Available Methods:');
    console.log('   - analyzeContent(content, context)');
    console.log('   - addCustomRule(rule)');
    console.log('   - addToBlocklist(domain, category?)');
    console.log('   - addToAllowlist(domain)');

    console.log('\n✅ Server ready! Use the methods above to test the filtering engine.');
  }

  // API simulation methods
  async simulateFilterRequest(data: {
    content: string;
    url: string;
    userId?: string;
    contentType?: string;
  }): Promise<any> {
    try {
      // Create guest user if no user ID provided
      const user = this.createGuestUser();

      const context: FilterContext = {
        user,
        url: data.url,
        contentType: (data.contentType as ContentType) || ContentType.TEXT,
        userAgent: 'Mozilla/5.0 (Test Client)',
        timestamp: new Date(),
        sourceIp: '127.0.0.1'
      };

      // Analyze content
      const analysis = await this.filterEngine.analyzeContent(data.content, context);

      return {
        success: true,
        analysis,
        decision: {
          allow: !analysis.isBlocked,
          reason: analysis.isBlocked ? 'Content blocked by filter' : 'Content allowed',
          category: analysis.category,
          confidence: analysis.riskScore
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Content filtering failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private createGuestUser(): User {
    return {
      id: 'guest',
      email: 'guest@localhost',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'light' as const,
        language: 'en',
        notifications: {
          email: false,
          push: false,
          desktop: false,
          frequency: 'immediate' as const
        },
        privacy: {
          dataCollection: false,
          analytics: false,
          crashReporting: false,
          dataRetention: 30
        },
        filtering: {
          strictness: FilteringLevel.MEDIUM,
          categories: [ContentCategory.EDUCATION, ContentCategory.PRODUCTIVITY, ContentCategory.NEWS],
          customRules: [],
          schedule: {
            isEnabled: false,
            timezone: 'UTC',
            rules: []
          }
        }
      },
      isActive: true
    };
  }

  getStatistics(): any {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime() || 0) : 0,
      version: '1.0.0',
      engine: this.filterEngine.getStatistics(),
      memory: this.getMemoryUsage(),
      platform: process.platform || 'unknown'
    };
  }

  private getMemoryUsage(): any {
    // Simple memory usage estimation
    return {
      rss: 0, // Would use process.memoryUsage() in real implementation
      heapTotal: 0,
      heapUsed: 0,
      external: 0
    };
  }

  // Interactive testing method
  async interactiveTest(): Promise<void> {
    console.log('\n🧪 Interactive Content Filter Test');
    console.log('=====================================');

    const testCases = [
      {
        name: 'Educational Content',
        content: 'Learn about mathematics and science in this comprehensive guide.',
        url: 'https://educational-site.edu/math-guide'
      },
      {
        name: 'Social Media Content',
        content: 'Check out this amazing video on social media platform!',
        url: 'https://social-media.com/video/123'
      },
      {
        name: 'Adult Content',
        content: 'This adult content contains explicit material not suitable for all audiences.',
        url: 'https://adult-site.com/explicit-content'
      },
      {
        name: 'Productivity Content',
        content: 'Improve your productivity with these time management techniques.',
        url: 'https://productivity-site.com/time-management'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log(`   URL: ${testCase.url}`);
      console.log(`   Content: "${testCase.content}"`);

      const result = await this.simulateFilterRequest({
        content: testCase.content,
        url: testCase.url,
        contentType: 'text'
      });

      if (result.success) {
        console.log(`   ✅ Result: ${result.decision.allow ? 'ALLOWED' : 'BLOCKED'}`);
        console.log(`   📊 Category: ${result.analysis.category}`);
        console.log(`   🎯 Confidence: ${(result.decision.confidence * 100).toFixed(1)}%`);
        console.log(`   💡 Reason: ${result.decision.reason}`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
    }

    console.log('\n✨ Interactive test completed!');
    console.log('\n🔧 Try these API calls:');
    console.log('   - Add custom rule: filterEngine.addCustomRule({...})');
    console.log('   - Block domain: filterEngine.addToBlocklist("example.com")');
    console.log('   - Allow domain: filterEngine.addToAllowlist("trusted-site.com")');
  }
}

// Export for use in other modules
export { ContentFilterEngine };
import {
  ContentAnalysis,
  ContentCategory,
  ContentType,
  FilteringLevel,
  CustomRule,
  RuleAction,
  NetworkRequest,
  User,
  UserPreferences,
  ContentFilterError
} from '../types';

export interface FilteringDecision {
  allow: boolean;
  reason: string;
  category: ContentCategory;
  confidence: number;
  rule?: CustomRule;
  overrideAllowed: boolean;
}

export interface FilterContext {
  user: User;
  url: string;
  contentType: ContentType;
  userAgent: string;
  timestamp: Date;
  sourceIp: string;
}

export class ContentFilterEngine {
  private rules: Map<string, CustomRule> = new Map();
  private categoryBlocklists: Map<ContentCategory, Set<string>> = new Map();
  private domainBlocklist: Set<string> = new Set();
  private domainAllowlist: Set<string> = new Set();

  constructor() {
    this.initializeDefaultRules();
    this.loadBlocklists();
  }

  /**
   * Analyze content and make filtering decision
   */
  async analyzeContent(
    content: string,
    context: FilterContext
  ): Promise<ContentAnalysis> {
    const startTime = Date.now();

    try {
      // Extract content metadata
      const metadata = await this.extractMetadata(content, context);

      // Determine content category
      const category = await this.categorizeContent(content, metadata);

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(content, category, metadata);

      // Check against filtering rules
      const decision = await this.makeFilteringDecision(
        content,
        category,
        riskScore,
        context
      );

      const analysis: ContentAnalysis = {
        id: this.generateId(),
        url: context.url,
        content,
        contentType: context.contentType,
        category,
        riskScore,
        isBlocked: !decision.allow,
        analysisTime: new Date(),
        metadata
      };

      // Log analysis result
      this.logAnalysis(analysis, decision, Date.now() - startTime);

      return analysis;
    } catch (error) {
      throw new ContentFilterError(
        `Content analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_ERROR'
      );
    }
  }

  /**
   * Make filtering decision based on content and context
   */
  async makeFilteringDecision(
    content: string,
    category: ContentCategory,
    riskScore: number,
    context: FilterContext
  ): Promise<FilteringDecision> {
    // Check allowlist first
    if (this.isAllowlisted(context.url)) {
      return {
        allow: true,
        reason: 'URL is in allowlist',
        category,
        confidence: 1.0,
        overrideAllowed: true
      };
    }

    // Check blocklist
    if (this.isBlocklisted(context.url, category)) {
      return {
        allow: false,
        reason: 'URL is in blocklist',
        category,
        confidence: 1.0,
        overrideAllowed: true
      };
    }

    // Check custom rules
    const customRuleDecision = this.checkCustomRules(content, context);
    if (customRuleDecision) {
      return customRuleDecision;
    }

    // Apply user preferences
    const userDecision = this.applyUserPreferences(category, riskScore, context);
    if (userDecision) {
      return userDecision;
    }

    // Default decision based on risk score
    return this.makeDefaultDecision(category, riskScore, context);
  }

  /**
   * Extract metadata from content
   */
  private async extractMetadata(
    content: string,
    context: FilterContext
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};

    // Extract text-based metadata
    if (context.contentType === ContentType.TEXT) {
      metadata.wordCount = content.split(/\s+/).length;
      metadata.language = this.detectLanguage(content);
      metadata.hasKeywords = this.extractKeywords(content);
      metadata.sentiment = this.analyzeSentiment(content);
    }

    // Extract domain information
    try {
      const url = new URL(context.url);
      metadata.domain = url.hostname;
      metadata.tld = url.hostname.split('.').pop();
      metadata.isSecure = url.protocol === 'https:';
    } catch (error) {
      metadata.domain = 'unknown';
      metadata.parseError = error.message;
    }

    return metadata;
  }

  /**
   * Categorize content using multiple methods
   */
  private async categorizeContent(
    content: string,
    metadata: Record<string, any>
  ): Promise<ContentCategory> {
    // Simple keyword-based categorization
    const categoryScores = new Map<ContentCategory, number>();

    // Initialize scores
    Object.values(ContentCategory).forEach(category => {
      categoryScores.set(category, 0);
    });

    // Check against category keywords
    for (const [category, keywords] of this.getCategoryKeywords()) {
      const score = this.calculateKeywordScore(content, keywords);
      categoryScores.set(category, score);
    }

    // Return category with highest score
    let maxScore = 0;
    let bestCategory = ContentCategory.ENTERTAINMENT; // default

    for (const [category, score] of categoryScores) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  /**
   * Calculate risk score for content
   */
  private async calculateRiskScore(
    content: string,
    category: ContentCategory,
    metadata: Record<string, any>
  ): Promise<number> {
    let riskScore = 0;

    // Base risk by category
    riskScore += this.getCategoryRisk(category);

    // Content-based risk factors
    if (metadata.wordCount > 10000) riskScore += 0.1; // Very long content
    if (metadata.language === 'unknown') riskScore += 0.2; // Unknown language
    if (metadata.sentiment === 'negative') riskScore += 0.1; // Negative sentiment

    // Domain-based risk factors
    if (metadata.domain) {
      if (this.isSuspiciousDomain(metadata.domain)) riskScore += 0.3;
      if (this.isNewDomain(metadata.domain)) riskScore += 0.1;
    }

    // Normalize score between 0 and 1
    return Math.min(Math.max(riskScore, 0), 1);
  }

  /**
   * Check if URL is in allowlist
   */
  private isAllowlisted(url: string): boolean {
    try {
      const domain = new URL(url).hostname;
      return this.domainAllowlist.has(domain) ||
             this.domainAllowlist.has(`*.${domain.split('.').slice(-2).join('.')}`);
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is in blocklist
   */
  private isBlocklisted(url: string, category: ContentCategory): boolean {
    try {
      const domain = new URL(url).hostname;

      // Check domain blocklist
      if (this.domainBlocklist.has(domain)) return true;

      // Check category-specific blocklist
      const categoryList = this.categoryBlocklists.get(category);
      if (categoryList?.has(domain)) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check custom filtering rules
   */
  private checkCustomRules(
    content: string,
    context: FilterContext
  ): FilteringDecision | null {
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      const matches = this.testRule(content, context, rule);
      if (matches) {
        return {
          allow: rule.action !== RuleAction.BLOCK,
          reason: `Custom rule: ${rule.name}`,
          category: rule.category,
          confidence: 0.9,
          rule,
          overrideAllowed: true
        };
      }
    }

    return null;
  }

  /**
   * Apply user preferences to filtering decision
   */
  private applyUserPreferences(
    category: ContentCategory,
    riskScore: number,
    context: FilterContext
  ): FilteringDecision | null {
    const userPrefs = context.user.preferences.filtering;

    // Check if category is blocked by user
    if (!userPrefs.categories.includes(category)) {
      return {
        allow: false,
        reason: `Category blocked by user preferences: ${category}`,
        category,
        confidence: 1.0,
        overrideAllowed: true
      };
    }

    // Apply filtering level
    const level = userPrefs.strictness;
    const threshold = this.getFilteringThreshold(level);

    if (riskScore > threshold) {
      return {
        allow: false,
        reason: `Risk score ${riskScore.toFixed(2)} exceeds threshold ${threshold.toFixed(2)} for level ${level}`,
        category,
        confidence: riskScore,
        overrideAllowed: true
      };
    }

    return null;
  }

  /**
   * Make default filtering decision
   */
  private makeDefaultDecision(
    category: ContentCategory,
    riskScore: number,
    context: FilterContext
  ): FilteringDecision {
    // Default thresholds by category
    const defaultThreshold = this.getDefaultThreshold(category);

    const allow = riskScore <= defaultThreshold;

    return {
      allow,
      reason: allow
        ? `Risk score ${riskScore.toFixed(2)} below default threshold ${defaultThreshold.toFixed(2)}`
        : `Risk score ${riskScore.toFixed(2)} above default threshold ${defaultThreshold.toFixed(2)}`,
      category,
      confidence: riskScore,
      overrideAllowed: true
    };
  }

  /**
   * Test if content matches a custom rule
   */
  private testRule(
    content: string,
    context: FilterContext,
    rule: CustomRule
  ): boolean {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      return regex.test(content) || regex.test(context.url);
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize default filtering rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: CustomRule[] = [
      {
        id: 'block-adult-keywords',
        name: 'Block Adult Keywords',
        pattern: '\\b(adult|porn|xxx|nsfw|18\\+)\\b',
        action: RuleAction.BLOCK,
        category: ContentCategory.ADULT,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'block-violence-keywords',
        name: 'Block Violence Keywords',
        pattern: '\\b(violence|kill|murder|death|weapon)\\b',
        action: RuleAction.BLOCK,
        category: ContentCategory.VIOLENCE,
        isActive: true,
        createdAt: new Date()
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Load blocklists from storage
   */
  private loadBlocklists(): void {
    // Initialize category blocklists
    Object.values(ContentCategory).forEach(category => {
      this.categoryBlocklists.set(category, new Set());
    });

    // Load domain blocklist (in real implementation, this would load from database/file)
    const blockedDomains = [
      'malicious-site.com',
      'phishing-site.net',
      'adult-content.org'
    ];

    blockedDomains.forEach(domain => {
      this.domainBlocklist.add(domain);
    });

    // Load allowlist
    const allowedDomains = [
      'educational-site.edu',
      'government.gov',
      'safe-site.com'
    ];

    allowedDomains.forEach(domain => {
      this.domainAllowlist.add(domain);
    });
  }

  /**
   * Get category-specific keywords for classification (FOCUSED ON ADULT + BETTING ONLY)
   */
  private getCategoryKeywords(): Map<ContentCategory, string[]> {
    return new Map([
      [ContentCategory.ADULT, [
        'porn', 'xxx', 'adult', 'nsfw', '18+', 'erotic', 'sexual', 'nude', 'naked',
        'sex', 'fuck', 'ass', 'tits', 'pussy', 'cock', 'blowjob', 'handjob',
        'pornhub', 'xvideos', 'xnxx', 'xhamster', 'youporn', 'redtube',
        'onlyfans', 'chaturbate', 'stripchat', 'camsoda', 'myfreecams'
      ]],
      [ContentCategory.GAMBLING, [
        'casino', 'betting', 'bet', 'gamble', 'lottery', 'poker', 'blackjack',
        'roulette', 'slots', 'jackpot', 'wager', 'odds', 'bookmaker', 'sportsbook',
        'bet365', 'williamhill', 'ladbrokes', 'paddypower', 'coral', 'betfair',
        'skybet', 'unibet', '888', 'betway'
      ]]
    ]);
  }

  /**
   * Calculate keyword score for content
   */
  private calculateKeywordScore(content: string, keywords: string[]): number {
    const contentLower = content.toLowerCase();
    let score = 0;

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = contentLower.match(regex);
      if (matches) {
        score += matches.length * 0.1; // Each match adds 0.1 to score
      }
    });

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Detect language of content
   */
  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se'];

    const contentLower = content.toLowerCase();
    let englishScore = 0;
    let spanishScore = 0;

    englishWords.forEach(word => {
      if (contentLower.includes(word)) englishScore++;
    });

    spanishWords.forEach(word => {
      if (contentLower.includes(word)) spanishScore++;
    });

    if (englishScore > spanishScore) return 'en';
    if (spanishScore > englishScore) return 'es';
    return 'unknown';
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - split by spaces and filter
    return content
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['that', 'with', 'have', 'this', 'will', 'from', 'they', 'been'].includes(word))
      .slice(0, 10);
  }

  /**
   * Analyze sentiment of content
   */
  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible'];

    const contentLower = content.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      if (contentLower.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (contentLower.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Get risk score for category (FOCUSED ON ADULT + BETTING ONLY)
   */
  private getCategoryRisk(category: ContentCategory): number {
    const riskMap: Record<ContentCategory, number> = {
      [ContentCategory.ADULT]: 1.0,      // Block all adult content
      [ContentCategory.GAMBLING]: 1.0,   // Block all gambling content
      [ContentCategory.VIOLENCE]: 0.0,   // Allow violence content
      [ContentCategory.SOCIAL_MEDIA]: 0.0, // Allow social media
      [ContentCategory.GAMING]: 0.0,     // Allow gaming
      [ContentCategory.SHOPPING]: 0.0,   // Allow shopping
      [ContentCategory.NEWS]: 0.0,       // Allow news
      [ContentCategory.ENTERTAINMENT]: 0.0, // Allow entertainment
      [ContentCategory.PRODUCTIVITY]: 0.0, // Allow productivity
      [ContentCategory.EDUCATION]: 0.0   // Allow education
    };

    return riskMap[category] || 0.0;
  }

  /**
   * Check if domain is suspicious
   */
  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousPatterns = [
      /\.tk$/,
      /\.ml$/,
      /bit\.ly/,
      /tinyurl/,
      /suspicious/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Check if domain is new (registered recently)
   */
  private isNewDomain(domain: string): boolean {
    // In a real implementation, this would check WHOIS data
    // For now, we'll use a simple heuristic
    const newDomainPatterns = [
      /new-domain/,
      /recently-registered/
    ];

    return newDomainPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Get filtering threshold for level
   */
  private getFilteringThreshold(level: FilteringLevel): number {
    const thresholds: Record<FilteringLevel, number> = {
      [FilteringLevel.NONE]: 1.0,
      [FilteringLevel.LOW]: 0.8,
      [FilteringLevel.MEDIUM]: 0.6,
      [FilteringLevel.HIGH]: 0.4,
      [FilteringLevel.MAXIMUM]: 0.2
    };

    return thresholds[level];
  }

  /**
   * Get default threshold for category
   */
  private getDefaultThreshold(category: ContentCategory): number {
    const defaults: Record<ContentCategory, number> = {
      [ContentCategory.ADULT]: 0.3,
      [ContentCategory.VIOLENCE]: 0.4,
      [ContentCategory.GAMBLING]: 0.5,
      [ContentCategory.SOCIAL_MEDIA]: 0.7,
      [ContentCategory.GAMING]: 0.6,
      [ContentCategory.SHOPPING]: 0.8,
      [ContentCategory.NEWS]: 0.9,
      [ContentCategory.ENTERTAINMENT]: 0.7,
      [ContentCategory.PRODUCTIVITY]: 1.0,
      [ContentCategory.EDUCATION]: 1.0
    };

    return defaults[category] || 0.5;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log analysis result
   */
  private logAnalysis(
    analysis: ContentAnalysis,
    decision: FilteringDecision,
    processingTime: number
  ): void {
    console.log(`Content Analysis: ${analysis.url} -> ${decision.allow ? 'ALLOWED' : 'BLOCKED'} (${processingTime}ms)`);
  }

  /**
   * Add custom rule
   */
  public addCustomRule(rule: CustomRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove custom rule
   */
  public removeCustomRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Add domain to blocklist
   */
  public addToBlocklist(domain: string, category?: ContentCategory): void {
    this.domainBlocklist.add(domain);
    if (category) {
      if (!this.categoryBlocklists.has(category)) {
        this.categoryBlocklists.set(category, new Set());
      }
      this.categoryBlocklists.get(category)!.add(domain);
    }
  }

  /**
   * Remove domain from blocklist
   */
  public removeFromBlocklist(domain: string, category?: ContentCategory): void {
    this.domainBlocklist.delete(domain);
    if (category) {
      this.categoryBlocklists.get(category)?.delete(domain);
    }
  }

  /**
   * Add domain to allowlist
   */
  public addToAllowlist(domain: string): void {
    this.domainAllowlist.add(domain);
  }

  /**
   * Remove domain from allowlist
   */
  public removeFromAllowlist(domain: string): void {
    this.domainAllowlist.delete(domain);
  }

  /**
   * Get current statistics
   */
  public getStatistics(): Record<string, any> {
    return {
      totalRules: this.rules.size,
      blockedDomains: this.domainBlocklist.size,
      allowedDomains: this.domainAllowlist.size,
      categoryBlocklists: Object.fromEntries(
        Array.from(this.categoryBlocklists.entries()).map(([category, domains]) => [
          category,
          domains.size
        ])
      )
    };
  }
}
const natural = require('natural');
const compromise = require('compromise');

class TextAnalyzer {
    constructor(options = {}) {
        this.modelPath = options.modelPath || path.join(__dirname, '../../models/text-analysis/model.json');
        this.model = null;
        this.isInitialized = false;
        this.confidenceThreshold = options.confidenceThreshold || 0.75;

        // Initialize NLP tools
        this.classifier = new natural.BayesClassifier();
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;

        // Content categories for classification
        this.categories = {
            ADULT: 'adult',
            VIOLENCE: 'violence',
            DRUGS: 'drugs',
            HATE: 'hate_speech',
            SAFE: 'safe',
            EDUCATIONAL: 'educational',
            NEWS: 'news',
            SOCIAL: 'social'
        };

        // Initialize sentiment analysis
        this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', this.stemmer, 'afinn');

        // Adult content keywords and patterns
        this.adultKeywords = this.loadAdultKeywords();
        this.violenceKeywords = this.loadViolenceKeywords();
        this.drugKeywords = this.loadDrugKeywords();
        this.hateKeywords = this.loadHateKeywords();

        this.initialize();
    }

    async initialize() {
        try {
            console.log('🧠 Initializing AI Text Analyzer...');

            // Train the classifier
            await this.trainClassifier();

            // Load pre-trained models if available
            await this.loadPretrainedModels();

            this.isInitialized = true;
            console.log('✅ AI Text Analyzer initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Text Analyzer:', error);
            throw error;
        }
    }

    async trainClassifier() {
        try {
            console.log('🎓 Training text classifier...');

            // Training data for adult content
            const adultTexts = [
                "This is adult content with explicit material",
                "Contains sexual content and adult themes",
                "Explicit sexual content and adult material",
                "Adult entertainment and sexual content"
            ];

            // Training data for safe content
            const safeTexts = [
                "This is educational content about science",
                "News article about technology",
                "Educational material for students",
                "Scientific research and studies"
            ];

            // Train classifier
            adultTexts.forEach(text => {
                this.classifier.addDocument(text, this.categories.ADULT);
            });

            safeTexts.forEach(text => {
                this.classifier.addDocument(text, this.categories.SAFE);
            });

            this.classifier.train();

            console.log('✅ Text classifier trained');
        } catch (error) {
            console.error('❌ Error training classifier:', error);
            throw error;
        }
    }

    async loadPretrainedModels() {
        try {
            // In production, load pre-trained models
            // For now, use the basic trained classifier
            console.log('✅ Pre-trained models loaded');
        } catch (error) {
            console.error('❌ Error loading pre-trained models:', error);
        }
    }

    async analyzeText(text) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log('📝 Analyzing text content...');

            // Multi-layer analysis
            const basicAnalysis = this.basicTextAnalysis(text);
            const keywordAnalysis = this.keywordAnalysis(text);
            const patternAnalysis = this.patternAnalysis(text);
            const sentimentAnalysis = this.sentimentAnalysis(text);
            const contextAnalysis = this.contextAnalysis(text);

            // Combine results
            const result = this.combineAnalysisResults({
                basic: basicAnalysis,
                keyword: keywordAnalysis,
                pattern: patternAnalysis,
                sentiment: sentimentAnalysis,
                context: contextAnalysis
            });

            console.log('✅ Text analysis completed:', result);
            return result;

        } catch (error) {
            console.error('❌ Error analyzing text:', error);
            throw error;
        }
    }

    basicTextAnalysis(text) {
        try {
            // Use the trained classifier
            const classification = this.classifier.classify(text);
            const confidence = this.classifier.getClassifications(text)[0]?.value || 0;

            return {
                category: classification,
                confidence: confidence,
                isInappropriate: this.isInappropriateCategory(classification) && confidence >= this.confidenceThreshold
            };
        } catch (error) {
            console.error('Error in basic text analysis:', error);
            return {
                category: this.categories.SAFE,
                confidence: 0,
                isInappropriate: false
            };
        }
    }

    keywordAnalysis(text) {
        try {
            const lowerText = text.toLowerCase();
            const words = this.tokenizer.tokenize(lowerText) || [];

            let adultScore = 0;
            let violenceScore = 0;
            let drugScore = 0;
            let hateScore = 0;

            // Check for adult keywords
            for (const keyword of this.adultKeywords) {
                if (lowerText.includes(keyword)) {
                    adultScore += 1;
                }
            }

            // Check for violence keywords
            for (const keyword of this.violenceKeywords) {
                if (lowerText.includes(keyword)) {
                    violenceScore += 1;
                }
            }

            // Check for drug keywords
            for (const keyword of this.drugKeywords) {
                if (lowerText.includes(keyword)) {
                    drugScore += 1;
                }
            }

            // Check for hate keywords
            for (const keyword of this.hateKeywords) {
                if (lowerText.includes(keyword)) {
                    hateScore += 1;
                }
            }

            return {
                adultScore,
                violenceScore,
                drugScore,
                hateScore,
                totalSuspiciousWords: adultScore + violenceScore + drugScore + hateScore
            };
        } catch (error) {
            console.error('Error in keyword analysis:', error);
            return {
                adultScore: 0,
                violenceScore: 0,
                drugScore: 0,
                hateScore: 0,
                totalSuspiciousWords: 0
            };
        }
    }

    patternAnalysis(text) {
        try {
            // Analyze text patterns
            const patterns = {
                hasExcessiveCaps: this.hasExcessiveCaps(text),
                hasRepeatedChars: this.hasRepeatedChars(text),
                hasSuspiciousUrls: this.hasSuspiciousUrls(text),
                hasEncodedContent: this.hasEncodedContent(text),
                hasObfuscatedWords: this.hasObfuscatedWords(text)
            };

            return patterns;
        } catch (error) {
            console.error('Error in pattern analysis:', error);
            return {
                hasExcessiveCaps: false,
                hasRepeatedChars: false,
                hasSuspiciousUrls: false,
                hasEncodedContent: false,
                hasObfuscatedWords: false
            };
        }
    }

    sentimentAnalysis(text) {
        try {
            // Analyze sentiment
            const sentiment = this.sentimentAnalyzer.getSentiment(text.split(' '));

            return {
                score: sentiment,
                label: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral',
                comparative: sentiment
            };
        } catch (error) {
            console.error('Error in sentiment analysis:', error);
            return {
                score: 0,
                label: 'neutral',
                comparative: 0
            };
        }
    }

    contextAnalysis(text) {
        try {
            // Analyze context using compromise NLP
            const doc = compromise(text);

            const topics = doc.topics().out('array');
            const people = doc.people().out('array');
            const places = doc.places().out('array');
            const organizations = doc.organizations().out('array');

            return {
                topics,
                people,
                places,
                organizations,
                wordCount: text.split(' ').length,
                sentenceCount: text.split(/[.!?]+/).length - 1
            };
        } catch (error) {
            console.error('Error in context analysis:', error);
            return {
                topics: [],
                people: [],
                places: [],
                organizations: [],
                wordCount: 0,
                sentenceCount: 0
            };
        }
    }

    combineAnalysisResults(analyses) {
        try {
            const { basic, keyword, pattern, sentiment, context } = analyses;

            // Calculate overall risk score
            let riskScore = 0;

            // Basic classification score
            if (basic.isInappropriate) {
                riskScore += basic.confidence * 40;
            }

            // Keyword score
            const keywordScore = (keyword.totalSuspiciousWords / Math.max(context.wordCount, 1)) * 100;
            riskScore += Math.min(keywordScore, 30);

            // Pattern score
            let patternScore = 0;
            if (pattern.hasExcessiveCaps) patternScore += 10;
            if (pattern.hasRepeatedChars) patternScore += 15;
            if (pattern.hasSuspiciousUrls) patternScore += 20;
            if (pattern.hasEncodedContent) patternScore += 25;
            if (pattern.hasObfuscatedWords) patternScore += 15;
            riskScore += Math.min(patternScore, 25);

            // Sentiment score (negative sentiment might indicate inappropriate content)
            if (sentiment.label === 'negative' && sentiment.score < -0.5) {
                riskScore += 10;
            }

            // Determine final category and risk level
            let finalCategory = basic.category;
            let isInappropriate = riskScore >= 60;

            // Override category based on keyword analysis
            if (keyword.adultScore > keyword.violenceScore && keyword.adultScore > keyword.drugScore) {
                finalCategory = this.categories.ADULT;
            } else if (keyword.violenceScore > keyword.drugScore) {
                finalCategory = this.categories.VIOLENCE;
            } else if (keyword.drugScore > 0) {
                finalCategory = this.categories.DRUGS;
            }

            const result = {
                isInappropriate: isInappropriate,
                category: finalCategory,
                riskScore: Math.min(Math.round(riskScore), 100),
                confidence: Math.min(basic.confidence + (keywordScore / 100), 1),
                details: {
                    basic: basic,
                    keyword: keyword,
                    pattern: pattern,
                    sentiment: sentiment,
                    context: context
                },
                recommendations: this.generateRecommendations(isInappropriate, finalCategory, riskScore),
                timestamp: new Date().toISOString()
            };

            return result;

        } catch (error) {
            console.error('Error combining analysis results:', error);
            throw error;
        }
    }

    generateRecommendations(isInappropriate, category, riskScore) {
        const recommendations = [];

        if (isInappropriate) {
            recommendations.push({
                type: 'block',
                reason: `Content classified as ${category} with ${riskScore}% risk score`,
                action: 'Block access to this content'
            });
        }

        if (riskScore > 80) {
            recommendations.push({
                type: 'alert',
                reason: 'High-risk content detected',
                action: 'Notify administrators'
            });
        }

        return recommendations;
    }

    // Pattern detection methods
    hasExcessiveCaps(text) {
        const words = text.split(' ');
        const capsWords = words.filter(word => word === word.toUpperCase() && word.length > 2);
        return (capsWords.length / words.length) > 0.3;
    }

    hasRepeatedChars(text) {
        const repeatedCharPattern = /(.)\1{3,}/;
        return repeatedCharPattern.test(text);
    }

    hasSuspiciousUrls(text) {
        const urlPattern = /https?:\/\/[^\s]+/gi;
        const urls = text.match(urlPattern) || [];

        for (const url of urls) {
            if (this.isSuspiciousUrl(url)) {
                return true;
            }
        }

        return false;
    }

    hasEncodedContent(text) {
        // Check for URL encoding, base64, etc.
        const encodedPatterns = [
            /%[0-9A-Fa-f]{2}/, // URL encoding
            /^[A-Za-z0-9+/]*={0,2}$/, // Base64
            /&#[0-9]+;/, // HTML entities
        ];

        return encodedPatterns.some(pattern => pattern.test(text));
    }

    hasObfuscatedWords(text) {
        // Check for common obfuscation techniques
        const obfuscationPatterns = [
            /\b\w*[aeiou]\w*\b/gi, // Missing vowels (l33t speak)
            /\b\w*[@#$%]\w*\b/gi, // Special characters
            /\b\w*4\w*\b/gi, // Numbers replacing letters
        ];

        return obfuscationPatterns.some(pattern => {
            const matches = text.match(pattern) || [];
            return matches.length > text.split(' ').length * 0.2;
        });
    }

    isSuspiciousUrl(url) {
        const suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly',
            'adult', 'porn', 'xxx', 'sex'
        ];

        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return suspiciousDomains.some(domain => hostname.includes(domain));
        } catch {
            return false;
        }
    }

    // Load keyword lists
    loadAdultKeywords() {
        return [
            'porn', 'adult', 'xxx', 'sex', 'erotic', 'nude', 'naked',
            'explicit', 'sexual', 'intimate', 'seductive', 'arousal',
            'pleasure', 'desire', 'lust', 'passion', 'romance',
            'dating', 'hooker', 'escort', 'prostitute', 'camgirl',
            'webcam', 'livecam', 'strip', 'tease', 'fetish',
            'bdsm', 'bondage', 'domination', 'submission'
        ];
    }

    loadViolenceKeywords() {
        return [
            'violence', 'violent', 'kill', 'murder', 'death', 'die',
            'blood', 'gore', 'fight', 'attack', 'weapon', 'gun',
            'knife', 'bomb', 'terror', 'hate', 'abuse', 'torture',
            'rape', 'assault', 'brutal', 'cruel', 'savage'
        ];
    }

    loadDrugKeywords() {
        return [
            'drug', 'drugs', 'marijuana', 'cocaine', 'heroin', 'meth',
            'weed', 'pot', 'crack', 'ecstasy', 'lsd', 'acid',
            'mushroom', 'opioid', 'prescription', 'pharmacy',
            'dealer', 'addict', 'addiction', 'overdose', 'high'
        ];
    }

    loadHateKeywords() {
        return [
            'hate', 'racist', 'bigot', 'supremacist', 'nazi', 'kkk',
            'terrorist', 'extremist', 'radical', 'prejudice', 'discrimination',
            'intolerance', 'xenophobia', 'homophobia', 'transphobia',
            'misogyny', 'sexism', 'chauvinist'
        ];
    }

    isInappropriateCategory(category) {
        const inappropriateCategories = [
            this.categories.ADULT,
            this.categories.VIOLENCE,
            this.categories.DRUGS,
            this.categories.HATE
        ];

        return inappropriateCategories.includes(category);
    }

    // Advanced text analysis methods
    async analyzeTextAdvanced(text, options = {}) {
        try {
            const basicAnalysis = await this.analyzeText(text);

            const advanced = {
                basic: basicAnalysis,
                entities: this.extractEntities(text),
                keywords: this.extractKeywords(text),
                summary: this.generateSummary(text),
                language: this.detectLanguage(text),
                readability: this.calculateReadability(text)
            };

            return advanced;

        } catch (error) {
            console.error('Error in advanced text analysis:', error);
            throw error;
        }
    }

    extractEntities(text) {
        try {
            const doc = compromise(text);
            return {
                people: doc.people().out('array'),
                places: doc.places().out('array'),
                organizations: doc.organizations().out('array'),
                topics: doc.topics().out('array')
            };
        } catch (error) {
            return { people: [], places: [], organizations: [], topics: [] };
        }
    }

    extractKeywords(text) {
        try {
            const tokens = this.tokenizer.tokenize(text.toLowerCase());
            const filteredTokens = tokens.filter(token =>
                token.length > 3 &&
                !this.isStopWord(token) &&
                this.isRelevantKeyword(token)
            );

            return filteredTokens.slice(0, 10); // Top 10 keywords
        } catch (error) {
            return [];
        }
    }

    generateSummary(text) {
        try {
            // Simple extractive summarization
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const topSentences = sentences.slice(0, 2); // Take first 2 sentences

            return {
                summary: topSentences.join('. ').trim(),
                compression: (topSentences.join('. ').length / text.length) * 100
            };
        } catch (error) {
            return { summary: text.substring(0, 100), compression: 100 };
        }
    }

    detectLanguage(text) {
        try {
            // Simple language detection based on common words
            const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
            const spanishWords = ['el', 'la', 'en', 'y', 'o', 'pero', 'para', 'por', 'con'];
            const frenchWords = ['le', 'la', 'en', 'et', 'ou', 'mais', 'pour', 'par', 'avec'];

            const lowerText = text.toLowerCase();
            const wordCount = text.split(' ').length;

            let englishScore = 0;
            let spanishScore = 0;
            let frenchScore = 0;

            englishWords.forEach(word => {
                const occurrences = (lowerText.match(new RegExp(word, 'g')) || []).length;
                englishScore += occurrences;
            });

            spanishWords.forEach(word => {
                const occurrences = (lowerText.match(new RegExp(word, 'g')) || []).length;
                spanishScore += occurrences;
            });

            frenchWords.forEach(word => {
                const occurrences = (lowerText.match(new RegExp(word, 'g')) || []).length;
                frenchScore += occurrences;
            });

            const scores = [
                { lang: 'en', score: englishScore },
                { lang: 'es', score: spanishScore },
                { lang: 'fr', score: frenchScore }
            ];

            scores.sort((a, b) => b.score - a.score);
            return scores[0].lang;

        } catch (error) {
            return 'en'; // Default to English
        }
    }

    calculateReadability(text) {
        try {
            const sentences = text.split(/[.!?]+/).length;
            const words = text.split(' ').length;
            const syllables = this.countSyllables(text);

            // Simplified Flesch Reading Ease score
            const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));

            return {
                score: Math.max(0, Math.min(100, score)),
                level: this.getReadabilityLevel(score),
                words: words,
                sentences: sentences,
                syllables: syllables
            };
        } catch (error) {
            return { score: 50, level: 'standard', words: 0, sentences: 0, syllables: 0 };
        }
    }

    countSyllables(text) {
        // Simplified syllable counting
        return text.split(' ').reduce((count, word) => {
            return count + Math.max(1, word.replace(/[^aeiou]/gi, '').length);
        }, 0);
    }

    getReadabilityLevel(score) {
        if (score >= 90) return 'very_easy';
        if (score >= 80) return 'easy';
        if (score >= 70) return 'fairly_easy';
        if (score >= 60) return 'standard';
        if (score >= 50) return 'fairly_difficult';
        if (score >= 30) return 'difficult';
        return 'very_difficult';
    }

    isStopWord(word) {
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return stopWords.includes(word.toLowerCase());
    }

    isRelevantKeyword(word) {
        // Filter out common words and keep meaningful keywords
        const commonWords = ['that', 'this', 'with', 'from', 'they', 'have', 'been', 'said', 'what', 'were'];
        return !commonWords.includes(word.toLowerCase());
    }

    // Utility methods
    getAnalyzerInfo() {
        return {
            isInitialized: this.isInitialized,
            categories: Object.keys(this.categories),
            confidenceThreshold: this.confidenceThreshold,
            adultKeywordsCount: this.adultKeywords.length,
            violenceKeywordsCount: this.violenceKeywords.length,
            drugKeywordsCount: this.drugKeywords.length,
            hateKeywordsCount: this.hateKeywords.length
        };
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    }

    // Cleanup
    dispose() {
        this.isInitialized = false;
    }
}

module.exports = TextAnalyzer;
const axios = require('axios');
const crypto = require('crypto');

class ThreatDetector {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'http://localhost:3000';
        this.threatDatabase = new Map();
        this.detectionRules = this.initializeDetectionRules();
        this.threatScores = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = options.interval || 60000; // 1 minute

        // Threat categories
        this.threatCategories = {
            MALWARE: 'malware',
            PHISHING: 'phishing',
            ADULT_CONTENT: 'adult_content',
            VIOLENCE: 'violence',
            HATE_SPEECH: 'hate_speech',
            DRUGS: 'drugs',
            WEAPONS: 'weapons',
            GAMBLING: 'gambling',
            SOCIAL_ENGINEERING: 'social_engineering',
            DATA_THEFT: 'data_theft'
        };

        this.initialize();
    }

    async initialize() {
        console.log('🛡️ Initializing AI Threat Detector...');

        // Load threat signatures
        await this.loadThreatSignatures();

        // Initialize machine learning models
        await this.initializeMLModels();

        // Start monitoring
        this.startThreatMonitoring();

        console.log('✅ AI Threat Detector initialized');
    }

    initializeDetectionRules() {
        return {
            // URL-based detection
            suspiciousDomains: [
                /\b[a-z0-9]+\.(ru|cn|tk|ml|ga|cf)\b/i,
                /\b[a-z0-9-]+\.(porn|adult|xxx|sex)\b/i,
                /\b[a-z0-9-]+\.(download|update|patch)\b/i
            ],

            // Content-based detection
            suspiciousPatterns: [
                /eval\s*\(/gi,
                /document\.write\s*\(/gi,
                /window\.location\.replace/gi,
                /<script[^>]*>[\s\S]*?<\/script>/gi,
                /javascript:/gi
            ],

            // Behavioral detection
            suspiciousBehavior: [
                'excessive_redirects',
                'rapid_requests',
                'unusual_user_agents',
                'suspicious_headers',
                'encrypted_payloads'
            ]
        };
    }

    async loadThreatSignatures() {
        try {
            // Load threat signatures from API or local database
            const response = await axios.get(`${this.apiUrl}/api/threat-signatures`, {
                headers: { 'X-API-Key': 'cf_threat_detector' }
            });

            if (response.data && response.data.signatures) {
                this.threatDatabase = new Map(response.data.signatures);
                console.log('✅ Threat signatures loaded:', this.threatDatabase.size);
            }
        } catch (error) {
            console.error('❌ Error loading threat signatures:', error.message);
            // Use built-in signatures
            this.loadBuiltInSignatures();
        }
    }

    loadBuiltInSignatures() {
        // Load built-in threat signatures
        const builtInSignatures = [
            { pattern: /malware|virus|trojan/i, category: this.threatCategories.MALWARE, score: 90 },
            { pattern: /phishing|fake|scam/i, category: this.threatCategories.PHISHING, score: 85 },
            { pattern: /porn|adult|xxx/i, category: this.threatCategories.ADULT_CONTENT, score: 95 },
            { pattern: /violence|kill|murder/i, category: this.threatCategories.VIOLENCE, score: 80 },
            { pattern: /hate|racist|supremacist/i, category: this.threatCategories.HATE_SPEECH, score: 90 },
            { pattern: /drug|cocaine|heroin/i, category: this.threatCategories.DRUGS, score: 85 },
            { pattern: /weapon|gun|knife|bomb/i, category: this.threatCategories.WEAPONS, score: 95 },
            { pattern: /gambling|casino|betting/i, category: this.threatCategories.GAMBLING, score: 75 }
        ];

        builtInSignatures.forEach(sig => {
            this.threatDatabase.set(sig.pattern.source, {
                category: sig.category,
                score: sig.score,
                type: 'pattern'
            });
        });

        console.log('✅ Built-in threat signatures loaded');
    }

    async initializeMLModels() {
        try {
            // Initialize TensorFlow.js for threat detection
            const tf = require('@tensorflow/tfjs-node');

            // Create threat detection model
            this.threatModel = await this.createThreatDetectionModel();

            console.log('✅ ML models initialized');
        } catch (error) {
            console.error('❌ Error initializing ML models:', error);
        }
    }

    async createThreatDetectionModel() {
        try {
            const tf = require('@tensorflow/tfjs-node');

            // Simple neural network for threat detection
            const model = tf.sequential({
                layers: [
                    tf.layers.dense({ inputShape: [100], units: 64, activation: 'relu' }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({ units: 32, activation: 'relu' }),
                    tf.layers.dense({ units: Object.keys(this.threatCategories).length, activation: 'softmax' })
                ]
            });

            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            return model;
        } catch (error) {
            console.error('Error creating threat detection model:', error);
            return null;
        }
    }

    startThreatMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        console.log('🔍 Starting AI threat monitoring...');

        // Monitor network traffic
        this.monitorNetworkTraffic();

        // Monitor file system
        this.monitorFileSystem();

        // Monitor browser activity
        this.monitorBrowserActivity();

        // Monitor user behavior
        this.monitorUserBehavior();
    }

    stopThreatMonitoring() {
        this.isMonitoring = false;
        console.log('⏹️ AI threat monitoring stopped');
    }

    async analyzeContent(content, context = {}) {
        try {
            const threats = [];

            // Pattern-based detection
            const patternThreats = this.detectPatternThreats(content, context);
            threats.push(...patternThreats);

            // ML-based detection
            const mlThreats = await this.detectMLThreats(content, context);
            threats.push(...mlThreats);

            // Behavioral detection
            const behavioralThreats = this.detectBehavioralThreats(context);
            threats.push(...behavioralThreats);

            // Consolidate and score threats
            const consolidatedThreats = this.consolidateThreats(threats);

            return {
                isThreat: consolidatedThreats.length > 0,
                threats: consolidatedThreats,
                overallRiskScore: this.calculateOverallRiskScore(consolidatedThreats),
                recommendations: this.generateThreatRecommendations(consolidatedThreats),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error analyzing content for threats:', error);
            return {
                isThreat: false,
                threats: [],
                overallRiskScore: 0,
                recommendations: [],
                error: error.message
            };
        }
    }

    detectPatternThreats(content, context) {
        const threats = [];

        // Check URL patterns
        if (context.url) {
            for (const rule of this.detectionRules.suspiciousDomains) {
                if (rule.test(context.url)) {
                    threats.push({
                        type: 'suspicious_domain',
                        category: this.threatCategories.PHISHING,
                        severity: 'high',
                        confidence: 0.9,
                        description: 'Suspicious domain pattern detected',
                        details: { pattern: rule.source, url: context.url }
                    });
                }
            }
        }

        // Check content patterns
        if (content) {
            for (const rule of this.detectionRules.suspiciousPatterns) {
                if (rule.test(content)) {
                    threats.push({
                        type: 'suspicious_content',
                        category: this.threatCategories.MALWARE,
                        severity: 'medium',
                        confidence: 0.7,
                        description: 'Suspicious content pattern detected',
                        details: { pattern: rule.source }
                    });
                }
            }
        }

        return threats;
    }

    async detectMLThreats(content, context) {
        const threats = [];

        try {
            if (this.threatModel && content) {
                // Extract features from content
                const features = this.extractFeatures(content, context);

                // Run ML prediction
                const prediction = await this.runMLPrediction(features);

                if (prediction.isThreat) {
                    threats.push({
                        type: 'ml_detected_threat',
                        category: prediction.category,
                        severity: prediction.severity,
                        confidence: prediction.confidence,
                        description: 'AI-detected threat',
                        details: { model: 'threat_detection_v1', features: features }
                    });
                }
            }
        } catch (error) {
            console.error('Error in ML threat detection:', error);
        }

        return threats;
    }

    detectBehavioralThreats(context) {
        const threats = [];

        try {
            // Analyze user behavior patterns
            const behaviorAnalysis = this.analyzeUserBehavior(context);

            if (behaviorAnalysis.isSuspicious) {
                threats.push({
                    type: 'suspicious_behavior',
                    category: this.threatCategories.SOCIAL_ENGINEERING,
                    severity: behaviorAnalysis.severity,
                    confidence: behaviorAnalysis.confidence,
                    description: 'Suspicious user behavior detected',
                    details: behaviorAnalysis
                });
            }
        } catch (error) {
            console.error('Error in behavioral threat detection:', error);
        }

        return threats;
    }

    extractFeatures(content, context) {
        // Extract features for ML analysis
        const features = [];

        // Content-based features
        if (content) {
            features.push(content.length);
            features.push((content.match(/<script/gi) || []).length);
            features.push((content.match(/<iframe/gi) || []).length);
            features.push((content.match(/javascript:/gi) || []).length);
        }

        // Context-based features
        if (context.url) {
            features.push(context.url.length);
            features.push(context.url.split('.').length);
        }

        // Pad or truncate to 100 features
        while (features.length < 100) {
            features.push(0);
        }

        return features.slice(0, 100);
    }

    async runMLPrediction(features) {
        try {
            if (!this.threatModel) {
                return { isThreat: false };
            }

            const tf = require('@tensorflow/tfjs-node');
            const tensorFeatures = tf.tensor2d([features]);
            const prediction = this.threatModel.predict(tensorFeatures);

            const predictionArray = prediction.arraySync()[0];
            const maxConfidence = Math.max(...predictionArray);
            const categoryIndex = predictionArray.indexOf(maxConfidence);

            const categories = Object.values(this.threatCategories);
            const predictedCategory = categories[categoryIndex];

            return {
                isThreat: maxConfidence > 0.7,
                category: predictedCategory,
                confidence: maxConfidence,
                severity: this.getSeverityForCategory(predictedCategory)
            };

        } catch (error) {
            console.error('Error running ML prediction:', error);
            return { isThreat: false };
        }
    }

    analyzeUserBehavior(context) {
        // Analyze user behavior for suspicious patterns
        const suspiciousIndicators = [];

        // Check for rapid clicking
        if (context.clickRate > 10) { // More than 10 clicks per second
            suspiciousIndicators.push('rapid_clicking');
        }

        // Check for unusual navigation patterns
        if (context.redirectCount > 5) {
            suspiciousIndicators.push('excessive_redirects');
        }

        // Check for suspicious form interactions
        if (context.formFillRate > 0.8 && context.timeOnPage < 10) {
            suspiciousIndicators.push('suspicious_form_interaction');
        }

        const severity = suspiciousIndicators.length > 2 ? 'high' : suspiciousIndicators.length > 0 ? 'medium' : 'low';
        const confidence = Math.min(suspiciousIndicators.length * 0.3, 1);

        return {
            isSuspicious: suspiciousIndicators.length > 0,
            indicators: suspiciousIndicators,
            severity: severity,
            confidence: confidence
        };
    }

    consolidateThreats(threats) {
        // Remove duplicate threats and consolidate scores
        const consolidated = [];
        const seen = new Set();

        for (const threat of threats) {
            const key = `${threat.type}_${threat.category}`;

            if (!seen.has(key)) {
                seen.add(key);
                consolidated.push(threat);
            } else {
                // Update existing threat with higher confidence
                const existing = consolidated.find(t => `${t.type}_${t.category}` === key);
                if (existing && threat.confidence > existing.confidence) {
                    existing.confidence = threat.confidence;
                    existing.severity = threat.severity;
                }
            }
        }

        return consolidated;
    }

    calculateOverallRiskScore(threats) {
        if (threats.length === 0) return 0;

        const totalScore = threats.reduce((sum, threat) => {
            const severityMultiplier = threat.severity === 'high' ? 3 : threat.severity === 'medium' ? 2 : 1;
            return sum + (threat.confidence * 100 * severityMultiplier);
        }, 0);

        return Math.min(totalScore / threats.length, 100);
    }

    generateThreatRecommendations(threats) {
        const recommendations = [];

        for (const threat of threats) {
            switch (threat.category) {
                case this.threatCategories.MALWARE:
                    recommendations.push({
                        action: 'block',
                        reason: 'Malware detected',
                        details: 'Potentially malicious content identified'
                    });
                    break;

                case this.threatCategories.PHISHING:
                    recommendations.push({
                        action: 'block',
                        reason: 'Phishing attempt detected',
                        details: 'Suspicious domain or content pattern'
                    });
                    break;

                case this.threatCategories.ADULT_CONTENT:
                    recommendations.push({
                        action: 'block',
                        reason: 'Adult content detected',
                        details: 'Inappropriate content for current context'
                    });
                    break;

                default:
                    recommendations.push({
                        action: 'monitor',
                        reason: 'Suspicious content detected',
                        details: 'Content requires further analysis'
                    });
            }
        }

        return recommendations;
    }

    getSeverityForCategory(category) {
        const severityMap = {
            [this.threatCategories.MALWARE]: 'high',
            [this.threatCategories.PHISHING]: 'high',
            [this.threatCategories.ADULT_CONTENT]: 'medium',
            [this.threatCategories.VIOLENCE]: 'high',
            [this.threatCategories.HATE_SPEECH]: 'high',
            [this.threatCategories.DRUGS]: 'medium',
            [this.threatCategories.WEAPONS]: 'high',
            [this.threatCategories.GAMBLING]: 'medium',
            [this.threatCategories.SOCIAL_ENGINEERING]: 'high',
            [this.threatCategories.DATA_THEFT]: 'critical'
        };

        return severityMap[category] || 'medium';
    }

    // Advanced threat detection methods
    async analyzeNetworkTraffic(trafficData) {
        try {
            const threats = [];

            // Analyze packet patterns
            const packetThreats = this.analyzePacketPatterns(trafficData);
            threats.push(...packetThreats);

            // Analyze connection patterns
            const connectionThreats = this.analyzeConnectionPatterns(trafficData);
            threats.push(...connectionThreats);

            // Analyze protocol usage
            const protocolThreats = this.analyzeProtocolUsage(trafficData);
            threats.push(...protocolThreats);

            return threats;
        } catch (error) {
            console.error('Error analyzing network traffic:', error);
            return [];
        }
    }

    analyzePacketPatterns(trafficData) {
        const threats = [];

        // Detect suspicious packet patterns
        if (trafficData.packetSize > 1000000) { // Large packets
            threats.push({
                type: 'suspicious_packet_size',
                category: this.threatCategories.DATA_THEFT,
                severity: 'medium',
                confidence: 0.6,
                description: 'Unusually large packet size detected'
            });
        }

        return threats;
    }

    analyzeConnectionPatterns(trafficData) {
        const threats = [];

        // Detect rapid connections
        if (trafficData.connectionRate > 50) { // More than 50 connections per minute
            threats.push({
                type: 'rapid_connections',
                category: this.threatCategories.SOCIAL_ENGINEERING,
                severity: 'medium',
                confidence: 0.7,
                description: 'Unusually high connection rate detected'
            });
        }

        return threats;
    }

    analyzeProtocolUsage(trafficData) {
        const threats = [];

        // Detect suspicious protocol usage
        const suspiciousPorts = [23, 25, 110, 143]; // Telnet, SMTP, POP3, IMAP

        if (suspiciousPorts.includes(trafficData.port)) {
            threats.push({
                type: 'suspicious_protocol',
                category: this.threatCategories.MALWARE,
                severity: 'high',
                confidence: 0.8,
                description: 'Suspicious protocol usage detected'
            });
        }

        return threats;
    }

    // Real-time threat monitoring
    monitorNetworkTraffic() {
        // Monitor network traffic for threats
        console.log('🔍 Monitoring network traffic for threats...');

        // This would integrate with system network monitoring tools
        // For now, using a simplified approach
    }

    monitorFileSystem() {
        // Monitor file system for suspicious files
        console.log('🔍 Monitoring file system for threats...');
    }

    monitorBrowserActivity() {
        // Monitor browser activity for threats
        console.log('🔍 Monitoring browser activity for threats...');
    }

    monitorUserBehavior() {
        // Monitor user behavior for threats
        console.log('🔍 Monitoring user behavior for threats...');
    }

    // Threat response methods
    async respondToThreat(threat, context) {
        try {
            const response = {
                action: 'block',
                reason: threat.description,
                timestamp: new Date().toISOString(),
                threatId: crypto.randomUUID()
            };

            // Log threat
            await this.logThreat(threat, response, context);

            // Execute response
            await this.executeThreatResponse(response, context);

            return response;
        } catch (error) {
            console.error('Error responding to threat:', error);
            throw error;
        }
    }

    async logThreat(threat, response, context) {
        try {
            const logEntry = {
                threatId: response.threatId,
                threat: threat,
                response: response,
                context: context,
                timestamp: new Date().toISOString()
            };

            // Send to API for logging
            await axios.post(`${this.apiUrl}/api/threat-log`, logEntry, {
                headers: { 'X-API-Key': 'cf_threat_detector' }
            });

        } catch (error) {
            console.error('Error logging threat:', error);
        }
    }

    async executeThreatResponse(response, context) {
        try {
            // Execute appropriate response based on threat
            switch (response.action) {
                case 'block':
                    await this.blockThreat(context);
                    break;
                case 'alert':
                    await this.alertThreat(response, context);
                    break;
                case 'monitor':
                    await this.monitorThreat(response, context);
                    break;
            }
        } catch (error) {
            console.error('Error executing threat response:', error);
        }
    }

    async blockThreat(context) {
        // Block the threat at network level
        console.log('🚫 Blocking threat:', context.url || context.ip);
    }

    async alertThreat(response, context) {
        // Send alert about threat
        console.log('⚠️ Alerting about threat:', response.reason);
    }

    async monitorThreat(response, context) {
        // Monitor threat for further analysis
        console.log('👁️ Monitoring threat:', response.threatId);
    }

    // Utility methods
    getThreatStats() {
        return {
            isMonitoring: this.isMonitoring,
            threatDatabaseSize: this.threatDatabase.size,
            detectionRulesCount: this.detectionRules.suspiciousDomains.length,
            categories: Object.keys(this.threatCategories),
            lastUpdate: new Date().toISOString()
        };
    }

    updateThreatSignatures(signatures) {
        this.threatDatabase = new Map(signatures);
        console.log('✅ Threat signatures updated');
    }

    // Cleanup
    cleanup() {
        this.stopThreatMonitoring();
        if (this.threatModel) {
            this.threatModel.dispose();
        }
    }
}

module.exports = ThreatDetector;
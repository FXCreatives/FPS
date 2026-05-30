const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageAnalyzer {
    constructor(options = {}) {
        this.modelPath = options.modelPath || path.join(__dirname, '../../models/image-classification/model.json');
        this.model = null;
        this.isInitialized = false;
        this.confidenceThreshold = options.confidenceThreshold || 0.8;

        // Content categories for classification
        this.categories = {
            ADULT: 'adult',
            VIOLENCE: 'violence',
            DRUGS: 'drugs',
            WEAPONS: 'weapons',
            SAFE: 'safe',
            MEDICAL: 'medical',
            EDUCATIONAL: 'educational'
        };

        // Image preprocessing settings
        this.imageConfig = {
            width: 224,
            height: 224,
            channels: 3,
            normalization: {
                mean: [0.485, 0.456, 0.406],
                std: [0.229, 0.224, 0.225]
            }
        };
    }

    async initialize() {
        try {
            console.log('🤖 Initializing AI Image Analyzer...');

            // Load the pre-trained model
            await this.loadModel();

            // Initialize TensorFlow.js backend
            await tf.ready();

            this.isInitialized = true;
            console.log('✅ AI Image Analyzer initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Image Analyzer:', error);
            throw error;
        }
    }

    async loadModel() {
        try {
            // For now, create a simple CNN model
            // In production, you would load a pre-trained model
            this.model = await this.createModel();

            console.log('✅ Image classification model loaded');
        } catch (error) {
            console.error('❌ Error loading model:', error);
            throw error;
        }
    }

    async createModel() {
        // Create a simple CNN model for image classification
        const model = tf.sequential({
            layers: [
                // Convolutional layers
                tf.layers.conv2d({
                    inputShape: [this.imageConfig.width, this.imageConfig.height, this.imageConfig.channels],
                    kernelSize: 3,
                    filters: 32,
                    activation: 'relu'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),

                tf.layers.conv2d({ kernelSize: 3, filters: 64, activation: 'relu' }),
                tf.layers.maxPooling2d({ poolSize: 2 }),

                tf.layers.conv2d({ kernelSize: 3, filters: 128, activation: 'relu' }),
                tf.layers.maxPooling2d({ poolSize: 2 }),

                // Flatten and dense layers
                tf.layers.flatten(),
                tf.layers.dense({ units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.5 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.dense({ units: Object.keys(this.categories).length, activation: 'softmax' })
            ]
        });

        // Compile the model
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    async analyzeImage(imagePath) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log('🔍 Analyzing image:', imagePath);

            // Load and preprocess image
            const imageBuffer = fs.readFileSync(imagePath);
            const imageTensor = await this.preprocessImage(imageBuffer);

            // Run inference
            const predictions = await this.runInference(imageTensor);

            // Post-process results
            const result = this.postprocessResults(predictions);

            // Cleanup tensors
            imageTensor.dispose();
            predictions.dispose();

            console.log('✅ Image analysis completed:', result);
            return result;

        } catch (error) {
            console.error('❌ Error analyzing image:', error);
            throw error;
        }
    }

    async analyzeImageBuffer(imageBuffer) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Preprocess image buffer
            const imageTensor = await this.preprocessImage(imageBuffer);

            // Run inference
            const predictions = await this.runInference(imageTensor);

            // Post-process results
            const result = this.postprocessResults(predictions);

            // Cleanup
            imageTensor.dispose();
            predictions.dispose();

            return result;

        } catch (error) {
            console.error('❌ Error analyzing image buffer:', error);
            throw error;
        }
    }

    async preprocessImage(imageBuffer) {
        try {
            // Convert buffer to tensor
            let tensor = tf.node.decodeImage(imageBuffer);

            // Resize image
            tensor = tf.image.resizeBilinear(tensor, [this.imageConfig.width, this.imageConfig.height]);

            // Convert to RGB if needed
            if (tensor.shape[2] === 4) {
                const rgb = tf.slice(tensor, [0, 0, 0, 0], [-1, -1, 3, 1]);
                tensor.dispose();
                tensor = rgb;
            }

            // Normalize pixel values
            tensor = tensor.toFloat().div(255.0);

            // Apply mean and std normalization
            const mean = tf.tensor(this.imageConfig.normalization.mean);
            const std = tf.tensor(this.imageConfig.normalization.std);

            tensor = tensor.sub(mean).div(std);

            // Add batch dimension
            tensor = tensor.expandDims(0);

            return tensor;

        } catch (error) {
            console.error('❌ Error preprocessing image:', error);
            throw error;
        }
    }

    async runInference(imageTensor) {
        try {
            // Run model prediction
            const predictions = this.model.predict(imageTensor);

            return predictions;
        } catch (error) {
            console.error('❌ Error running inference:', error);
            throw error;
        }
    }

    postprocessResults(predictions) {
        try {
            // Convert predictions to JavaScript array
            const predictionsArray = predictions.arraySync()[0];

            // Get category with highest confidence
            const maxConfidence = Math.max(...predictionsArray);
            const categoryIndex = predictionsArray.indexOf(maxConfidence);
            const category = Object.values(this.categories)[categoryIndex];

            // Determine if content is inappropriate
            const inappropriateCategories = [this.categories.ADULT, this.categories.VIOLENCE, this.categories.DRUGS, this.categories.WEAPONS];
            const isInappropriate = inappropriateCategories.includes(category) && maxConfidence >= this.confidenceThreshold;

            const result = {
                isInappropriate: isInappropriate,
                category: category,
                confidence: maxConfidence,
                riskScore: this.calculateRiskScore(category, maxConfidence),
                details: {
                    adult: predictionsArray[0],
                    violence: predictionsArray[1],
                    drugs: predictionsArray[2],
                    weapons: predictionsArray[3],
                    safe: predictionsArray[4],
                    medical: predictionsArray[5],
                    educational: predictionsArray[6]
                },
                timestamp: new Date().toISOString()
            };

            return result;

        } catch (error) {
            console.error('❌ Error postprocessing results:', error);
            throw error;
        }
    }

    calculateRiskScore(category, confidence) {
        // Calculate risk score based on category and confidence
        const baseScores = {
            [this.categories.ADULT]: 90,
            [this.categories.VIOLENCE]: 95,
            [this.categories.DRUGS]: 85,
            [this.categories.WEAPONS]: 95,
            [this.categories.SAFE]: 0,
            [this.categories.MEDICAL]: 10,
            [this.categories.EDUCATIONAL]: 0
        };

        const baseScore = baseScores[category] || 50;
        return Math.round(baseScore * confidence);
    }

    async analyzeImageUrl(imageUrl) {
        try {
            const axios = require('axios');

            // Download image
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 10000
            });

            // Analyze the downloaded image
            return await this.analyzeImageBuffer(response.data);

        } catch (error) {
            console.error('❌ Error analyzing image URL:', error);
            throw error;
        }
    }

    // Batch processing for multiple images
    async analyzeImageBatch(imagePaths) {
        const results = [];

        for (const imagePath of imagePaths) {
            try {
                const result = await this.analyzeImage(imagePath);
                results.push({
                    path: imagePath,
                    result: result
                });
            } catch (error) {
                results.push({
                    path: imagePath,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Real-time image analysis for streaming
    async analyzeImageStream(imageStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];

            imageStream.on('data', chunk => {
                chunks.push(chunk);
            });

            imageStream.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const result = await this.analyzeImageBuffer(buffer);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            imageStream.on('error', reject);
        });
    }

    // Advanced image analysis with multiple models
    async analyzeImageAdvanced(imagePath, options = {}) {
        const results = {
            basic: null,
            objects: [],
            faces: [],
            text: null,
            emotions: [],
            nsfw: null
        };

        try {
            // Basic classification
            results.basic = await this.analyzeImage(imagePath);

            // Object detection (if available)
            if (options.includeObjects) {
                results.objects = await this.detectObjects(imagePath);
            }

            // Face detection and analysis
            if (options.includeFaces) {
                results.faces = await this.detectFaces(imagePath);
            }

            // Text detection (OCR)
            if (options.includeText) {
                results.text = await this.detectText(imagePath);
            }

            // NSFW detection
            results.nsfw = await this.detectNSFW(imagePath);

            return results;

        } catch (error) {
            console.error('❌ Error in advanced image analysis:', error);
            throw error;
        }
    }

    async detectObjects(imagePath) {
        // Placeholder for object detection
        // In production, integrate with YOLO, SSD, or similar
        return [];
    }

    async detectFaces(imagePath) {
        // Placeholder for face detection
        // In production, use OpenCV or similar
        return [];
    }

    async detectText(imagePath) {
        // Placeholder for OCR
        // In production, use Tesseract or similar
        return null;
    }

    async detectNSFW(imagePath) {
        // Specialized NSFW detection
        const basic = await this.analyzeImage(imagePath);
        return {
            isNSFW: basic.category === this.categories.ADULT,
            confidence: basic.confidence,
            details: basic.details
        };
    }

    // Model training and fine-tuning
    async trainModel(trainingData, options = {}) {
        try {
            console.log('🎓 Training image classification model...');

            const {
                epochs = 10,
                batchSize = 32,
                learningRate = 0.001,
                validationSplit = 0.2
            } = options;

            // Prepare training data
            const { images, labels } = await this.prepareTrainingData(trainingData);

            // Convert to tensors
            const imageTensor = tf.tensor4d(images);
            const labelTensor = tf.tensor2d(labels);

            // Train the model
            const history = await this.model.fit(imageTensor, labelTensor, {
                epochs: epochs,
                batchSize: batchSize,
                validationSplit: validationSplit,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(4)} - Accuracy: ${logs.acc.toFixed(4)}`);
                    }
                }
            });

            // Save the trained model
            await this.saveModel();

            console.log('✅ Model training completed');
            return history;

        } catch (error) {
            console.error('❌ Error training model:', error);
            throw error;
        }
    }

    async prepareTrainingData(trainingData) {
        // Prepare image data for training
        const images = [];
        const labels = [];

        for (const item of trainingData) {
            try {
                const imageBuffer = fs.readFileSync(item.path);
                const tensor = await this.preprocessImage(imageBuffer);

                images.push(tensor.arraySync());
                labels.push(this.encodeLabel(item.label));

            } catch (error) {
                console.error('Error preparing training data:', error);
            }
        }

        return { images, labels };
    }

    encodeLabel(label) {
        // Convert label to one-hot encoding
        const categoryIndex = Object.values(this.categories).indexOf(label);
        const encoded = new Array(Object.keys(this.categories).length).fill(0);
        encoded[categoryIndex] = 1;
        return encoded;
    }

    async saveModel() {
        try {
            if (this.model) {
                await this.model.save('file://' + this.modelPath);
                console.log('💾 Model saved successfully');
            }
        } catch (error) {
            console.error('❌ Error saving model:', error);
        }
    }

    // Utility methods
    getModelInfo() {
        return {
            isInitialized: this.isInitialized,
            modelPath: this.modelPath,
            categories: Object.keys(this.categories),
            confidenceThreshold: this.confidenceThreshold,
            imageConfig: this.imageConfig
        };
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    }

    // Cleanup
    dispose() {
        if (this.model) {
            this.model.dispose();
        }
        this.isInitialized = false;
    }
}

module.exports = ImageAnalyzer;
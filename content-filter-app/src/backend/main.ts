import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { ContentFilterEngine } from '../core/ContentFilterEngine';
import { DatabaseManager } from './database/DatabaseManager';
import { SecurityManager } from '../security/SecurityManager';
import { UserManager } from './managers/UserManager';
import { FilteringManager } from './managers/FilteringManager';
import { PlatformManager } from '../platforms/PlatformManager';

import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { filteringRoutes } from './routes/filtering';
import { adminRoutes } from './routes/admin';
import { platformRoutes } from './routes/platform';

import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { ContentFilterError } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContentFilterApp {
  private app: express.Application;
  private server: any;
  private io: Server;
  private filterEngine: ContentFilterEngine;
  private database: DatabaseManager;
  private security: SecurityManager;
  private userManager: UserManager;
  private filteringManager: FilteringManager;
  private platformManager: PlatformManager;

  constructor() {
    this.app = express();
    this.filterEngine = new ContentFilterEngine();
    this.database = new DatabaseManager();
    this.security = new SecurityManager();
    this.userManager = new UserManager(this.database, this.security);
    this.filteringManager = new FilteringManager(this.filterEngine, this.database);
    this.platformManager = new PlatformManager();

    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL
          : "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Custom middleware
    this.app.use(requestLogger);
    this.app.use(rateLimitMiddleware);

    // Static files
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../../build')));
    }
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes(this.userManager, this.security));
    this.app.use('/api/user', userRoutes(this.userManager));
    this.app.use('/api/filtering', filteringRoutes(this.filteringManager));
    this.app.use('/api/admin', adminRoutes(this.userManager, this.filteringManager));
    this.app.use('/api/platform', platformRoutes(this.platformManager));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
      });
    });

    // Content filtering endpoint
    this.app.post('/api/filter', async (req, res) => {
      try {
        const { content, url, userId, contentType } = req.body;

        if (!content || !url) {
          return res.status(400).json({
            error: 'Content and URL are required'
          });
        }

        // Get user context
        const user = userId ? await this.userManager.getUserById(userId) : null;

        // Create filter context
        const context = {
          user: user || this.createGuestUser(),
          url,
          contentType: contentType || 'text',
          userAgent: req.get('User-Agent') || '',
          timestamp: new Date(),
          sourceIp: req.ip || req.connection.remoteAddress || ''
        };

        // Analyze content
        const analysis = await this.filterEngine.analyzeContent(content, context);

        res.json({
          success: true,
          analysis,
          decision: {
            allow: !analysis.isBlocked,
            reason: analysis.isBlocked ? 'Content blocked by filter' : 'Content allowed',
            category: analysis.category,
            confidence: analysis.riskScore
          }
        });
      } catch (error) {
        console.error('Filtering error:', error);
        res.status(500).json({
          error: 'Internal server error during content filtering'
        });
      }
    });

    // Catch-all handler for SPA
    if (process.env.NODE_ENV === 'production') {
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../build/index.html'));
      });
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join user room if authenticated
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = await this.security.verifyToken(token);
          socket.join(`user:${decoded.userId}`);
          socket.emit('authenticated', { userId: decoded.userId });
        } catch (error) {
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Real-time filtering requests
      socket.on('filter_request', async (data: {
        content: string;
        url: string;
        userId?: string;
        contentType?: string;
      }) => {
        try {
          const user = data.userId ? await this.userManager.getUserById(data.userId) : null;

          const context = {
            user: user || this.createGuestUser(),
            url: data.url,
            contentType: data.contentType || 'text',
            userAgent: socket.handshake.headers['user-agent'] || '',
            timestamp: new Date(),
            sourceIp: socket.handshake.address
          };

          const analysis = await this.filterEngine.analyzeContent(data.content, context);

          socket.emit('filter_response', {
            success: true,
            analysis,
            decision: {
              allow: !analysis.isBlocked,
              reason: analysis.isBlocked ? 'Content blocked by filter' : 'Content allowed',
              category: analysis.category,
              confidence: analysis.riskScore
            }
          });
        } catch (error) {
          socket.emit('filter_error', {
            error: 'Content filtering failed'
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Close server gracefully
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  private createGuestUser() {
    return {
      id: 'guest',
      email: 'guest@localhost',
      role: 'user' as const,
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
          strictness: 'medium' as const,
          categories: ['education', 'productivity', 'news'],
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

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close HTTP server
      this.server.close(() => {
        console.log('HTTP server closed');
      });

      // Close Socket.IO
      this.io.close(() => {
        console.log('Socket.IO server closed');
      });

      // Close database connections
      await this.database.close();

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.database.initialize();

      // Start HTTP server
      const port = process.env.PORT || 3001;
      this.server.listen(port, () => {
        console.log(`🚀 Content Filter API server running on port ${port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DEVELOPMENT'}`);
      });

      // Start Socket.IO
      const socketPort = process.env.SOCKET_PORT || 3002;
      this.io.listen(socketPort);
      console.log(`📡 Socket.IO server running on port ${socketPort}`);

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new ContentFilterApp();

if (import.meta.url === `file://${process.argv[1]}`) {
  app.start().catch(console.error);
}

export { ContentFilterApp };
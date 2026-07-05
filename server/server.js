import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { notFound, errorHandler } from './errorMiddleware.js';

// Route imports
import authRoutes from './authRoutes.js';
import courseRoutes from './courses.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import studentsRoutes from './studentsRoutes.js';
import adminRoutes from './adminRoutes.js';
import { seedStudents, seedUsers } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mongoServerInstance = null;

// Load environment variables
dotenv.config();

// --- Global Error Handling for Critical Errors ---
// These handlers catch issues that are not part of the Express request-response cycle.
// They prevent the entire application from crashing silently or hanging in a corrupt state.
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const startServer = async () => {
  // In development, clear the console on each server restart for better readability.
  if (process.env.npm_lifecycle_event === 'dev') {
    console.clear();
  }

  try {
    // Database Connection
    let mongoUri = process.env.MONGO_URI;

    if (process.env.USE_MEMORY_DB === 'true') {
      console.log('Initializing in-memory MongoDB server...');
      let MongoMemoryServer;
      try {
        ({ MongoMemoryServer } = await import('mongodb-memory-server'));
      } catch (importError) {
        console.error("USE_MEMORY_DB=true but 'mongodb-memory-server' is not installed.");
        console.error("Install it with: npm install -D mongodb-memory-server (run in the server folder)");
        throw importError;
      }
      mongoServerInstance = await MongoMemoryServer.create();
      mongoUri = mongoServerInstance.getUri();
      console.log('In-memory MongoDB server started.');
    }

    if (!mongoUri) {
      console.error('FATAL ERROR: MONGO_URI is not defined. Please create a .env file and add the MONGO_URI variable.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    if (process.env.USE_MEMORY_DB === 'true') {
      console.log('Connected to in-memory MongoDB.');
    } else {
      console.log('MongoDB connected successfully.');
    }

    // Seed default demo accounts & applicant records on first run.
    await seedUsers();
    await seedStudents();

    // --- Security Best Practice: Check for Insecure Secrets ---
    const insecureSecrets = [
      'your_jwt_secret_key',
      'replace_this_with_a_real_secret_see_comment_in_response'
    ];
    if (insecureSecrets.includes(process.env.JWT_SECRET)) {
        console.warn('\n===================================================================');
        console.warn('⚠️  WARNING: You are using an insecure or default JWT_SECRET.');
        console.warn('    For production, please generate a strong, random secret.');
        console.warn('===================================================================\n');
    }

    const app = express();
    const PORT = process.env.PORT || 5000;

    // In dev, requests arrive via Vite's proxy (localhost -> localhost), which
    // sets X-Forwarded-For. Trusting exactly one hop tells express-rate-limit
    // how to read the real client IP instead of throwing a validation error
    // on every single request.
    app.set('trust proxy', 1);

    // Middleware
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // Apply security headers
    // Configure CORS to allow requests from your frontend.
    // It's a good practice to pull the frontend URL from environment variables.
    const corsOptions = {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    app.use(express.json());

    // --- Stability: Apply Rate Limiting ---
    // Protects against brute-force and Denial-of-Service (DoS) attacks.
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 2000, // generous limit in dev so normal UI use never trips it
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    });
    app.use('/api', apiLimiter);

    // Serve uploaded document files (resumes, IDs, etc.)
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // API Routes
    app.get('/api/health', async (req, res) => {
      try {
        // Check database connection status. 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        const dbState = mongoose.connection.readyState;
        if (dbState !== 1) {
          throw new Error('Database is not connected.');
        }

        res.status(200).json({
          message: 'Backend is healthy and running!',
          timestamp: new Date().toISOString(),
          database: 'Connected',
        });
      } catch (error) {
        res.status(503).json({
          message: 'Backend is unhealthy!',
          timestamp: new Date().toISOString(),
          database: `Error: ${error.message}`,
        });
      }
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/enrollments', enrollmentRoutes);
    app.use('/api/students', studentsRoutes);
    app.use('/api/admin/students', adminRoutes);

    // Error Handling Middleware
    app.use(notFound);
    app.use(errorHandler);

    const server = app.listen(PORT, () => {
      console.log('=======================================================');
      console.log(`✅ Backend server is live and running on port ${PORT}`);
      console.log(`   Ready to accept connections from ${process.env.FRONTEND_URL}`);
      console.log('=======================================================');
    });
    return server; // Return the server instance for graceful shutdown
  } catch (error) {
    console.error(`\nMongoDB connection failed: ${error.message}`);
    console.error(`Attempted to connect to: ${process.env.MONGO_URI}`);
    console.error('Please ensure that MongoDB is running and that the MONGO_URI in your .env file is correct.\n');
    process.exit(1);
  }
};

startServer().then(server => {
  if (!server) return; // Don't set up listeners if server failed to start

  // --- Reliability: Graceful Shutdown ---
  // Ensures the server closes connections cleanly on shutdown signals.
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('✅ HTTP server closed.');
      mongoose.connection.close(false, async () => {
        console.log('✅ MongoDB connection closed.');
        if (mongoServerInstance) {
          await mongoServerInstance.stop();
          console.log('✅ In-memory MongoDB server stopped.');
        }
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // For `pm2 stop` or container orchestration
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // For Ctrl+C in the terminal
});
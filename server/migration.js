import sqlite3 from 'sqlite3';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './User.js';

dotenv.config();

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI;
// IMPORTANT: Set path to your old SQLite DB file.
// I'm assuming it's in a `data` directory. Please adjust this path.
// The original db.js creates the database in the `server` directory, not `server/data`.
const SQLITE_DB_PATH = './enrollment.db';

async function migrateUsers() {
  console.log('Starting user migration...');

  const db = new (sqlite3.verbose().Database)(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error opening SQLite DB:', err.message);
      throw err;
    }
    console.log('Connected to the SQLite database.');
  });

  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', [], async (err, rows) => {
      if (err) {
        return reject(err);
      }

      console.log(`Found ${rows.length} users to migrate.`);
      let migratedCount = 0;

      for (const row of rows) {
        try {
          // --- IMPORTANT MAPPING ---
          // You MUST map your SQLite columns to your Mongoose schema fields here.
          // This is an example mapping.
          const userObject = {
            // Generate a username from the email, as it's required in the new schema
            username: row.username || row.email.split('@')[0],
            email: row.email,
            // The column in db.js is 'password', not 'password_hash'
            password: row.password,
            // Provide placeholder names as they are required and don't exist in the old 'users' table.
            firstName: row.first_name || row.role.charAt(0).toUpperCase() + row.role.slice(1),
            lastName: row.last_name || 'User',
            role: row.role || 'student',
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          };

          // Use `collection.insertOne` to bypass the Mongoose pre-save hook
          // that would re-hash our already-hashed password.
          await User.collection.insertOne(userObject);
          migratedCount++;
        } catch (e) {
          // Code 11000 is a duplicate key error. We can ignore it.
          if (e.code === 11000) {
            console.log(`Skipping duplicate user: ${row.username}`);
          } else {
            console.error(`Failed to migrate user ${row.username}:`, e);
          }
        }
      }
      
      console.log(`User migration complete. Migrated ${migratedCount} new users.`);
      db.close();
      resolve();
    });
  });
}

async function runMigration() {
  if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined. Please create a .env file and add the MONGO_URI variable.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for migration.');

    await migrateUsers();
    // You can add more migration functions here for other tables (e.g., migrateCourses)

  } catch (err) {
    console.error("Migration failed with an error:", err);
  } finally {
    await mongoose.connection.close();
    console.log('Migration finished. MongoDB connection closed.');
  }
}

runMigration();
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'enrollment.db');

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Wrap sqlite3 queries in Promises
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this); // returns "lastID" and "changes"
    });
  });
};

export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Database Initialization (Tables Creation & Seeding)
export async function initDb() {
  // 1. Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      birth_date TEXT,
      address TEXT,
      enrollment_type TEXT,
      program_id TEXT,
      academic_term TEXT,
      status TEXT DEFAULT 'registration',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      schedule_generated INTEGER DEFAULT 0,
      registration_form_generated INTEGER DEFAULT 0,
      receipt_generated INTEGER DEFAULT 0,
      admission_notes TEXT,
      adviser_notes TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT,
      type_id TEXT,
      file_name TEXT,
      original_name TEXT,
      uploaded_at TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, type_id)
    )
  `);

  // Migration: add original_name column if it doesn't exist (for existing databases)
  try {
    await dbRun(`ALTER TABLE documents ADD COLUMN original_name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS selected_subjects (
      student_id TEXT,
      subject_id TEXT,
      added_at TEXT,
      PRIMARY KEY (student_id, subject_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 2. Check if db is empty, if so, seed mock data
  const rowCount = await dbGet('SELECT COUNT(*) as count FROM students');
  if (rowCount.count === 0) {
    console.log('Database empty. Seeding initial records...');

    // Seed 5 pre-loaded student records
    const initialStudents = [
      {
        id: 'STU-2026-0001',
        first_name: 'Maria',
        last_name: 'Santos',
        email: 'maria.santos@email.com',
        phone: '0917-123-4567',
        birth_date: '2005-03-15',
        address: '123 Rizal St., Quezon City',
        enrollment_type: 'new',
        program_id: 'bscs',
        academic_term: '1s-2026',
        status: 'documents_submitted',
        payment_method: null,
        payment_status: 'unpaid',
        schedule_generated: 0,
        registration_form_generated: 0,
        receipt_generated: 0,
        admission_notes: '',
        adviser_notes: '',
        documents: [
          { typeId: 'valid-id', fileName: 'maria_id.jpg', status: 'pending' },
          { typeId: 'form-137', fileName: 'maria_form137.pdf', status: 'pending' },
          { typeId: 'report-card', fileName: 'maria_grades.pdf', status: 'pending' },
          { typeId: 'good-moral', fileName: 'maria_goodmoral.pdf', status: 'pending' },
          { typeId: 'birth-cert', fileName: 'maria_birthcert.pdf', status: 'pending' },
          { typeId: '2x2-photo', fileName: 'maria_photo.jpg', status: 'pending' }
        ],
        subjects: []
      },
      {
        id: 'STU-2026-0002',
        first_name: 'Carlos',
        last_name: 'Reyes',
        email: 'carlos.reyes@email.com',
        phone: '0918-234-5678',
        birth_date: '2004-08-22',
        address: '45 Mabini Ave., Manila',
        enrollment_type: 'returning',
        program_id: 'bscs',
        academic_term: '1s-2026',
        status: 'advising_pending',
        payment_method: null,
        payment_status: 'unpaid',
        schedule_generated: 0,
        registration_form_generated: 0,
        receipt_generated: 0,
        admission_notes: 'Documents verified and complete.',
        adviser_notes: '',
        documents: [
          { typeId: 'valid-id', fileName: 'carlos_id.jpg', status: 'approved' },
          { typeId: 'form-137', fileName: 'carlos_form137.pdf', status: 'approved' },
          { typeId: 'report-card', fileName: 'carlos_grades.pdf', status: 'approved' },
          { typeId: 'good-moral', fileName: 'carlos_goodmoral.pdf', status: 'approved' },
          { typeId: 'birth-cert', fileName: 'carlos_birthcert.pdf', status: 'approved' },
          { typeId: '2x2-photo', fileName: 'carlos_photo.jpg', status: 'approved' }
        ],
        subjects: ['cs101', 'cs102']
      },
      {
        id: 'STU-2026-0003',
        first_name: 'Ana',
        last_name: 'Torres',
        email: 'ana.torres@email.com',
        phone: '0919-345-6789',
        birth_date: '2005-01-10',
        address: '78 Bonifacio Blvd., Makati',
        enrollment_type: 'new',
        program_id: 'bsba',
        academic_term: '1s-2026',
        status: 'payment_pending',
        payment_method: null,
        payment_status: 'unpaid',
        schedule_generated: 0,
        registration_form_generated: 0,
        receipt_generated: 0,
        admission_notes: 'All requirements complete.',
        adviser_notes: 'Eligible for all selected subjects. Prerequisites satisfied.',
        documents: [
          { typeId: 'valid-id', fileName: 'ana_id.jpg', status: 'approved' },
          { typeId: 'form-137', fileName: 'ana_form137.pdf', status: 'approved' },
          { typeId: 'report-card', fileName: 'ana_grades.pdf', status: 'approved' },
          { typeId: 'good-moral', fileName: 'ana_goodmoral.pdf', status: 'approved' },
          { typeId: 'birth-cert', fileName: 'ana_birthcert.pdf', status: 'approved' },
          { typeId: '2x2-photo', fileName: 'ana_photo.jpg', status: 'approved' }
        ],
        subjects: ['ba101', 'ba102', 'ba201', 'ba202']
      },
      {
        id: 'STU-2026-0004',
        first_name: 'Miguel',
        last_name: 'Cruz',
        email: 'miguel.cruz@email.com',
        phone: '0920-456-7890',
        birth_date: '2004-11-05',
        address: '15 Luna St., Pasig City',
        enrollment_type: 'transfer',
        program_id: 'bsn',
        academic_term: '1s-2026',
        status: 'validation_pending',
        payment_method: 'gcash',
        payment_status: 'paid',
        schedule_generated: 0,
        registration_form_generated: 0,
        receipt_generated: 0,
        admission_notes: 'Transfer credentials verified.',
        adviser_notes: 'Cleared for first-year nursing subjects.',
        documents: [
          { typeId: 'valid-id', fileName: 'miguel_id.jpg', status: 'approved' },
          { typeId: 'form-137', fileName: 'miguel_form137.pdf', status: 'approved' },
          { typeId: 'report-card', fileName: 'miguel_grades.pdf', status: 'approved' },
          { typeId: 'good-moral', fileName: 'miguel_goodmoral.pdf', status: 'approved' },
          { typeId: 'birth-cert', fileName: 'miguel_birthcert.pdf', status: 'approved' },
          { typeId: '2x2-photo', fileName: 'miguel_photo.jpg', status: 'approved' },
          { typeId: 'med-cert', fileName: 'miguel_health.pdf', status: 'approved' }
        ],
        subjects: ['nu101', 'nu102', 'nu103']
      },
      {
        id: 'STU-2026-0005',
        first_name: 'Isabella',
        last_name: 'Navarro',
        email: 'isabella.navarro@email.com',
        phone: '0921-567-8901',
        birth_date: '2004-05-20',
        address: '200 Aguinaldo Highway, Cavite',
        enrollment_type: 'continuing',
        program_id: 'bscs',
        academic_term: '1s-2026',
        status: 'enrolled',
        payment_method: 'card',
        payment_status: 'paid',
        schedule_generated: 1,
        registration_form_generated: 1,
        receipt_generated: 1,
        admission_notes: 'Continuing student, documents on file.',
        adviser_notes: 'All prerequisites met. Approved for 2nd year subjects.',
        documents: [
          { typeId: 'valid-id', fileName: 'isabella_id.jpg', status: 'approved' },
          { typeId: 'form-137', fileName: 'isabella_form137.pdf', status: 'approved' },
          { typeId: 'report-card', fileName: 'isabella_grades.pdf', status: 'approved' },
          { typeId: 'good-moral', fileName: 'isabella_goodmoral.pdf', status: 'approved' },
          { typeId: 'birth-cert', fileName: 'isabella_birthcert.pdf', status: 'approved' },
          { typeId: '2x2-photo', fileName: 'isabella_photo.jpg', status: 'approved' }
        ],
        subjects: ['cs201', 'cs202', 'cs301', 'cs302']
      },
      {
        id: 'STU-2026-0006',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        birth_date: '',
        address: '',
        enrollment_type: null,
        program_id: null,
        academic_term: null,
        status: 'registration',
        payment_method: null,
        payment_status: 'unpaid',
        schedule_generated: 0,
        registration_form_generated: 0,
        receipt_generated: 0,
        admission_notes: '',
        adviser_notes: '',
        documents: [],
        subjects: []
      }
    ];

    for (const student of initialStudents) {
      await dbRun(`
        INSERT INTO students (
          id, first_name, last_name, email, phone, birth_date, address,
          enrollment_type, program_id, academic_term, status,
          payment_method, payment_status, schedule_generated,
          registration_form_generated, receipt_generated,
          admission_notes, adviser_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        student.id, student.first_name, student.last_name, student.email,
        student.phone, student.birth_date, student.address, student.enrollment_type,
        student.program_id, student.academic_term, student.status,
        student.payment_method, student.payment_status, student.schedule_generated,
        student.registration_form_generated, student.receipt_generated,
        student.admission_notes, student.adviser_notes
      ]);

      for (const doc of student.documents) {
        await dbRun(`
          INSERT INTO documents (student_id, type_id, file_name, original_name, uploaded_at, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          student.id, doc.typeId, doc.fileName, doc.fileName, new Date().toISOString(), doc.status
        ]);
      }

      for (const subId of student.subjects) {
        await dbRun(`
          INSERT INTO selected_subjects (student_id, subject_id, added_at)
          VALUES (?, ?, ?)
        `, [
          student.id, subId, new Date().toISOString()
        ]);
      }
    }
    console.log('Mock database preloaded successfully!');
  }

  // 3. Check if users are empty, if so, seed mock data
  const usersCount = await dbGet('SELECT COUNT(*) as count FROM users');
  if (usersCount.count === 0) {
    console.log('Seeding default users...');
    const defaultPassword = bcrypt.hashSync('password123', 10);
    const roles = ['student', 'admission', 'adviser', 'accounting', 'registrar', 'admin'];
    for (const role of roles) {
      await dbRun(`
        INSERT INTO users (email, password, role)
        VALUES (?, ?, ?)
      `, [`${role}@example.com`, defaultPassword, role]);
    }
    console.log('Mock users preloaded successfully!');
  }
}

export default db;

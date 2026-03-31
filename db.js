const { Pool } = require('pg');
require('dotenv').config();

// In production DATABASE_URL is set automatically.
// In development, it falls back to credentials from .env
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: 'localhost',
      database: 'smashpointdb',
      password: process.env.DB_PASS,
      port: 5432,
    });

module.exports = pool;
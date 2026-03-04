import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('render.com')
        ? { rejectUnauthorized: false }
        : undefined
});

export async function initDB() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database initialized');
}

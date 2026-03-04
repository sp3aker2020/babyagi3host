import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let _pool: Pool | null = null;

export function getPool(): Pool {
    if (!_pool) {
        _pool = new Pool({
            connectionString: process.env.DATABASE_URL!,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });
    }
    return _pool;
}

// Keep backward-compatible export (used in routes)
export const pool = new Proxy({} as Pool, {
    get(_target, prop) {
        return (getPool() as any)[prop];
    },
});

export async function initDB() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await getPool().query(schema);
    console.log('✅ Database initialized');
}

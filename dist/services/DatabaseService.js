import pg from 'pg';
import dotenv from 'dotenv'; // Ensure env is loaded
dotenv.config();
const { Pool } = pg;
export class DatabaseService {
    pool;
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
        });
    }
    async initialize() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS allowed_channels (
                channel_id TEXT PRIMARY KEY
            );

            CREATE TABLE IF NOT EXISTS channel_memory (
                channel_id TEXT PRIMARY KEY,
                summary TEXT,
                last_updated BIGINT
            );

            CREATE TABLE IF NOT EXISTS channel_instructions (
                channel_id TEXT PRIMARY KEY,
                instructions TEXT
            );
        `);
        // Initialize default system instructions if not exists
        const res = await this.pool.query('SELECT value FROM config WHERE key = $1', ['system_instructions']);
        if (res.rows.length === 0) {
            await this.pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['system_instructions', 'You are a helpful Discord Copilot. Be concise and friendly.']);
        }
    }
    getPool() {
        return this.pool;
    }
}

import { DatabaseService } from './DatabaseService.js';

export class ConfigService {
    constructor(private dbService: DatabaseService) {}

    async getSystemInstructions(channelId?: string): Promise<string> {
        const pool = this.dbService.getPool();
        
        let instructions = '';

        if (channelId) {
            const res = await pool.query('SELECT instructions FROM channel_instructions WHERE channel_id = $1', [channelId]);
            if (res.rows.length > 0) {
                instructions = res.rows[0].instructions;
            }
        }

        if (!instructions) {
            const res = await pool.query('SELECT value FROM config WHERE key = $1', ['system_instructions']);
            instructions = res.rows[0]?.value || 'You are a helpful AI assistant.';
        }
        
        return instructions;
    }

    async setSystemInstructions(instructions: string): Promise<void> {
        const pool = this.dbService.getPool();
        await pool.query(
            'INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
            ['system_instructions', instructions]
        );
    }

    async isChannelAllowed(channelId: string): Promise<boolean> {
        const pool = this.dbService.getPool();
        const res = await pool.query('SELECT channel_id FROM allowed_channels WHERE channel_id = $1', [channelId]);
        return res.rows.length > 0;
    }

    async addAllowedChannel(channelId: string): Promise<void> {
        const pool = this.dbService.getPool();
        await pool.query('INSERT INTO allowed_channels (channel_id) VALUES ($1) ON CONFLICT (channel_id) DO NOTHING', [channelId]);
    }

    async removeAllowedChannel(channelId: string): Promise<void> {
        const pool = this.dbService.getPool();
        await pool.query('DELETE FROM allowed_channels WHERE channel_id = $1', [channelId]);
    }

    async getAllowedChannels(): Promise<string[]> {
        const pool = this.dbService.getPool();
        const res = await pool.query('SELECT channel_id FROM allowed_channels');
        return res.rows.map(row => row.channel_id);
    }
}


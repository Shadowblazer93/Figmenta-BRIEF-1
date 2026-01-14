export class MemoryService {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    async getSummary(channelId) {
        const pool = this.dbService.getPool();
        const res = await pool.query('SELECT summary FROM channel_memory WHERE channel_id = $1', [channelId]);
        return res.rows[0]?.summary || '';
    }
    async updateSummary(channelId, newSummary) {
        const pool = this.dbService.getPool();
        await pool.query('INSERT INTO channel_memory (channel_id, summary, last_updated) VALUES ($1, $2, $3) ON CONFLICT (channel_id) DO UPDATE SET summary = EXCLUDED.summary, last_updated = EXCLUDED.last_updated', [channelId, newSummary, Date.now()]);
    }
    async clearMemory(channelId) {
        const pool = this.dbService.getPool();
        await pool.query('DELETE FROM channel_memory WHERE channel_id = $1', [channelId]);
    }
}

export class KnowledgeService {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    async searchRelevantContext(query) {
        const pool = this.dbService.getPool();
        try {
            // Using PostgreSQL full text search to find relevant content
            // Using ts_headline to extract relevant snippets and avoid exceeding token limits
            // Added filename to search vector so users can search by document name
            const result = await pool.query(`
                SELECT 
                    filename,
                    ts_headline('english', content, plainto_tsquery('english', $1), 'StartSel=**, StopSel=**, MaxWords=2000, MinWords=200') as snippet
                FROM knowledge_base 
                WHERE to_tsvector('english', filename || ' ' || content) @@ plainto_tsquery('english', $1)
                ORDER BY ts_rank(to_tsvector('english', filename || ' ' || content), plainto_tsquery('english', $1)) DESC
                LIMIT 3
            `, [query]);
            if (result.rows.length === 0) {
                return '';
            }
            return result.rows.map(row => `Source: ${row.filename}\nRelevant Content:\n${row.snippet}`).join('\n\n---\n\n');
        }
        catch (error) {
            console.error('Error searching knowledge base:', error);
            // If table doesn't exist or other error, return empty string so bot can continue without context
            return '';
        }
    }
    async listFiles() {
        const pool = this.dbService.getPool();
        try {
            const result = await pool.query('SELECT filename FROM knowledge_base ORDER BY filename ASC');
            return result.rows.map(row => row.filename);
        }
        catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }
    async getFileContent(filename) {
        const pool = this.dbService.getPool();
        try {
            const result = await pool.query('SELECT content FROM knowledge_base WHERE filename = $1', [filename]);
            if (result.rows.length === 0)
                return '';
            // Truncate to avoid massive tokens if file is huge, though user asked for "full" context logic
            // Let's limit to ~15000 chars approx
            return result.rows[0].content.substring(0, 15000);
        }
        catch (error) {
            console.error('Error getting file content:', error);
            return '';
        }
    }
}

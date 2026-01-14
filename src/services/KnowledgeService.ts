import { DatabaseService } from './DatabaseService.js';

export class KnowledgeService {
    constructor(private dbService: DatabaseService) {}
    
    async searchRelevantContext(query: string): Promise<string> {
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
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            // If table doesn't exist or other error, return empty string so bot can continue without context
            return '';
        }
    }
}

import 'dotenv/config';
import http from 'http';
import { DatabaseService } from './services/DatabaseService.js';
import { ConfigService } from './services/ConfigService.js';
import { MemoryService } from './services/MemoryService.js';
import { NscaleService } from './services/NscaleService.js';
import { DiscordService } from './services/DiscordService.js';
import { KnowledgeService } from './services/KnowledgeService.js';

const PORT = process.env.PORT || 8080;

async function main() {
    // Health check server for Fly.io
    const server = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('OK');
    });

    server.listen(PORT, () => {
        console.log(`Health check server listening on port ${PORT}`);
    });

    const discordToken = process.env.DISCORD_TOKEN;
    const nscaleToken = process.env.NSCALE_SERVICE_TOKEN;

    if (!discordToken || !nscaleToken) {
        console.error('Missing DISCORD_TOKEN or NSCALE_SERVICE_TOKEN in .env');
        process.exit(1);
    }

    const dbService = new DatabaseService();
    await dbService.initialize();

    const configService = new ConfigService(dbService);
    const memoryService = new MemoryService(dbService);
    const aiService = new NscaleService(nscaleToken);
    const knowledgeService = new KnowledgeService(dbService);

    const discordService = new DiscordService(
        configService,
        memoryService,
        aiService,
        knowledgeService,
        discordToken
    );

    await discordService.start();
    console.log('Bot started successfully.');
}

main().catch(console.error);

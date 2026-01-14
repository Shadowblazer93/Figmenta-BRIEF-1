import 'dotenv/config';
import { DatabaseService } from './services/DatabaseService.js';
import { ConfigService } from './services/ConfigService.js';
import { MemoryService } from './services/MemoryService.js';
import { NscaleService } from './services/NscaleService.js';
import { DiscordService } from './services/DiscordService.js';
import { KnowledgeService } from './services/KnowledgeService.js';
async function main() {
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
    const discordService = new DiscordService(configService, memoryService, aiService, knowledgeService, discordToken);
    await discordService.start();
    console.log('Bot started successfully.');
}
main().catch(console.error);

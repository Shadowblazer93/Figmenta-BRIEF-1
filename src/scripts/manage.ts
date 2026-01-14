import { DatabaseService } from '../services/DatabaseService.js';
import { ConfigService } from '../services/ConfigService.js';
import { MemoryService } from '../services/MemoryService.js';

async function main() {
    const dbService = new DatabaseService();
    await dbService.initialize();
    const configService = new ConfigService(dbService);
    const memoryService = new MemoryService(dbService);

    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'list-channels') {
        const channels = await configService.getAllowedChannels();
        console.log('Allowed Channels:', channels);
    } else if (command === 'add-channel') {
        const channelId = args[1];
        if (!channelId) {
            console.error('Usage: add-channel <channelId>');
            return;
        }
        await configService.addAllowedChannel(channelId);
        console.log(`Added channel ${channelId}`);
    } else if (command === 'remove-channel') {
        const channelId = args[1];
        if (!channelId) {
            console.error('Usage: remove-channel <channelId>');
            return;
        }
        await configService.removeAllowedChannel(channelId);
        console.log(`Removed channel ${channelId}`);
    } else if (command === 'set-system') {
        const prompt = args.slice(1).join(' ');
        if (!prompt) {
            console.error('Usage: set-system <prompt>');
            return;
        }
        await configService.setSystemInstructions(prompt);
        console.log('System instructions updated.');
    } else if (command === 'get-summary') {
        const channelId = args[1];
        if (!channelId) {
            console.error('Usage: get-summary <channelId>');
            return;
        }
        const summary = await memoryService.getSummary(channelId);
        console.log('Summary:', summary);
    } else if (command === 'reset-memory') {
        const channelId = args[1];
        if (!channelId) {
            console.error('Usage: reset-memory <channelId>');
            return;
        }
        await memoryService.clearMemory(channelId);
        console.log('Memory cleared.');
    } else {
        console.log(`
Available commands:
  list-channels
  add-channel <channelId>
  remove-channel <channelId>
  set-system <prompt text>
  get-summary <channelId>
  reset-memory <channelId>
`);
    }
}

main().catch(console.error);

import { Client, GatewayIntentBits, Message, ChannelType, Partials, REST, Routes, Interaction, SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { ConfigService } from './ConfigService.js';
import { MemoryService } from './MemoryService.js';
import { NscaleService } from './NscaleService.js';
import { KnowledgeService } from './KnowledgeService.js';

export class DiscordService {
    private client: Client;

    constructor(
        private configService: ConfigService,
        private memoryService: MemoryService,
        private aiService: NscaleService,
        private knowledgeService: KnowledgeService,
        private token: string
    ) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ],
            partials: [Partials.Channel]
        });

        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user?.tag}!`);
            this.registerCommands();
        });

        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
    }

    async start() {
        await this.client.login(this.token);
    }

    private async registerCommands() {
        if (!this.client.user) return;

        const commands = [
            new SlashCommandBuilder()
                .setName('bot-setup')
                .setDescription('Configure bot settings (Admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(sub => 
                    sub.setName('set-instructions')
                        .setDescription('Set the system instructions (persona)')
                        .addStringOption(opt => opt.setName('text').setDescription('The instructions').setRequired(true))
                )
                .addSubcommand(sub => 
                    sub.setName('allow-channel')
                        .setDescription('Add a channel to the allow-list')
                        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to allow').setRequired(false))
                )
                .addSubcommand(sub => 
                    sub.setName('remove-channel')
                        .setDescription('Remove a channel from the allow-list')
                        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to remove').setRequired(false))
                ),
            
            new SlashCommandBuilder()
                .setName('bot-memory')
                .setDescription('Manage bot memory (Admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(sub => 
                    sub.setName('reset')
                        .setDescription('Reset memory for this channel')
                )
                .addSubcommand(sub => 
                    sub.setName('view')
                        .setDescription('View current summary for this channel')
                ),
            
            // End-user commands
            new SlashCommandBuilder()
                .setName('prompt')
                .setDescription('Send a prompt to the bot')
                .addStringOption(opt => 
                    opt.setName('input')
                        .setDescription('Your prompt')
                        .setRequired(true)
                ),
            new SlashCommandBuilder()
                .setName('agent')
                .setDescription('Assign a task to the agent')
                .addStringOption(opt => 
                    opt.setName('task')
                        .setDescription('The task description')
                        .setRequired(true)
                ),
             new SlashCommandBuilder()
                .setName('knowledge-prompt')
                .setDescription('Ask the bot using the knowledge base context')
                .addStringOption(opt => 
                    opt.setName('question')
                        .setDescription('Your question')
                        .setRequired(true)
                )
        ];

        const rest = new REST({ version: '10' }).setToken(this.token);

        try {
            console.log('Started refreshing application (/) commands.');
            
            // Register globally (might take an hour to propagate) or for specific guilds if needed immediately.
            // Using global for simplicity in this brief.
            await rest.put(
                Routes.applicationCommands(this.client.user.id),
                { body: commands.map(c => c.toJSON()) },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }

    private async handleInteraction(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'bot-setup') {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'set-instructions') {
                const text = interaction.options.getString('text', true);
                await this.configService.setSystemInstructions(text);
                await interaction.reply({ content: 'System instructions updated.', ephemeral: true });
            } else if (subcommand === 'allow-channel') {
                const channel = interaction.options.getChannel('channel') || interaction.channel;
                if (channel) {
                    await this.configService.addAllowedChannel(channel.id);
                    await interaction.reply({ content: `Channel <#${channel.id}> added to allow-list.`, ephemeral: true });
                }
            } else if (subcommand === 'remove-channel') {
                const channel = interaction.options.getChannel('channel') || interaction.channel;
                if (channel) {
                    await this.configService.removeAllowedChannel(channel.id);
                    await interaction.reply({ content: `Channel <#${channel.id}> removed from allow-list.`, ephemeral: true });
                }
            }
        } else if (interaction.commandName === 'bot-memory') {
            const subcommand = interaction.options.getSubcommand();
            const channelId = interaction.channelId;

            if (subcommand === 'reset') {
                await this.memoryService.clearMemory(channelId);
                await interaction.reply({ content: 'Memory cleared for this channel.', ephemeral: true });
            } else if (subcommand === 'view') {
                await interaction.deferReply({ ephemeral: true });
                const summary = await this.memoryService.getSummary(channelId);
                const content = summary ? `**Current Summary:**\n${summary}` : 'No memory for this channel yet.';
                await this.sendChunkedReply(interaction, content);
            }
        } else if (interaction.commandName === 'knowledge-prompt') {
            await interaction.deferReply();
            const question = interaction.options.getString('question', true);

            try {
                // 1. Gather Context
                const context = await this.knowledgeService.searchRelevantContext(question);

                // 2. Generate Response
                const response = await this.aiService.generateAnswerFromKnowledge(question, context);

                await this.sendChunkedReply(interaction, response);
            } catch (error) {
                console.error('Error handling knowledge prompt:', error);
                await interaction.editReply('Sorry, something went wrong while accessing knowledge base.');
            }

        } else if (interaction.commandName === 'prompt' || interaction.commandName === 'agent') {
            await interaction.deferReply();
            
            const userInput = interaction.options.getString('input') || interaction.options.getString('task');
            if (!userInput) return;

            try {
                // Shared logic with handleMessage basically
                const systemInstructions = await this.configService.getSystemInstructions(interaction.channelId);
                const currentSummary = await this.memoryService.getSummary(interaction.channelId);

                // Fetch context
                let recentMessages: any[] = [];
                if (interaction.channel && 'messages' in interaction.channel && typeof (interaction.channel as any).messages.fetch === 'function') {
                     try {
                        const fetched = await (interaction.channel as any).messages.fetch({ limit: 5 });
                        recentMessages = Array.from(fetched.values());
                     } catch (e) {
                         console.warn('Could not fetch messages for context in slash command', e);
                     }
                }

                const sortedMessages = recentMessages
                     .sort((a: any, b: any) => a.createdTimestamp - b.createdTimestamp)
                     .map((msg: any) => ({
                         role: (msg.author.id === this.client.user?.id ? 'assistant' : 'user') as 'assistant' | 'user',
                         content: msg.content
                     }));

                // Add the slash command input as the latest user message
                sortedMessages.push({ role: 'user', content: userInput });

                const responseText = await this.aiService.generateResponse(systemInstructions, currentSummary, sortedMessages);

                await this.sendChunkedReply(interaction, responseText);

                // Update memory
                const messagesToSummarize = [...sortedMessages, { role: 'assistant', content: responseText } as const];
                const newSummary = await this.aiService.updateSummary(currentSummary, messagesToSummarize);
                await this.memoryService.updateSummary(interaction.channelId, newSummary);

            } catch (error) {
                console.error('Error handling slash command:', error);
                await interaction.editReply('Sorry, something went wrong processing your request.');
            }
        }
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        const isMentioned = this.client.user && message.mentions.has(this.client.user);
        const isAllowedChannel = await this.configService.isChannelAllowed(message.channelId);

        // Respond if mentioned OR in allowed channel
        // Note: You might want to ONLY respond to mentions in non-allowed channels, 
        // or respond to EVERYTHING in allowed channels.
        // The prompt says: "messages in allow-listed channels (or when mentioned)"
        if (!isAllowedChannel && !isMentioned) return;

        // If mentioned, remove the mention from the content to avoid confusion content
        let userContent = message.content;
        if (isMentioned && this.client.user) {
            userContent = userContent.replace(`<@!${this.client.user.id}>`, '').replace(`<@${this.client.user.id}>`, '').trim();
        }

        try {
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }

            // 1. Get Context
            const systemInstructions = await this.configService.getSystemInstructions(message.channelId);
            const currentSummary = await this.memoryService.getSummary(message.channelId);

            // 2. Fetch recent messages for immediate context (e.g. last 10 messages)
            let recentMessages: any[] = [];
            
            // Type guard to check if fetch exists (TextBasedChannel)
            if ('messages' in message.channel && typeof (message.channel as any).messages.fetch === 'function') {
                const fetched = await (message.channel as any).messages.fetch({ limit: 5 });
                recentMessages = Array.from(fetched.values());
            } else {
                 recentMessages = [message];
            }

            // Sort by created timestamp ascending
            const sortedMessages = recentMessages
                 .sort((a: any, b: any) => a.createdTimestamp - b.createdTimestamp)
                 .map((msg: any) => ({
                     role: (msg.author.id === this.client.user?.id ? 'assistant' : 'user') as 'assistant' | 'user',
                     content: msg.content
                 }));
            
            // 3. Generate Response
            const responseText = await this.aiService.generateResponse(systemInstructions, currentSummary, sortedMessages);

            // 4. Send Response
            await this.sendChunkedReply(message, responseText);

            // 5. Update Rolling Summary (async, don't block response)
            // We include the new response in the summary update
            const messagesToSummarize = [...sortedMessages, { role: 'assistant', content: responseText } as const];
            
            // We might want to throttle this or do it every N messages on high traffic channels.
            // For now, do it every time.
            const newSummary = await this.aiService.updateSummary(currentSummary, messagesToSummarize);
            await this.memoryService.updateSummary(message.channelId, newSummary);

        } catch (error) {
            console.error('Error handling message:', error);
            await message.reply('Sorry, I encountered an error processing your request.');
        }
    }

    private async sendChunkedReply(target: any, content: string) {
        const MAX_LENGTH = 1950;
        const chunks = [];
        
        while (content.length > 0) {
            if (content.length <= MAX_LENGTH) {
                chunks.push(content);
                break;
            }
            
            let chunk = content.slice(0, MAX_LENGTH);
            let splitIndex = chunk.lastIndexOf('\n');
            
            if (splitIndex === -1) {
                splitIndex = chunk.lastIndexOf(' ');
            }
            
            if (splitIndex === -1) {
                splitIndex = MAX_LENGTH;
            }

            chunks.push(content.slice(0, splitIndex));
            content = content.slice(splitIndex).trimStart();
        }

        if (chunks.length === 0) return;

        // Check if target is an interaction (has editReply) or a message (has reply)
        const isInteraction = 'editReply' in target;

        if (isInteraction) {
            try {
                await target.editReply(chunks[0]);
                for (let i = 1; i < chunks.length; i++) {
                    await target.followUp(chunks[i]);
                }
            } catch (e) {
                // Fallback if editReply fails (e.g. not deferred)
                 try {
                     await target.reply(chunks[0]);
                     for (let i = 1; i < chunks.length; i++) {
                        await target.followUp(chunks[i]);
                    }
                 } catch (e2) {
                     console.error('Failed to send interaction reply', e2);
                 }
            }
        } else {
            // Message
            await target.reply(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await target.channel.send(chunks[i]);
            }
        }
    }
}

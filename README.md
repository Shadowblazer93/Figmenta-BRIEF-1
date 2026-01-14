System Instructions for your new Discord Bot have been designed and implemented. The project is scaffolded with TypeScript, Node.js, and SQLite to ensure it is lightweight yet capable of scaling to a web dashboard in the future.

Features Implemented
Discord Bot Core: Listens for messages and handles mentions/allowed channels.
Context Assembly: Combines "System Instructions" + "Rolling Summary" + "Recent Messages" to generate responses via OpenAI.
Rolling Memory: Summarizes conversations continuously and stores them in a local SQLite database (database.sqlite).
Admin Controls: A CLI script (manage.ts) is provided to manage system instructions, allow-listed channels, and memory. This replaces the web dashboard for now.
RAG Readiness: A KnowledgeService placeholder is included for future PDF chunking/vector search layers.
Setup Instructions
Configure Environment:
Create a .env file in the root (copied from .env.example) and fill in your keys:

Start the Bot:

Admin Management (CLI):
Since the web console is for later, use the included script to manage the bot's configuration:

Add a Channel to Allow-list:
Set System Instructions (Persona/Rules):
View Rolling Summary for a Channel:
Reset Memory:
Project Structure
services
DiscordService.ts: Main bot logic (events, channel checking).
MemoryService.ts: Handles the rolling summary in SQLite.
ConfigService.ts: Manages system instructions and allowed channels.
OpenAIService.ts: Generates responses and updates conversation summaries.
DatabaseService.ts: SQLite connection and schema.
manage.ts: CLI tool for admin
tasks.
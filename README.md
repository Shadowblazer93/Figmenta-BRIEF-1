# Figmenta Discord Bot (BRIEF-1)

A sophisticated AI-powered Discord bot featuring persistent memory, configurable personas, and a RAG (Retrieval-Augmented Generation) knowledge base system.

## 🏗 Architecture & Design

The project follows a modular **Service-Oriented Architecture (SOA)** using **TypeScript**. Dependencies are managed via manual dependency injection in the entry point, ensuring loose coupling and easier testing.

### Key Components:
- **DiscordService**: Handles Discord Gateway events, slash command registration, and interaction routing. Implements smart logic for chunking large responses to bypass Discord's 2000-character limit.
- **NscaleService**: Wraps the Nscale AI API (OpenAI-compatible) to handle text generation and summarization. Uses the `Qwen/Qwen3-14B` model.
- **MemoryService**: Manages long-term conversation context using a "rolling summary" approach stored in PostgreSQL. This allows the bot to remember context indefinitely without exceeding token limits.
- **KnowledgeService**: Implements RAG functionality. Connecting to a Supabase PostgreSQL database, it performs vector/text searches to retrieve relevant documents for user queries.
- **ConfigService**: Manages dynamic configuration like allowed channels and system instructions (personas).

## 🚀 Tech Stack

### Core
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Framework**: `discord.js`
- **Database**: PostgreSQL (Supabase)
- **AI Inference**: Nscale API

### Deployment
- **Containerization**: Docker (Multi-stage build)
- **Hosting**: Fly.io
- **Admin Dashboard**: Hosted separately on Vercel

## ⚙️ Commands

### 🤖 User Commands
| Command | Description |
|---------|-------------|
| `/prompt [input]` | Chat with the bot. Uses channel memory for context. |
| `/agent [task]` | Assign a task to the bot (currently behaves similarly to prompt). |
| `/knowledge-prompt [question]` | Query the bot using the Knowledge Base. This triggers a dropdown menu to select a specific document for context. |

### 🛠 Admin Commands
| Command | Subcommand | Description |
|---------|------------|-------------|
| `/bot-setup` | `set-instructions` | Define the bot's persona/system prompt. |
| | `allow-channel` | Enable the bot in a specific channel. |
| | `remove-channel` | Disable the bot in a specific channel. |
| `/bot-memory` | `view` | View the current AI summary of the channel's conversation. |
| | `reset` | Wipe the memory/summary for the channel. |

## 📦 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Figmenta-BRIEF-1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   NSCALE_SERVICE_TOKEN=your_nscale_api_key
   DATABASE_URL=postgres://user:pass@host:port/db
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## ☁️ Deployment (Fly.io)

The project is configured for deployment on Fly.io using Docker.

1. **Install Fly CLI & Login**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Launch App**
   (First time only)
   ```bash
   fly launch --no-deploy
   ```

3. **Set Secrets**
   Fly.io requires secrets to be set explicitly:
   ```bash
   fly secrets set DISCORD_TOKEN=... NSCALE_SERVICE_TOKEN=... DATABASE_URL=...
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

## 🖥️ Admin Dashboard

The Admin Dashboard is a separate Next.js application hosted on **Vercel**. It connects to the same Supabase database to manage the `knowledge_base` table (uploading files, viewing entries).

Ensuring separation of concerns, the Bot repository handles **usage** of data, while the Dashboard repository handles **management** of data.

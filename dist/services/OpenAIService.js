import OpenAI from 'openai';
export class OpenAIService {
    openai;
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }
    async generateResponse(systemInstructions, summary, recentMessages) {
        const messages = [
            { role: 'system', content: systemInstructions },
        ];
        if (summary) {
            messages.push({ role: 'system', content: `Previous conversation summary: ${summary}` });
        }
        recentMessages.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o', // or gpt-3.5-turbo if 4o not available/too expensive, but 4o is good for context.
            messages: messages,
        });
        return completion.choices[0]?.message?.content || 'I am unable to respond at this moment.';
    }
    async updateSummary(currentSummary, newMessages) {
        const messages = [
            { role: 'system', content: 'You are a helpful assistant that summarizes conversations. meaningful details should be preserved. Be concise.' }
        ];
        let content = "Please update the following summary with the new messages:\n\n";
        if (currentSummary) {
            content += `Current Summary: ${currentSummary}\n\n`;
        }
        content += "New Messages:\n";
        newMessages.forEach(msg => {
            content += `${msg.role}: ${msg.content}\n`;
        });
        messages.push({ role: 'user', content });
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // lower cost model for summarization
            messages: messages,
        });
        return completion.choices[0]?.message?.content || currentSummary;
    }
}

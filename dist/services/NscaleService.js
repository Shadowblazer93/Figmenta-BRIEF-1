import OpenAI from 'openai';
export class NscaleService {
    client;
    model;
    constructor(apiKey) {
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://inference.api.nscale.com/v1'
        });
        this.model = 'Qwen/Qwen3-14B';
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
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
            });
            return completion.choices[0]?.message?.content || 'I am unable to respond at this moment.';
        }
        catch (error) {
            console.error('Nscale API Error:', error);
            return 'Sorry, I am having trouble connecting to my brain right now.';
        }
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
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
            });
            return completion.choices[0]?.message?.content || currentSummary;
        }
        catch (error) {
            console.error('Nscale API Error (Summary):', error);
            return currentSummary;
        }
    }
    async generateAnswerFromKnowledge(prompt, context) {
        const messages = [
            { role: 'system', content: 'You are a helpful assistant. Use the provided context to answer the user question. If the answer is not in the context, say so, but try to be helpful.' },
        ];
        if (context) {
            messages.push({ role: 'system', content: `Context information:\n${context}` });
        }
        messages.push({ role: 'user', content: prompt });
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
            });
            return completion.choices[0]?.message?.content || 'I could not generate an answer.';
        }
        catch (error) {
            console.error('Nscale API Error (Knowledge):', error);
            return 'Sorry, I encountered an error while processing the knowledge base.';
        }
    }
}

import { InferenceClient } from '@huggingface/inference';
export class HuggingFaceService {
    client;
    model;
    constructor(apiKey) {
        this.client = new InferenceClient(apiKey);
        // Using the requested model
        this.model = 'openai/gpt-oss-20b:groq';
    }
    async generateResponse(systemInstructions, summary, recentMessages) {
        // Mistral (and some other HF models) via API can be sensitive to 'system' role.
        // We prepend instructions to the first user message or create a user message if needed.
        let fullSystemContext = systemInstructions;
        if (summary) {
            fullSystemContext += `\n\nPrevious conversation summary: ${summary}`;
        }
        const messages = [];
        // Add recent messages
        recentMessages.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });
        // Ensure we have at least one message
        if (messages.length === 0) {
            // Should not happen technically given the call site, but safely handle
            messages.push({ role: 'user', content: 'Hello.' });
        }
        // Re-strategy: simpler approach.
        // Just map 'system' role to 'user' role with a prefix.
        const safeMessages = [
            { role: 'user', content: `SYSTEM INSTRUCTIONS: ${fullSystemContext}` },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];
        try {
            const completion = await this.client.chatCompletion({
                model: this.model,
                messages: safeMessages,
                max_tokens: 500
            });
            return completion.choices[0]?.message?.content || 'I am unable to respond at this moment.';
        }
        catch (error) {
            console.error('Hugging Face API Error:', error);
            if (error?.body) {
                console.error('API Error Body:', JSON.stringify(error.body, null, 2));
            }
            return 'Sorry, I am having trouble connecting to my brain right now.';
        }
    }
    async updateSummary(currentSummary, newMessages) {
        // Consolidate into a single user prompt for summarization to avoid role issues.
        let prompt = 'You are a helpful assistant that summarizes conversations. Meaningful details should be preserved. Be concise. Output ONLY the summary.\n\n';
        prompt += "Please update the following summary with the new messages:\n\n";
        if (currentSummary) {
            prompt += `Current Summary: ${currentSummary}\n\n`;
        }
        prompt += "New Messages:\n";
        newMessages.forEach(msg => {
            prompt += `${msg.role}: ${msg.content}\n`;
        });
        const messages = [
            { role: 'user', content: prompt }
        ];
        try {
            const completion = await this.client.chatCompletion({
                model: this.model,
                messages: messages,
                max_tokens: 300
            });
            return completion.choices[0]?.message?.content || currentSummary;
        }
        catch (error) {
            console.error('Hugging Face API Error (Summary):', error);
            if (error?.body) {
                console.error('API Error Body:', JSON.stringify(error.body, null, 2));
            }
            return currentSummary;
        }
    }
}

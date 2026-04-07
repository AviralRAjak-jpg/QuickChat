import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiService = {
  async getSuggestedReplies(messages: string[]) {
    if (messages.length === 0) return [];
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on the following chat history, suggest 3 short, natural-sounding replies the user could send. Return ONLY a JSON array of strings.
        
        Chat history:
        ${messages.join('\n')}
        `,
        config: {
          responseMimeType: 'application/json',
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  },

  async summarizeChat(messages: string[]) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following chat conversation in a concise paragraph. Focus on the main topics discussed and any decisions made.
        
        Chat history:
        ${messages.join('\n')}
        `,
      });
      return response.text || 'Could not generate summary.';
    } catch (error) {
      console.error('Error summarizing chat:', error);
      return 'Error generating summary.';
    }
  },

  async convertToNotes(messages: string[]) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Convert the following chat conversation into a structured list of notes and action items. Use bullet points.
        
        Chat history:
        ${messages.join('\n')}
        `,
      });
      return response.text || 'Error generating notes.';
    } catch (error) {
      console.error('Error converting to notes:', error);
      return 'Error generating notes.';
    }
  },

  async generateAIResponse(message: string) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: message,
        config: {
          systemInstruction: "You are QuickChat AI, a helpful and friendly assistant. Keep your responses concise and conversational."
        }
      });
      return response.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error('AI Error:', error);
      return "I'm having some trouble thinking right now. Please try again later.";
    }
  }
};

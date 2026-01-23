import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, GenerateContentResponse, GenerateContentRequest } from '@google/genai';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body: GenerateContentRequest = request.body;

        if (!process.env.API_KEY) {
            return response.status(500).json({ error: 'API_KEY environment variable not set.' });
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const geminiResponse: GenerateContentResponse = await ai.models.generateContent(body);

        return response.status(200).json(geminiResponse);

    } catch (error: any) {
        console.error("Error in serverless function:", error);
        return response.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
}

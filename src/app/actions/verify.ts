'use server'

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Create Google provider with explicit v1 API endpoint
// The baseURL must point to v1, not v1beta
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function verifyNews(headline: string) {
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-pro'),
      prompt: `Analyze the following for factual accuracy: "${headline}". 
      Give a Trust Score (0-100%) and a quick summary.`,
    });

    return text;
  } catch (error) {
    console.error('Verification error:', error);
    return `Connection Error: ${
      error instanceof Error ? error.message : 'Please check your API key'
    }`;
  }
}
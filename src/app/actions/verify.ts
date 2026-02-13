'use server'

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Configure Google provider to use the stable v1 API
const google = createGoogleGenerativeAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1',
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function verifyNews(headline: string) {
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: `Analyze the following for factual accuracy: "${headline}". 
      Give a Trust Score (0-100%) and a quick summary.`,
    });

    return text;
  } catch (error) {
    console.error(error);
    return `Connection Error: ${
      error instanceof Error ? error.message : 'Please check your API key'
    }`;
  }
}
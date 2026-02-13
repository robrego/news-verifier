'use server'

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function verifyNews(headline: string) {
  try {
    const { text } = await generateText({
      model: google('gemini-pro'),
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
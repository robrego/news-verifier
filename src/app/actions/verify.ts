'use server'

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import * as cheerio from 'cheerio';

// Helper function to check if input is a URL
function isURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper function to fetch and parse article content
async function fetchArticleContent(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      'Article Title Not Found';

    let content = '';
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '.content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        element.find('script, style, nav, footer, aside, .ad, .advertisement').remove();
        content = element.text().trim();
        if (content.length > 200) break;
      }
    }

    if (!content || content.length < 200) {
      content = $('p').map((_, el) => $(el).text()).get().join(' ').trim();
    }

    if (content.length > 5000) {
      content = content.substring(0, 5000) + '...';
    }

    return { title: title.trim(), content: content.trim() || 'Content could not be extracted' };
  } catch (error) {
    throw new Error(`Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function verifyNews(input: string) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return 'Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.';
    }

    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let headline = input;
    let articleContent = '';
    let articleTitle = '';

    if (isURL(input)) {
      try {
        const article = await fetchArticleContent(input);
        articleTitle = article.title;
        articleContent = article.content;
        headline = articleTitle;
      } catch (error) {
        return `Error fetching article: ${error instanceof Error ? error.message : 'Failed to fetch article content'}`;
      }
    }

    // Prompts updated to strictly require bullet points (•) for your frontend regex
    const prompt = articleContent
      ? `Conduct a forensic analysis of this article. 
         Today's Date: ${currentDate}
         URL: ${input}
         Title: ${articleTitle}
         Content: ${articleContent}

         Structure your response EXACTLY with these headers:

         Trust Score: [Number 0-100 only]

         **Factual Consensus**
         • [Provide bullet points starting with "• " comparing this to verified reports.]

         **Logical Fallacies Detected**
         • [Identify manipulative techniques in bullet points, or state "• None identified".]

         **Supporting Evidence**
         • [Provide 2-3 specific stats or numbers in bullet points.]

         **Source Reliability & Verdict**
         • [Final judgment on the outlet and claim in bullet points.]`
      : `Conduct a forensic analysis of this headline.
         Today's Date: ${currentDate}
         Headline: "${headline}"

         If this is a Google News link, resolve the final destination via search.

         Structure your response EXACTLY with these headers:

         Trust Score: [Number 0-100 only]

         **Factual Consensus**
         • [Verify if this headline aligns with known facts using bullet points starting with "• ".]

         **Logical Fallacies Detected**
         • [Identify "Loaded Language" or "Clickbait" techniques using bullet points.]

         **Supporting Evidence**
         • [Provide specific numbers or cross-reference counts found via search using bullet points.]

         **Source Reliability & Verdict**
         • [Assess the credibility of the claim using bullet points.]`;

    // Retaining your "as any" overrides to prevent local strictness issues.
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        googleSearch: google.tools.googleSearch({}) as any,
      },
      maxSteps: 3, 
      prompt: `
      You MUST use the googleSearch tool to verify if this story is real news.
      
      ${prompt}`,
    } as any);

    return text;
  
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Connection Error: ${errorMessage}`;
  }
}
'use server'

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import * as cheerio from 'cheerio';

function isURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchArticleContent(url: string): Promise<{ title: string; content: string; date: string }> {
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

    let date = 
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('time').attr('datetime') ||
      'Date Not Found';

    let content = '';
    const contentSelectors = [
      'article', '[role="article"]', '.article-content', 
      '.post-content', '.entry-content', 'main', '.content',
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

    return { 
      title: title.trim(), 
      content: content.trim() || 'Content could not be extracted',
      date: date.trim()
    };
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
    let articleDate = '';

    if (isURL(input)) {
      try {
        const article = await fetchArticleContent(input);
        articleTitle = article.title;
        articleContent = article.content;
        articleDate = article.date;
        headline = articleTitle;
      } catch (error) {
        return `Error fetching article: ${error instanceof Error ? error.message : 'Failed to fetch article content'}`;
      }
    }

    const prompt = articleContent
      ? `Conduct a forensic analysis of this article to determine its historical and factual accuracy.
         URL: ${input}
         Title: ${articleTitle}
         Published Date: ${articleDate}
         Content: ${articleContent}

         Structure your response EXACTLY in this format:

         [Write exactly ONE short sentence summarizing your findings]

         Trust Score: [Number 0-100 only]

         **Factual Consensus**
         • [First short bullet point confirming if this event actually happened]
         • [Second short bullet point with extra context]

         **Logical Fallacies Detected**
         • [First short bullet point identifying manipulation, or "None identified"]
         • [Second short bullet point if applicable]

         **Supporting Evidence**
         • [First short bullet point with specific stats/numbers]
         • [Second short bullet point with specific stats/numbers]

         **Source Reliability & Verdict**
         • [First short bullet point on the outlet's credibility]
         • [Second short bullet point on the final verdict]

         **Sources Investigated**
         • [Full Article URL 1 - MUST NOT CONTAIN GOOGLE.COM]
         • [Full Article URL 2 - MUST NOT CONTAIN GOOGLE.COM]
         • [Full Article URL 3 - MUST NOT CONTAIN GOOGLE.COM]`
      : `Conduct a forensic analysis of this headline.
         Headline: "${headline}"

         Structure your response EXACTLY in this format:

         [Write exactly ONE short sentence summarizing your findings]

         Trust Score: [Number 0-100 only]

         **Factual Consensus**
         • [First short bullet point confirming if this event actually happened]
         • [Second short bullet point with extra context]

         **Logical Fallacies Detected**
         • [First short bullet point identifying manipulation, or "None identified"]
         • [Second short bullet point if applicable]

         **Supporting Evidence**
         • [First short bullet point with specific stats/numbers]
         • [Second short bullet point with specific stats/numbers]

         **Source Reliability & Verdict**
         • [First short bullet point on the outlet's credibility]
         • [Second short bullet point on the final verdict]

         **Sources Investigated**
         • [Full Article URL 1 - MUST NOT CONTAIN GOOGLE.COM]
         • [Full Article URL 2 - MUST NOT CONTAIN GOOGLE.COM]
         • [Full Article URL 3 - MUST NOT CONTAIN GOOGLE.COM]`;

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      temperature: 0.1, 
      maxSteps: 3, 
      tools: {
        googleSearch: google.tools.googleSearch({}) as any,
      },
      system: `You are an elite, ruthlessly objective forensic journalist. Verify claims using the googleSearch tool. 
      
      TODAY'S DATE: ${currentDate}

      STRICT RULES:
      1. MANDATORY SEARCH: You MUST use the googleSearch tool to investigate the core claims before answering. Your internal knowledge is outdated. Treat every claim as potential breaking news that requires live verification.
      2. FORMATTING: Use extremely concise, punchy statements (MAXIMUM 15 WORDS PER BULLET). Do not write long sentences.
      3. URLS ONLY: Under "Sources Investigated", output EXACTLY 3 distinct, full URLs from specific news articles you found (e.g., https://apnews.com/...). NEVER output generic search links (Ban ANY URL containing "google.com").
      4. TEMPORAL CONTEXT: Evaluate the facts based on when the events occurred. If verifying a past event, search to confirm if the event historically happened.
      5. NEVER guess or invent information. Cross-reference claims using major wire services (AP, Reuters, Bloomberg, BBC).`,
      
      prompt: prompt,
    } as any);

    return text;
  
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Connection Error: ${errorMessage}`;
  }
}
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

    // Try to extract title from various meta tags and headings
    let title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      'Article Title Not Found';

    // Extract main content - try common article selectors
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
        // Remove script and style elements
        element.find('script, style, nav, footer, aside, .ad, .advertisement').remove();
        content = element.text().trim();
        if (content.length > 200) break; // Found substantial content
      }
    }

    // Fallback: get all paragraph text
    if (!content || content.length < 200) {
      content = $('p').map((_, el) => $(el).text()).get().join(' ').trim();
    }

    // Limit content length to avoid token limits
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
    // Check if API key is set
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return 'Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.';
    }

    // Get current date for context
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let headline = input;
    let articleContent = '';
    let articleTitle = '';

    // Check if input is a URL
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

    // Build the prompt based on whether we have article content
    const prompt = articleContent
      ? `You are a professional forensic fact-checker with expertise in media literacy, logical analysis, and information verification. Conduct a comprehensive forensic analysis of the following news article.

Today's date is: ${currentDate}

Article Title: "${articleTitle}"
Article URL: ${isURL(input) ? input : 'N/A'}

Article Content:
${articleContent}

Provide a structured forensic analysis with the following components:

1. **Trust Score**: A numeric score from 0-100 indicating the overall credibility and factual accuracy of this article. Consider factors such as:
   - Factual accuracy of claims
   - Source reliability
   - Evidence quality
   - Bias and objectivity
   - Context completeness

2. **Logical Fallacies Detected**: Identify any logical fallacies, rhetorical devices, or manipulative techniques present in the article. List them clearly (e.g., "Ad Hominem", "False Dilemma", "Appeal to Emotion", "Cherry Picking", "Strawman Argument", etc.). If none are detected, state "No significant logical fallacies detected."

3. **Factual Consensus**: Provide a concise summary that includes:
   - What claims are being made
   - Which claims can be verified as factually accurate
   - Which claims are unverified, disputed, or potentially false
   - Missing context or important information
   - Overall assessment of the article's reliability and journalistic integrity

Format your response as:
**Trust Score**: [number]%
**Logical Fallacies Detected**: [list or "None"]
**Factual Consensus**: [detailed analysis]`
      : `You are a professional forensic fact-checker with expertise in media literacy, logical analysis, and information verification. Conduct a comprehensive forensic analysis of the following news headline.

Today's date is: ${currentDate}

Headline to analyze: "${headline}"

Provide a structured forensic analysis with the following components:

1. **Trust Score**: A numeric score from 0-100 indicating the overall credibility and factual accuracy of this headline. Consider factors such as:
   - Factual accuracy of claims
   - Source reliability (if implied)
   - Sensationalism or clickbait potential
   - Context completeness
   - Bias indicators

2. **Logical Fallacies Detected**: Identify any logical fallacies, rhetorical devices, or manipulative techniques present in the headline. List them clearly (e.g., "Appeal to Emotion", "False Dichotomy", "Loaded Language", "Cherry Picking", etc.). If none are detected, state "No significant logical fallacies detected."

3. **Factual Consensus**: Provide a concise summary that includes:
   - What the headline claims
   - Whether the claim aligns with known facts
   - Any red flags or concerns about credibility
   - Missing context that might be important
   - Overall assessment of the headline's reliability

Format your response as:
**Trust Score**: [number]%
**Logical Fallacies Detected**: [list or "None"]
**Factual Consensus**: [detailed analysis]`;

    // Using gemini-2.5-flash with default provider (v1beta)
    // Note: gemini-2.5-flash is only available in v1beta, not v1
    // The default google() provider automatically uses the correct API version
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
    });

    return text;
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Connection Error: ${errorMessage}`;
  }
}
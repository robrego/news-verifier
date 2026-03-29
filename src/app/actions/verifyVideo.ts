'use server'

import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// --- PART 1: THE EXTRACTOR (SUPADATA RAPIDAPI) ---
export async function fetchYouTubeTranscript(videoUrl: string) {
  console.log(`\n--- 🎬 YOUTUBE EXTRACTION START ---`);
  
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return { success: false, error: 'RAPIDAPI_KEY is missing from environment variables.' };
  }

  try {
    // Call the Supadata API to bypass YouTube's IP blocks
    const response = await fetch(`https://youtube-transcripts.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(videoUrl)}&chunkSize=500`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube-transcripts.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Supadata returns an array of chunks in data.content
    if (!data.content || !Array.isArray(data.content)) {
      return { success: false, error: 'No transcript found for this video. It might not have closed captions.' };
    }

    // Map through the chunks and stitch them together
    const fullText = data.content.map((chunk: any) => chunk.text).join(' ');

    const wordCount = fullText.trim().split(/\s+/).length;
    console.log(`✅ Success! Extracted ${wordCount} words via RapidAPI.`);
    
    return { success: true, text: fullText };

  } catch (error) {
    console.error(`❌ Extraction Failed:`, error);
    return { success: false, error: `Proxy failed to extract transcript. Please use the manual override.` };
  }
}

// --- PART 2: AGENT 1 (THE AGGRESSIVE EXTRACTOR) ---
export async function summarizeAndExtractClaims(transcript: string) {
  console.log('\n🧠 [Agent 1] Reading transcript and hunting for extreme claims...');
  
  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      temperature: 0.1, 
      system: `You are an aggressive, highly skeptical investigative journalist. 
      Your job is to read a raw video transcript and hunt for the most controversial, unbelievable, or potentially misleading claims.

      STRICT RULES:
      1. YOU MUST OUTPUT EVERYTHING IN ENGLISH. No matter what language the transcript is in, your summary and quotes must be in English.
      2. Extract EXACTLY the top 3 most extreme, disputed, or central claims AS DIRECT VERBATIM QUOTES from the transcript. Do not paraphrase. Find the exact words they said.
      3. You MUST output your response in strict JSON format. NO MARKDOWN.
      
      EXPECTED FORMAT:
      {
        "summary": "Your summary here.",
        "claims": ["Exact quote 1", "Exact quote 2", "Exact quote 3"]
      }`,
      prompt: `Transcript:\n\n${transcript.substring(0, 20000)}`, 
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }
    
    cleanedText = cleanedText.replace(/[\u0000-\u001F]+/g, ""); 

    const parsedData = JSON.parse(cleanedText);
    
    // Surgical Clean: Remove brackets from the summary and claims only
    if (parsedData.summary) {
      parsedData.summary = parsedData.summary.replace(/[\[\]()]/g, "").trim();
    }
    if (parsedData.claims) {
      parsedData.claims = parsedData.claims.map((c: string) => c.replace(/[\[\]()]/g, "").trim());
    }

    console.log('✅ [Agent 1] Successfully cleaned and parsed data!');
    return { success: true, data: parsedData };

  } catch (error) {
    console.error('❌ [Agent 1] JSON Parse Error:', error);
    return { success: false, error: 'Agent 1 failed to format the claims correctly.' };
  }
}

// --- PART 3: AGENT 2 (THE RESEARCHER) ---
export async function searchBraveForClaims(claims: string[]) {
  console.log(`\n🔎 [Agent 2] Searching the web for ${claims.length} claims in parallel...`);
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'Brave API key is missing from .env.local' };
  }

  try {
    const searchPromises = claims.map(async (claim, index) => {
      console.log(`   -> Querying Claim ${index + 1}: "${claim.substring(0, 40)}..."`);
      
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(claim)}&count=3`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Brave Search failed with status ${response.status}`);
      }

      const data = await response.json();
      const snippets = data.web?.results?.map((r: any) => r.description).join(' | ') || 'No evidence found.';
      
      return `CLAIM ${index + 1}: ${claim}\nLIVE WEB EVIDENCE: ${snippets}\n`;
    });

    const rawResults = await Promise.all(searchPromises);
    const compiledEvidence = rawResults.join('\n---\n');

    console.log('✅ [Agent 2] Successfully gathered all web evidence!');
    return { success: true, evidence: compiledEvidence };

  } catch (error) {
    console.error('❌ [Agent 2] Error during web search:', error);
    return { success: false, error: 'Agent 2 encountered an error while searching the web.' };
  }
}

/// --- PART 4: AGENT 3 (THE RUTHLESS JUDGE) ---
export async function generateFinalVerdict(summary: string, claims: string[], evidence: string) {
  console.log('\n⚖️ [Agent 3] Weighing the evidence and generating final verdict...');
  
  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      temperature: 0.2, 
      system: `You are a world-class investigative journalist and fact-checker. 

      WRITING STYLE RULES:
      1. NEVER use the phrase "live web evidence" or "the search results state."
      2. SPEAK WITH AUTHORITY. Instead of saying "The evidence shows that X is true," just say "X is true according to [Source]."
      3. BE PUNCHY. Use active verbs. Don't be repetitive.
      4. ALL OUTPUT MUST BE IN ENGLISH.

      SCORING RULES:
      - Assign a Trust Score (0-100). 
      - Be ruthless. If a claim is a "fun myth" with no scientific backing, score it low.

      STRICT OUTPUT FORMAT:
      [Write a 2-3 sentence overarching conclusion here.]
      Trust Score: [0-100]

      **Analyzed Quotes**
      • "[English Quote 1]" - [Directly state the facts here. e.g., "This is confirmed by a Stanford study which found that..."]
      • "[English Quote 2]" - [Directly state the facts here. e.g., "While popular, this is actually a common myth; neurological data suggests..."]
      • "[English Quote 3]" - [Directly state the facts here.]

      **Source Reliability & Verdict**
      • Final Verdict: [e.g., "Scientifically Verified", "Social Hyperbole", "Factually Inaccurate"]
      `,
      prompt: `SUMMARY:\n${summary}\n\nQUOTES:\n${JSON.stringify(claims)}\n\nRESEARCH DATA:\n${evidence}`
    });

    console.log('✅ [Agent 3] High-authority verdict generated!');
    return { success: true, analysis: text };

  } catch (error) {
    console.error('❌ [Agent 3] Failed:', error);
    return { success: false, error: 'Agent 3 failed.' };
  }
}
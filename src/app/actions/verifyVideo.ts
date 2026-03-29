'use server'

import { YoutubeTranscript } from 'youtube-transcript-plus';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// --- PART 1: THE EXTRACTOR ---
export async function fetchYouTubeTranscript(videoUrl: string) {
  console.log(`\n--- 🎬 YOUTUBE EXTRACTION START ---`);
  
  try {
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
    
    // 🧹 SANITIZER: Clean up HTML entities and raw newlines that break JSON parsing
    const fullText = transcriptArray
      .map(item => item.text)
      .filter(Boolean) 
      .join(' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/[\n\r]+/g, ' '); 
    
    const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
    
    if (wordCount === 0) {
      return { success: false, error: 'YouTube returned an empty transcript. Missing English CCs.' };
    }

    console.log(`✅ Success! Extracted ${wordCount} words.`);
    return { success: true, text: fullText };

  } catch (error) {
    console.error(`❌ Extraction Failed:`, error);
    return { success: false, error: `Could not extract transcript. YouTube might be blocking the request.` };
  }
}

// --- PART 2: AGENT 1 (THE AGGRESSIVE EXTRACTOR) ---
export async function summarizeAndExtractClaims(transcript: string) {
  console.log('\n🧠 [Agent 1] Reading transcript and hunting for extreme claims...');
  
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      temperature: 0.1, 
      system: `You are an aggressive, highly skeptical investigative journalist. 
      Your job is to read a raw video transcript and hunt for the most controversial, unbelievable, or potentially misleading claims.

      STRICT RULES:
      1. Write a 3-sentence summary of the main arguments.
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
    console.log('✅ [Agent 1] Successfully extracted quotes!');
    
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

// --- PART 4: AGENT 3 (THE RUTHLESS JUDGE) ---
export async function generateFinalVerdict(summary: string, claims: string[], evidence: string) {
  console.log('\n⚖️ [Agent 3] Weighing the evidence and generating final verdict...');
  
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      temperature: 0.2, 
      system: `You are a ruthless, highly critical fact-checking AI. You are reviewing claims from a video/podcast against live web evidence.

      Your job is to assign a Trust Score (0-100). 
      - If the claims are wild speculation, unproven, or partially false, the score MUST be below 50. 
      - Only give scores above 80 if the claims are universally accepted scientific or historical facts. 
      - Do not give the video the "benefit of the doubt." If evidence is weak, grade harshly.

      STRICT OUTPUT FORMAT:
      You must output a highly structured report exactly like this:
      
      [Write a 2-3 sentence overarching conclusion here.]
      Trust Score: [0-100]

      **Analyzed Quotes**
      • "[Insert Exact Quote 1 Here]" - [Write your factual analysis of this quote based on the evidence]
      • "[Insert Exact Quote 2 Here]" - [Write your factual analysis of this quote based on the evidence]
      • "[Insert Exact Quote 3 Here]" - [Write your factual analysis of this quote based on the evidence]

      **Source Reliability & Verdict**
      • Final Verdict: [e.g., "Highly Credible", "Mixed Accuracy", "Factually Incorrect", "Unverified Speculation"]
      `,
      prompt: `VIDEO SUMMARY:\n${summary}\n\nQUOTES EXTRACTED:\n${JSON.stringify(claims)}\n\nLIVE WEB EVIDENCE:\n${evidence}`
    });

    console.log('✅ [Agent 3] Final verdict generated!');
    return { success: true, analysis: text };

  } catch (error) {
    console.error('❌ [Agent 3] Failed to generate verdict:', error);
    return { success: false, error: 'Agent 3 failed to generate the final analysis.' };
  }
}
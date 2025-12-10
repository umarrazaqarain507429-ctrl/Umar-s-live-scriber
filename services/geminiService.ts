import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const checkApiKey = () => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment configuration.");
  }
};

const ANALYSIS_SYSTEM_INSTRUCTION = `You are an AI assistant designed to process both live streaming audio and pre-recorded audio 
from meetings, classes, or discussions.

You will receive either:
- Chunks of live transcript text (from real-time speech-to-text), or
- Full transcripts from pre-recorded audio.

The transcript may contain speaker labels (e.g., "Speaker 1:", "Speaker 2:"). 
Your job is to:
1. Continuously clean and understand the incoming transcript.
2. Summarize the discussion in clear, concise language.
3. Track topics and highlight any topic changes.
4. Extract decisions, key points, questions, tasks, and ideas.
5. Keep an updated list of action items, responsibilities, and deadlines. ATTRIBUTE these to specific speakers if possible (e.g., "John (Speaker 1) to send email").
6. If a speaker identifies themselves (e.g., "Hi, I'm Sarah"), map "Speaker X" to that name in your analysis.
7. Identify technical, project, or hackathon-relevant insights.
8. If requested, produce a final polished summary covering the full meeting/audio.

For every transcript input (live chunk or full recording), respond using this structure in Markdown:

### Updated Summary So Far
- Concise summary of all main points up to now.

### Key Points / Decisions
- Bullet points of the latest information, ideas, or decisions.

### Action Items
- Tasks, assignments, deadlines, or next steps mentioned (with owners if known).

### Important Names / Topics
- People, tools, topics, or concepts referenced.

### Project / Technical Insights
- Ideas or technical suggestions relevant to a project or hackathon.

### Polished Project Idea (if applicable)
- A refined paragraph summarizing the project concept based on the discussion.

Guidelines:
- Clean up transcripts naturally (remove filler words, repetitions, false starts).
- Never invent details; summarize only what was said.
- Treat live audio as a continuous flow; pre-recorded audio as complete sections.
- If the user says “final summary,” produce a complete, well-structured summary.
- If the input is empty or just noise, just return "Waiting for meaningful input..."
`;

/**
 * Transcribes an audio blob using Gemini 2.5 Flash.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  checkApiKey();
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: `Transcribe the audio accurately. 
            - Identify distinct speakers if possible and label them (e.g., "Speaker 1:", "Speaker 2:").
            - Use "Speaker 1" for the primary speaker if unsure.
            - Start a new line for each speaker change.
            - Format: "Speaker X: [Text]".
            - If audio is silent or unintelligible, return an empty string.`
          }
        ]
      }
    });
    
    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Transcription error:", error);
    
    let message = "Transcription failed.";
    const errString = String(error);
    if (errString.includes("401") || errString.includes("403")) message = "Invalid API Key or unauthorized access.";
    if (errString.includes("429")) message = "Usage limit exceeded. Please wait a moment.";
    if (errString.includes("500")) message = "Gemini service temporarily unavailable.";
    
    throw new Error(message);
  }
};

/**
 * Analyzes the accumulated transcript to produce structured insights.
 */
export const analyzeTranscript = async (fullTranscript: string): Promise<string> => {
  checkApiKey();
  if (!fullTranscript.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Flash for speed, could upgrade to Pro for deeper reasoning if needed
      config: {
        systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      },
      contents: {
        parts: [
          { text: `Current Transcript:\n\n${fullTranscript}` }
        ]
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Analysis error:", error);
    let message = "Analysis failed.";
    const errString = String(error);
    if (errString.includes("429")) message = "Analysis quota exceeded. Retrying later.";
    throw new Error(message);
  }
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
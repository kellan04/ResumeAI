import { GoogleGenAI, Type } from "@google/genai";
import { ResumeProfile, OptimizationResult } from '../types';
import { getAISettings } from './storageService';

// --- Types & Schemas ---
const resumeSchemaProps = {
  name: "string",
  title: "string (Current or target job title)",
  email: "string",
  phone: "string",
  location: "string",
  summary: "string",
  skills: ["string"],
  experience: [{
    company: "string",
    role: "string",
    startDate: "string",
    endDate: "string",
    current: "boolean",
    description: "string (Bullet points or description of the role)"
  }],
  education: [{
    institution: "string",
    degree: "string",
    startDate: "string",
    endDate: "string"
  }]
};

const optimizationSchemaProps = {
  score: "integer (0-100)",
  missingKeywords: ["string"],
  vaguePoints: [{
    experienceId: "string (The specific section or experience context)",
    suggestion: "string (Detailed actionable advice. Provide 5-10 items focusing on quantification and impact)"
  }],
  summarySuggestion: "string",
  matchAnalysis: "string"
};

// --- Helper Functions ---

const getEnvApiKey = () => {
  try {
    // Check if process is defined (Node/Bundler env)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
};

const getGeminiClient = (apiKey: string) => {
  // Priority: User Settings > Environment Variable
  const key = apiKey || getEnvApiKey();
  if (!key) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
};

async function openAIFetch(
  endpoint: string, 
  apiKey: string, 
  model: string, 
  messages: {role: string, content: string}[],
  responseFormat?: any
) {
  if (!apiKey) throw new Error("MISSING_API_KEY");

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        response_format: responseFormat ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `API Error (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errText;
      } catch {
        errMsg = errText;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e: any) {
    console.error("OpenAI Fetch Error:", e);
    throw new Error(e.message || "Failed to connect to AI provider.");
  }
}

const handleAIError = (e: any) => {
  console.error("AI Service Error:", e);
  
  if (e.message?.includes("Unsupported MIME type")) {
    throw new Error("The AI model does not support this file format. Please try uploading a PDF or copy/paste the text.");
  }

  if (e.message === "MISSING_API_KEY") {
    throw new Error("API Key is missing. Please configure it in the Settings menu (Gear icon).");
  }
  
  if (e.message?.includes("401") || e.message?.includes("403")) {
    throw new Error("Invalid API Key or Permissions. Please check your Settings.");
  }
  
  // Pass through other errors (like INVALID_ARGUMENT if not MIME related)
  // or wrap them
  if (e.message?.includes("INVALID_ARGUMENT")) {
     // Often implies malformed request, but let's just pass the message unless we know it's auth
     throw new Error(`AI Request Error: ${e.message}`);
  }
  
  throw e;
};

// --- Main Service Functions ---

// Parse unstructured text or file content into a structured resume object
export const parseResumeText = async (input: string | { data: string; mimeType: string }): Promise<Partial<ResumeProfile>> => {
  try {
    const settings = await getAISettings();
    
    // Gemini Path
    if (settings.provider === 'gemini') {
      const ai = getGeminiClient(settings.apiKey);
      let contents;
      if (typeof input === 'string') {
        contents = `Extract resume information from the following text and format it into JSON. Text: "${input}"`;
      } else {
        contents = {
          parts: [{ inlineData: { mimeType: input.mimeType, data: input.data } }, { text: "Extract resume information from this document and format it into JSON." }]
        };
      }

      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-3-flash-preview',
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
               name: { type: Type.STRING },
               title: { type: Type.STRING },
               email: { type: Type.STRING },
               phone: { type: Type.STRING },
               location: { type: Type.STRING },
               summary: { type: Type.STRING },
               skills: { type: Type.ARRAY, items: { type: Type.STRING } },
               experience: {
                 type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                   company: { type: Type.STRING }, role: { type: Type.STRING }, startDate: { type: Type.STRING }, endDate: { type: Type.STRING }, current: { type: Type.BOOLEAN }, description: { type: Type.STRING }
                 }}
               },
               education: {
                 type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                   institution: { type: Type.STRING }, degree: { type: Type.STRING }, startDate: { type: Type.STRING }, endDate: { type: Type.STRING }
                 }}
               }
            }
          }
        }
      });
      if (response.text) return JSON.parse(response.text) as Partial<ResumeProfile>;
      throw new Error("AI returned empty response.");
    } 
    
    // OpenAI Compatible Path
    else {
      const prompt = typeof input === 'string' ? input : "Processing file content is not fully supported in this mode for all providers without OCR. Please paste text if possible.";
      
      let userContent = "";
      if (typeof input === 'string') {
        userContent = input;
      } else {
          if (input.mimeType.includes('image')) {
             // Vision supported potentially
             // For now, prompt user to use text if using generic providers with files
          } else {
              throw new Error("For non-Gemini models, please copy and paste the text directly, as document parsing varies by provider.");
          }
      }

      const systemPrompt = `
        You are a resume parsing assistant. 
        Extract resume information and return strictly valid JSON.
        Follow this structure:
        ${JSON.stringify(resumeSchemaProps, null, 2)}
      `;

      const result = await openAIFetch(
        settings.baseUrl,
        settings.apiKey,
        settings.model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Resume Content:\n${userContent}` }
        ],
        true
      );

      return JSON.parse(result) as Partial<ResumeProfile>;
    }
  } catch (e) {
    handleAIError(e);
    return {}; // Should not reach here due to re-throw
  }
};

// Analyze resume against a Job Description
export const analyzeResume = async (resume: ResumeProfile, jd: string): Promise<OptimizationResult> => {
  try {
    const settings = await getAISettings();
    const resumeText = JSON.stringify(resume);

    // Gemini Path
    if (settings.provider === 'gemini') {
      const ai = getGeminiClient(settings.apiKey);
      const prompt = `
        Act as a senior hiring manager. Analyze the Resume against the JD.
        Resume: ${resumeText}
        Job Description: ${jd}
        IMPORTANT: Respond in the SAME LANGUAGE as the Job Description.
        
        Provide:
        1. A match score (0-100).
        2. Missing keywords (skills/tools found in JD but not in Resume).
        3. A detailed analysis of the match.
        4. A suggested professional summary tailored to the JD.
        5. Improvement Tips (vaguePoints): Provide 5 to 10 specific, actionable suggestions. Focus on quantifying results (STAR method), clarifying vague statements, and tailoring content to the JD.
      `;
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              vaguePoints: {
                type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                  experienceId: { type: Type.STRING }, suggestion: { type: Type.STRING }
                }}
              },
              summarySuggestion: { type: Type.STRING },
              matchAnalysis: { type: Type.STRING }
            }
          }
        }
      });
      if (response.text) return JSON.parse(response.text) as OptimizationResult;
      throw new Error("AI returned empty analysis.");
    } 
    
    // OpenAI Compatible Path
    else {
      const systemPrompt = `
        You are a hiring manager ATS expert. Analyze the resume vs JD.
        Return valid JSON matching this structure:
        ${JSON.stringify(optimizationSchemaProps, null, 2)}
        
        CRITICAL: 
        1. Analyze and respond in the SAME LANGUAGE as the provided Job Description.
        2. For 'vaguePoints', provide between 5 and 10 specific, actionable improvement tips.
      `;
      
      const result = await openAIFetch(
        settings.baseUrl,
        settings.apiKey,
        settings.model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Resume: ${resumeText}\n\nJob Description: ${jd}` }
        ],
        true
      );
      
      return JSON.parse(result) as OptimizationResult;
    }
  } catch (e) {
    handleAIError(e);
    throw e;
  }
};

// Rewrite a specific bullet point
export const rewriteBulletPoint = async (bullet: string, jd?: string): Promise<string[]> => {
  try {
    const settings = await getAISettings();
    const userPrompt = `
      Rewrite this resume bullet to be impactful, quantified (STAR method).
      ${jd ? `Context JD: ${jd.substring(0, 300)}...` : ''}
      Original: "${bullet}"
      Detect language and respond in the SAME language.
      Return a JSON Array of 3 strings (Conservative, Quantitative, Achievement).
    `;

    // Gemini Path
    if (settings.provider === 'gemini') {
      const ai = getGeminiClient(settings.apiKey);
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-3-flash-preview',
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      });
      if (response.text) return JSON.parse(response.text) as string[];
      return [];
    } 
    
    // OpenAI Compatible Path
    else {
      const systemPrompt = `You are a professional resume writer. Return ONLY a JSON array of strings. Example: ["Variation 1", "Variation 2", "Variation 3"]`;
      const result = await openAIFetch(
        settings.baseUrl,
        settings.apiKey,
        settings.model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        true // JSON mode
      );
      try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.variations && Array.isArray(parsed.variations)) return parsed.variations;
          const match = result.match(/\[.*\]/s);
          if (match) return JSON.parse(match[0]);
          return [result]; 
      } catch (e) {
          return [bullet];
      }
    }
  } catch (e) {
    handleAIError(e);
    return [];
  }
};
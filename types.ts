
export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string; // Markdown or plain text bullet points
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface ResumeProfile {
  id: string;
  name: string;
  title: string; // Target Job Title
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  lastModified: number;
}

export interface OptimizationResult {
  score: number;
  missingKeywords: string[];
  vaguePoints: { experienceId: string; suggestion: string }[];
  summarySuggestion: string;
  matchAnalysis: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export type AIProvider = 'gemini' | 'deepseek' | 'moonshot' | 'qwen' | 'minimax' | 'grok' | 'openai_custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

import { ResumeProfile, AISettings } from '../types';
import { encryptData, decryptData } from './encryptionService';

const STORAGE_KEY = 'resume_ai_profiles';
const SETTINGS_KEY = 'resume_ai_settings';

export const saveResume = (resume: ResumeProfile): void => {
  const existing = getResumes();
  const index = existing.findIndex((r) => r.id === resume.id);
  
  if (index >= 0) {
    existing[index] = { ...resume, lastModified: Date.now() };
  } else {
    existing.push({ ...resume, lastModified: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

export const getResumes = (): ResumeProfile[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getResumeById = (id: string): ResumeProfile | undefined => {
  const resumes = getResumes();
  return resumes.find((r) => r.id === id);
};

export const deleteResume = (id: string): void => {
  const existing = getResumes();
  const filtered = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const createEmptyResume = (): ResumeProfile => ({
  id: crypto.randomUUID(),
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  lastModified: Date.now(),
});

export const getAISettings = async (): Promise<AISettings> => {
  const data = localStorage.getItem(SETTINGS_KEY);
  const defaultSettings: AISettings = {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-3-flash-preview'
  };

  if (!data) return defaultSettings;

  try {
    const parsed = JSON.parse(data);
    // Decrypt API key if it exists
    if (parsed.apiKey) {
      parsed.apiKey = await decryptData(parsed.apiKey);
    }
    return { ...defaultSettings, ...parsed };
  } catch (e) {
    console.error("Failed to load settings", e);
    return defaultSettings;
  }
};

export const saveAISettings = async (settings: AISettings): Promise<void> => {
  // Encrypt API key before saving
  const settingsToSave = { ...settings };
  if (settingsToSave.apiKey) {
    settingsToSave.apiKey = await encryptData(settingsToSave.apiKey);
  }
  
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
};

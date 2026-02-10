import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { AIProvider, AISettings } from '../types';
import { getAISettings, saveAISettings } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: AIProvider; nameKey: string; defaultBaseUrl: string; defaultModel: string }[] = [
  { id: 'gemini', nameKey: 'settings.presets.gemini', defaultBaseUrl: '', defaultModel: 'gemini-3-flash-preview' },
  { id: 'deepseek', nameKey: 'settings.presets.deepseek', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'moonshot', nameKey: 'settings.presets.moonshot', defaultBaseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'qwen', nameKey: 'settings.presets.qwen', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'minimax', nameKey: 'settings.presets.minimax', defaultBaseUrl: 'https://api.minimax.chat/v1', defaultModel: 'abab6.5-chat' },
  { id: 'grok', nameKey: 'settings.presets.grok', defaultBaseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-beta' },
  { id: 'openai_custom', nameKey: 'settings.presets.custom', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
];

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load settings asynchronously
      getAISettings().then(setSettings);
    }
  }, [isOpen]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!settings) return;
    const provider = e.target.value as AIProvider;
    const preset = PROVIDERS.find(p => p.id === provider);
    setSettings(prev => prev ? ({
      ...prev,
      provider,
      baseUrl: preset?.defaultBaseUrl || '',
      model: preset?.defaultModel || ''
    }) : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    await saveAISettings(settings);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;
  if (!settings) return null; // Or a loading spinner

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          disabled={isSaving}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-6">{t('settings.title')}</h2>

        <div className="space-y-4">
          
          {/* Provider Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.provider')}</label>
            <select 
              className="w-full p-2 border rounded-lg bg-white"
              value={settings.provider}
              onChange={handleProviderChange}
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{t(p.nameKey)}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.apiKey')}</label>
            <div className="relative">
              <input 
                type="password"
                className="w-full p-2 border rounded-lg pr-8"
                placeholder={t('settings.apiKeyPlaceholder')}
                value={settings.apiKey}
                onChange={e => setSettings({...settings, apiKey: e.target.value})}
              />
            </div>
            
            {/* Security Note */}
            <div className="flex items-center gap-2 mt-2 text-green-700 bg-green-50 p-2 rounded-lg text-xs border border-green-100">
               <ShieldCheck size={14} className="flex-shrink-0" />
               <span>{t('settings.securityNote')}</span>
            </div>

            {settings.provider === 'gemini' && (
              <p className="text-xs text-slate-500 mt-1 pl-1">{t('settings.geminiNote')}</p>
            )}
          </div>

          {/* Base URL (Hidden for Gemini) */}
          {settings.provider !== 'gemini' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.baseUrl')}</label>
              <input 
                type="text"
                className="w-full p-2 border rounded-lg"
                value={settings.baseUrl}
                onChange={e => setSettings({...settings, baseUrl: e.target.value})}
              />
            </div>
          )}

          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.model')}</label>
            <input 
              type="text"
              className="w-full p-2 border rounded-lg"
              value={settings.model}
              onChange={e => setSettings({...settings, model: e.target.value})}
            />
          </div>

        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
            {t('settings.save')}
          </button>
        </div>

      </div>
    </div>
  );
};
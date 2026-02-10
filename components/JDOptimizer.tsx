import React, { useState } from 'react';
import { ResumeProfile, OptimizationResult } from '../types';
import { analyzeResume } from '../services/aiService';
import { ArrowRight, AlertCircle, CheckCircle, Loader2, Sparkles, Target, Lightbulb } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  resume: ResumeProfile;
  onUpdateResume: (updates: Partial<ResumeProfile>) => void;
  onOpenSettings?: () => void;
}

export const JDOptimizer: React.FC<Props> = ({ resume, onUpdateResume, onOpenSettings }) => {
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const { t } = useLanguage();

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeResume(resume, jdText);
      setResult(res);
    } catch (e: any) {
      console.error(e);
      alert(`${e.message}`);
      if (e.message.includes("Settings") && onOpenSettings) {
        onOpenSettings();
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySummary = () => {
    if (result?.summarySuggestion) {
      onUpdateResume({ summary: result.summarySuggestion });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <h2 className="font-semibold flex items-center gap-2 text-slate-800">
          <Target className="w-5 h-5 text-brand-600" />
          {t('optimizer.title')}
        </h2>
        <p className="text-xs text-slate-500 mt-1">{t('optimizer.subtitle')}</p>
      </div>

      <div className="p-4 space-y-4 pb-24 md:pb-4">
        {/* Input Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{t('optimizer.label')}</label>
          <textarea
            className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            placeholder={t('optimizer.placeholder')}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jdText.trim()}
            className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-colors"
          >
            {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isAnalyzing ? t('optimizer.analyzing') : t('optimizer.analyze')}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500 font-medium">{t('optimizer.score')}</div>
                <div className={`text-3xl font-bold ${result.score >= 70 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {result.score}%
                </div>
              </div>
              <div className="h-12 w-12 rounded-full border-4 border-slate-100 flex items-center justify-center">
                 <div className={`h-full w-full rounded-full ${result.score >= 70 ? 'bg-green-100' : 'bg-yellow-100'}`}></div>
              </div>
            </div>

            {/* Analysis Text */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('optimizer.analysis')}</h3>
              <p className="text-sm text-blue-800 leading-relaxed">{result.matchAnalysis}</p>
            </div>

            {/* Missing Keywords */}
            {result.missingKeywords.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  {t('optimizer.missingKeywords')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 shadow-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Suggestion */}
            {result.summarySuggestion && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    {t('optimizer.suggestedSummary')}
                  </h3>
                  <button 
                    onClick={applySummary}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                  >
                    {t('optimizer.apply')} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded border border-slate-100">
                  "{result.summarySuggestion}"
                </p>
              </div>
            )}
            
            {/* Vague Points Tips */}
             {result.vaguePoints.length > 0 && (
              <div>
                 <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                   <Lightbulb className="w-4 h-4 text-amber-500" />
                   {t('optimizer.improvementTips')}
                   <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-1">{result.vaguePoints.length}</span>
                 </h3>
                 <ul className="space-y-3">
                    {result.vaguePoints.map((vp, idx) => (
                      <li key={idx} className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200 shadow-sm flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                            {idx + 1}
                        </div>
                        <div>
                            <span className="block font-medium text-slate-900 mb-1">{vp.experienceId}</span>
                            <span className="leading-relaxed">{vp.suggestion}</span>
                        </div>
                      </li>
                    ))}
                 </ul>
              </div>
             )}

          </div>
        )}
      </div>
    </div>
  );
};
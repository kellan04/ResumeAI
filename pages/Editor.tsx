import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResumeById, saveResume, createEmptyResume, getAISettings } from '../services/storageService';
import { parseResumeText, rewriteBulletPoint } from '../services/aiService';
import { ResumeProfile, WorkExperience, Education } from '../types';
import { ResumePreview } from '../components/ResumePreview';
import { JDOptimizer } from '../components/JDOptimizer';
import { Save, Printer, ArrowLeft, Wand2, Plus, Trash2, Layout, Sparkles, FileInput, Upload, X, FileText, Loader2, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SettingsModal } from '../components/SettingsModal';
import * as mammoth from 'mammoth';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'optimize' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  
  // Import state
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [extractedDocText, setExtractedDocText] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  
  // Progress state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  const [rewritingId, setRewritingId] = useState<string | null>(null);

  useEffect(() => {
    if (id === 'new') {
      const newResume = createEmptyResume();
      setResume(newResume);
    } else if (id) {
      const found = getResumeById(id);
      if (found) {
        setResume(found);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  // Simulation effect for progress bar
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isImporting) {
        setLoadingProgress(0);
        setLoadingStage(t('import.stage.prepare'));
        
        const stages = [
            { threshold: 15, text: t('import.stage.upload') },
            { threshold: 35, text: t('import.stage.read') },
            { threshold: 60, text: t('import.stage.extract') },
            { threshold: 80, text: t('import.stage.structure') },
            { threshold: 90, text: t('import.stage.finalize') },
        ];
        
        interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 95) return prev; // Cap at 95% until actually done
                
                // Slow down as we get higher
                const increment = Math.max(0.2, (95 - prev) / 50); 
                const nextProgress = prev + increment;
                
                // Determine stage based on new progress
                const activeStage = stages.reverse().find(s => nextProgress >= s.threshold);
                if (activeStage) setLoadingStage(activeStage.text);
                stages.reverse(); // reset order

                return nextProgress;
            });
        }, 100);
    }
    return () => clearInterval(interval);
  }, [isImporting, t]);

  const handleSave = () => {
    if (resume) {
      setIsSaving(true);
      saveResume(resume);
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const updateResume = (updates: Partial<ResumeProfile>) => {
    if (resume) {
      setResume({ ...resume, ...updates });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove "data:*/*;base64," prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExtractedDocText(null); // Reset extracted text

      try {
        const base64 = await fileToBase64(file);
        
        // Fix mime type if empty (common with docx on some systems)
        let mimeType = file.type;
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (!mimeType) {
            if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            if (ext === 'doc') mimeType = 'application/msword';
            if (ext === 'pdf') mimeType = 'application/pdf';
            if (ext === 'txt') mimeType = 'text/plain';
        }

        // Attempt client-side text extraction for DOCX
        if (ext === 'docx') {
          try {
            const arrayBuffer = await fileToArrayBuffer(file);
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            if (result.value) {
              setExtractedDocText(result.value);
            }
          } catch (docErr) {
            console.warn("Failed to extract DOCX text locally, falling back to provider capabilities", docErr);
          }
        }

        setImportFile({
          name: file.name,
          mimeType: mimeType || 'application/octet-stream',
          data: base64
        });
        setImportText(''); // Clear text if file selected
      } catch (err) {
        console.error("Error reading file", err);
        alert("Could not read file.");
      }
    }
  };

  const handleImport = async () => {
    if (!importText.trim() && !importFile) return;
    setIsImporting(true);
    
    try {
      const settings = await getAISettings();
      let parsed;

      // Logic: 
      // 1. If we extracted text (e.g. from DOCX), ALWAYS use that regardless of provider. 
      //    Gemini does not support DOCX inline, so this prevents the "Unsupported MIME type" error.
      // 2. If no extracted text:
      //    a. If provider is Gemini, use the File Object (it handles PDF and Images natively via Base64).
      //    b. If provider is NOT Gemini:
      //       i. If user pasted text, use that.
      //       ii. If it's a PDF/Image, fail gracefully as most text-only LLMs don't support binary uploads without OCR.

      if (importFile) {
        if (extractedDocText) {
             // Priority 1: Use extracted text (Works for DOCX on all providers)
             parsed = await parseResumeText(extractedDocText);
        } else if (settings.provider === 'gemini') {
          // Priority 2: Gemini Native (PDFs, Images)
          parsed = await parseResumeText(importFile);
        } else {
          // Priority 3: Fail for binary files on text-only providers
           if (importFile.mimeType.includes('pdf')) {
             throw new Error("This AI provider does not support PDF uploads. Please switch to Gemini or copy/paste the text.");
           }
           if (importFile.mimeType.includes('image')) {
             throw new Error("This AI provider does not support Image uploads. Please switch to Gemini.");
           }
           // Fallback
           throw new Error("Unable to read file content. Please copy/paste your resume content.");
        }
      } else {
        // Text input
        parsed = await parseResumeText(importText);
      }
      
      setLoadingProgress(100);
      setLoadingStage(t('import.stage.done'));
      
      // Small delay to show 100%
      await new Promise(r => setTimeout(r, 500));

      updateResume({
        ...parsed,
        // Ensure arrays are initialized if parsing failed for them
        skills: parsed.skills || [],
        experience: parsed.experience?.map(e => ({...e, id: crypto.randomUUID()})) || [],
        education: parsed.education?.map(e => ({...e, id: crypto.randomUUID()})) || [],
      });
      setShowImportModal(false);
      setImportFile(null);
      setImportText('');
      setExtractedDocText(null);
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
      if (e.message.includes("Settings") || e.message.includes("API Key")) {
        setShowImportModal(false);
        setShowSettings(true);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleRewriteBullet = async (expId: string, text: string) => {
    if(!text.trim()) return;
    setRewritingId(expId);
    try {
        const suggestions = await rewriteBulletPoint(text);
        if(suggestions.length > 0) {
            const picked = prompt(`${t('editor.chooseVariation')}\n\n1. ${suggestions[0]}\n2. ${suggestions[1]}\n3. ${suggestions[2]}\n\n${t('editor.enterNumber')}`, "2");
            if (picked) {
                const idx = parseInt(picked) - 1;
                if(suggestions[idx]) {
                    const newExp = resume?.experience.map(e => {
                        if(e.id === expId) return { ...e, description: suggestions[idx] };
                        return e;
                    });
                    if(newExp) updateResume({ experience: newExp });
                }
            }
        } else {
          // If empty array returned (likely due to error caught in service)
           alert("Could not generate variations. Please check your API Settings.");
           setShowSettings(true);
        }
    } catch(e: any) {
        console.error(e);
        alert(e.message);
        if (e.message.includes("Settings")) {
            setShowSettings(true);
        }
    } finally {
        setRewritingId(null);
    }
  };

  if (!resume) return <div className="flex items-center justify-center h-screen">{t('editor.loading')}</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-800 truncate max-w-[200px]">{resume.name || t('dashboard.untitled')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 border border-slate-200 hidden sm:inline-block">
              {resume.title || 'Draft'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
             className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2"
             title="Switch Language"
           >
             <Globe size={16} /> <span>{language === 'en' ? 'EN' : '中文'}</span>
           </button>
           <button 
             onClick={() => setShowImportModal(true)}
             className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2"
           >
             <FileInput size={16} /> <span className="hidden sm:inline">{t('editor.import')}</span>
           </button>
          <button 
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isSaving ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            <Save size={16} /> {isSaving ? t('editor.saved') : t('editor.save')}
          </button>
          <button 
            onClick={handlePrint}
            className="px-3 py-2 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Printer size={16} /> <span className="hidden sm:inline">{t('editor.export')}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50 no-print">
          <button onClick={() => setActiveTab('edit')} className={`p-2 flex flex-col items-center text-xs ${activeTab === 'edit' ? 'text-brand-600' : 'text-slate-500'}`}>
            <Layout size={20} /> {t('tab.edit')}
          </button>
          <button onClick={() => setActiveTab('optimize')} className={`p-2 flex flex-col items-center text-xs ${activeTab === 'optimize' ? 'text-brand-600' : 'text-slate-500'}`}>
            <Sparkles size={20} /> {t('tab.optimize')}
          </button>
          <button onClick={() => setActiveTab('preview')} className={`p-2 flex flex-col items-center text-xs ${activeTab === 'preview' ? 'text-brand-600' : 'text-slate-500'}`}>
            <Printer size={20} /> {t('tab.preview')}
          </button>
        </div>

        {/* Editor Panel (Left) */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 bg-white ${activeTab === 'edit' ? 'block' : 'hidden md:block'}`}>
          <div className="max-w-2xl mx-auto space-y-8 pb-20 md:pb-0">
            
            {/* Personal Info */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">{t('editor.personalInfo')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder={t('editor.fullName')}
                  className="p-3 border rounded-lg w-full"
                  value={resume.name} 
                  onChange={e => updateResume({ name: e.target.value })} 
                />
                <input 
                  type="text" 
                  placeholder={t('editor.jobTitle')}
                  className="p-3 border rounded-lg w-full"
                  value={resume.title} 
                  onChange={e => updateResume({ title: e.target.value })} 
                />
                <input 
                  type="email" 
                  placeholder={t('editor.email')}
                  className="p-3 border rounded-lg w-full"
                  value={resume.email} 
                  onChange={e => updateResume({ email: e.target.value })} 
                />
                <input 
                  type="tel" 
                  placeholder={t('editor.phone')}
                  className="p-3 border rounded-lg w-full"
                  value={resume.phone} 
                  onChange={e => updateResume({ phone: e.target.value })} 
                />
                <input 
                  type="text" 
                  placeholder={t('editor.location')}
                  className="p-3 border rounded-lg w-full sm:col-span-2"
                  value={resume.location} 
                  onChange={e => updateResume({ location: e.target.value })} 
                />
              </div>
            </section>

            {/* Summary */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">{t('editor.summary')}</h2>
              <textarea 
                className="w-full p-3 border rounded-lg h-32 resize-none"
                placeholder={t('editor.summaryPlaceholder')}
                value={resume.summary}
                onChange={e => updateResume({ summary: e.target.value })}
              />
            </section>

            {/* Experience */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">{t('editor.experience')}</h2>
                <button 
                  onClick={() => updateResume({ 
                    experience: [...resume.experience, { 
                      id: crypto.randomUUID(), 
                      company: '', 
                      role: '', 
                      startDate: '', 
                      endDate: '', 
                      current: false, 
                      description: '' 
                    }] 
                  })}
                  className="text-sm text-brand-600 font-medium flex items-center gap-1 hover:text-brand-700"
                >
                  <Plus size={16} /> {t('editor.addRole')}
                </button>
              </div>
              
              {resume.experience.map((exp, index) => (
                <div key={exp.id} className="p-4 border rounded-xl bg-slate-50 space-y-3 relative group">
                  <button 
                    onClick={() => {
                        const newExp = [...resume.experience];
                        newExp.splice(index, 1);
                        updateResume({ experience: newExp });
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <input 
                      type="text" 
                      placeholder={t('editor.company')}
                      className="p-2 border rounded bg-white"
                      value={exp.company}
                      onChange={e => {
                        const newExp = [...resume.experience];
                        newExp[index].company = e.target.value;
                        updateResume({ experience: newExp });
                      }}
                    />
                    <input 
                      type="text" 
                      placeholder={t('editor.role')}
                      className="p-2 border rounded bg-white"
                      value={exp.role}
                      onChange={e => {
                        const newExp = [...resume.experience];
                        newExp[index].role = e.target.value;
                        updateResume({ experience: newExp });
                      }}
                    />
                    <div className="flex gap-2">
                        <input 
                        type="text" 
                        placeholder={t('editor.startDate')}
                        className="p-2 border rounded bg-white w-full"
                        value={exp.startDate}
                        onChange={e => {
                            const newExp = [...resume.experience];
                            newExp[index].startDate = e.target.value;
                            updateResume({ experience: newExp });
                        }}
                        />
                         <input 
                        type="text" 
                        placeholder={t('editor.endDate')}
                        className="p-2 border rounded bg-white w-full"
                        value={exp.endDate}
                        onChange={e => {
                            const newExp = [...resume.experience];
                            newExp[index].endDate = e.target.value;
                            updateResume({ experience: newExp });
                        }}
                        />
                    </div>
                  </div>
                  <div className="relative">
                    <textarea 
                        className="w-full p-3 border rounded bg-white h-32 resize-y text-sm"
                        placeholder={t('editor.descriptionPlaceholder')}
                        value={exp.description}
                        onChange={e => {
                        const newExp = [...resume.experience];
                        newExp[index].description = e.target.value;
                        updateResume({ experience: newExp });
                        }}
                    />
                    <button 
                        onClick={() => handleRewriteBullet(exp.id, exp.description)}
                        disabled={rewritingId === exp.id || !exp.description}
                        className="absolute bottom-2 right-2 p-1.5 bg-brand-100 text-brand-600 rounded-md hover:bg-brand-200 transition-colors flex items-center gap-1 text-xs font-medium"
                        title="Rewrite with AI"
                    >
                        {rewritingId === exp.id ? <Sparkles className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3" />}
                        {t('editor.aiPolish')}
                    </button>
                  </div>
                </div>
              ))}
            </section>

             {/* Skills */}
             <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">{t('editor.skills')}</h2>
              <textarea 
                className="w-full p-3 border rounded-lg h-24"
                placeholder={t('editor.skillsPlaceholder')}
                value={resume.skills.join(', ')}
                onChange={e => updateResume({ skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </section>

          </div>
        </div>

        {/* Optimizer Panel (Right/Middle) */}
        <div className={`w-full md:w-[350px] lg:w-[400px] border-l border-slate-200 ${activeTab === 'optimize' ? 'block' : 'hidden md:block'}`}>
          <JDOptimizer 
            resume={resume} 
            onUpdateResume={updateResume}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Preview Panel (Desktop Large) */}
        <div className={`hidden lg:flex flex-1 bg-slate-100 justify-center overflow-y-auto py-8 print:hidden`}>
           <ResumePreview resume={resume} scale={0.8} />
        </div>
        
        {/* Mobile Preview Only */}
        <div className={`fixed inset-0 bg-slate-100 z-40 overflow-y-auto ${activeTab === 'preview' ? 'block' : 'hidden'} lg:hidden pb-20 pt-20`}>
             <ResumePreview resume={resume} scale={0.9} />
        </div>

      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl relative min-h-[400px] flex flex-col">
                <button 
                  onClick={() => !isImporting && setShowImportModal(false)} 
                  disabled={isImporting}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <X size={20} />
                </button>
                
                {isImporting ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 animate-in fade-in duration-500">
                    <div className="relative mb-8">
                       <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-25"></div>
                       <Loader2 className="w-16 h-16 text-brand-600 animate-spin relative z-10" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{loadingStage}</h3>
                    <p className="text-slate-500 mb-6 text-sm">This may take up to a minute for larger files.</p>
                    
                    <div className="w-full max-w-sm bg-slate-100 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                        <div 
                            className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs font-medium text-brand-600">{Math.round(loadingProgress)}% Complete</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-4">{t('import.title')}</h3>
                    <p className="text-sm text-slate-600 mb-6">{t('import.desc')}</p>
                    
                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors relative mb-4 group">
                      <input 
                          type="file" 
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      {importFile ? (
                        <div className="flex flex-col items-center text-brand-600">
                          <FileText size={32} className="mb-2" />
                          <span className="font-medium text-sm">{importFile.name}</span>
                          <span className="text-xs text-slate-500 mt-1">{t('import.change')}</span>
                          {extractedDocText && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1">Text Extracted</span>}
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
                            <Upload size={24} />
                          </div>
                          <p className="text-sm font-medium text-slate-700">{t('import.uploadText')}</p>
                          <p className="text-xs text-slate-500 mt-1">{t('import.supports')}</p>
                        </>
                      )}
                    </div>

                    <div className="relative flex py-2 items-center mb-4">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-semibold">{t('import.orPaste')}</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <textarea 
                        className="w-full h-32 p-3 border rounded-lg mb-4 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                        placeholder={t('import.pastePlaceholder')}
                        value={importText}
                        onChange={e => {
                          setImportText(e.target.value);
                          if (e.target.value) {
                             setImportFile(null);
                             setExtractedDocText(null);
                          }
                        }}
                        disabled={!!importFile}
                    />
                    
                    <div className="flex justify-end gap-3 mt-auto">
                        <button 
                            type="button"
                            onClick={() => {
                              setShowImportModal(false);
                              setImportFile(null);
                              setImportText('');
                              setExtractedDocText(null);
                            }}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                        >
                            {t('import.cancel')}
                        </button>
                        <button 
                            type="button"
                            onClick={handleImport}
                            disabled={isImporting || (!importText && !importFile)}
                            className="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> {t('import.button')}
                        </button>
                    </div>
                  </>
                )}
            </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Print Overlay */}
      <div className="print-only">
          <ResumePreview resume={resume} />
      </div>
    </div>
  );
};

export default Editor;
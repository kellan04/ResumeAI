import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock, ChevronRight, Settings } from 'lucide-react';
import { getResumes, deleteResume, createEmptyResume, saveResume } from '../services/storageService';
import { ResumeProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SettingsModal } from '../components/SettingsModal';

const Dashboard: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    setResumes(getResumes());
  }, []);

  const handleCreateNew = () => {
    const newResume = createEmptyResume();
    saveResume(newResume);
    navigate(`/editor/${newResume.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(t('dashboard.deleteConfirm'))) {
      deleteResume(id);
      setResumes(getResumes());
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-10 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('app.title')}</h1>
          <p className="text-slate-600">{t('app.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          title="Settings"
        >
          <Settings size={24} />
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Card */}
        <button
          onClick={handleCreateNew}
          className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all duration-200 h-64"
        >
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.createNew')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('dashboard.startScratch')}</p>
        </button>

        {/* Resume Cards */}
        {resumes.map((resume) => (
          <Link
            key={resume.id}
            to={`/editor/${resume.id}`}
            className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-64 overflow-hidden"
          >
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                  <FileText size={20} />
                </div>
                <button
                  onClick={(e) => handleDelete(e, resume.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                {resume.title || resume.name || t('dashboard.untitled')}
              </h3>
              <p className="text-sm text-slate-500 mb-4 truncate">
                {resume.summary ? resume.summary : t('dashboard.noSummary')}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                 {resume.skills.slice(0, 3).map((skill, i) => (
                   <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{skill}</span>
                 ))}
                 {resume.skills.length > 3 && <span className="text-xs text-slate-400 px-1 py-1">+{resume.skills.length - 3}</span>}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} />
                <span>{new Date(resume.lastModified).toLocaleDateString()}</span>
              </div>
              <div className="text-brand-600 flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform">
                {t('dashboard.edit')} <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Dashboard;

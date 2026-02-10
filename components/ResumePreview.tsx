import React from 'react';
import { ResumeProfile } from '../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  resume: ResumeProfile;
  scale?: number;
}

export const ResumePreview: React.FC<Props> = ({ resume, scale = 1 }) => {
  const { t } = useLanguage();

  return (
    <div 
      className="bg-white shadow-lg print:shadow-none text-slate-800 mx-auto print:mx-0 print:w-full"
      style={{ 
        width: '210mm', 
        minHeight: '297mm',
        padding: '20mm',
        transform: `scale(${scale})`,
        transformOrigin: 'top center'
      }}
    >
      {/* Header */}
      <header className="border-b-2 border-slate-800 pb-6 mb-6">
        <h1 className="text-4xl font-bold uppercase tracking-wide text-slate-900 mb-2">{resume.name || 'Your Name'}</h1>
        <p className="text-xl text-brand-600 font-medium mb-4">{resume.title || 'Professional Title'}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {resume.email && (
            <div className="flex items-center gap-1">
              <Mail size={14} />
              <span>{resume.email}</span>
            </div>
          )}
          {resume.phone && (
            <div className="flex items-center gap-1">
              <Phone size={14} />
              <span>{resume.phone}</span>
            </div>
          )}
          {resume.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{resume.location}</span>
            </div>
          )}
        </div>
      </header>

      {/* Summary */}
      {resume.summary && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">{t('preview.summary')}</h2>
          <p className="text-sm leading-relaxed text-slate-700">{resume.summary}</p>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">{t('preview.skills')}</h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, i) => (
              <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium print:border print:border-slate-200">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{t('preview.experience')}</h2>
          <div className="space-y-5">
            {resume.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-lg text-slate-900">{exp.role}</h3>
                  <span className="text-sm text-slate-500 font-medium whitespace-nowrap">
                    {exp.startDate} – {exp.current ? t('preview.present') : exp.endDate}
                  </span>
                </div>
                <div className="text-brand-700 font-medium text-sm mb-2">{exp.company}</div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-1">
                  {exp.description}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{t('preview.education')}</h2>
          <div className="space-y-4">
            {resume.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-slate-900">{edu.institution}</h3>
                  <span className="text-sm text-slate-500">
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                <div className="text-sm text-slate-700">{edu.degree}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
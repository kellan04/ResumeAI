import React, { createContext, useState, useContext, ReactNode } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.title': 'ResumeAI Architect',
    'app.subtitle': 'Manage your resumes and optimize them for your next role.',
    'dashboard.createNew': 'Create New Resume',
    'dashboard.startScratch': 'Start from scratch or import',
    'dashboard.untitled': 'Untitled Resume',
    'dashboard.noSummary': 'No summary added yet.',
    'dashboard.edit': 'Edit',
    'dashboard.deleteConfirm': 'Are you sure you want to delete this resume?',
    
    'editor.save': 'Save',
    'editor.saved': 'Saved!',
    'editor.export': 'Export PDF',
    'editor.import': 'Import',
    'editor.loading': 'Loading...',
    'editor.personalInfo': 'Personal Info',
    'editor.fullName': 'Full Name',
    'editor.jobTitle': 'Target Job Title',
    'editor.email': 'Email',
    'editor.phone': 'Phone',
    'editor.location': 'Location (City, Country)',
    'editor.summary': 'Professional Summary',
    'editor.summaryPlaceholder': 'Briefly describe your professional background...',
    'editor.experience': 'Work Experience',
    'editor.addRole': 'Add Role',
    'editor.company': 'Company',
    'editor.role': 'Role',
    'editor.startDate': 'Start Date',
    'editor.endDate': 'End Date',
    'editor.descriptionPlaceholder': 'Describe your achievements...',
    'editor.aiPolish': 'AI Polish',
    'editor.skills': 'Skills',
    'editor.skillsPlaceholder': 'Comma separated list (e.g. React, TypeScript, Project Management)...',
    'editor.chooseVariation': 'Choose a variation:',
    'editor.enterNumber': 'Enter number (1-3) to replace:',

    'tab.edit': 'Edit',
    'tab.optimize': 'Optimize',
    'tab.preview': 'Preview',
    
    'import.title': 'Import Resume',
    'import.desc': 'Upload a PDF/Word document or paste your resume content below. AI will structure it for you.',
    'import.uploadText': 'Click to upload PDF or Word',
    'import.supports': 'Supports .pdf, .docx, .txt',
    'import.orPaste': 'Or paste text',
    'import.pastePlaceholder': 'Paste your resume text or LinkedIn summary here...',
    'import.cancel': 'Cancel',
    'import.button': 'Import',
    'import.change': 'Click to change',
    'import.processing': 'Processing...',
    'import.stage.upload': 'Uploading document...',
    'import.stage.read': 'Reading content with Gemini AI...',
    'import.stage.extract': 'Extracting professional experience...',
    'import.stage.structure': 'Structuring skills and education...',
    'import.stage.finalize': 'Finalizing data structure...',
    'import.stage.done': 'Done!',
    'import.stage.prepare': 'Preparing upload...',
    
    'optimizer.title': 'Job Match Optimizer',
    'optimizer.subtitle': 'Paste a JD to see how well you match and get AI suggestions.',
    'optimizer.label': 'Target Job Description',
    'optimizer.placeholder': 'Paste the job description here...',
    'optimizer.analyze': 'Analyze Match',
    'optimizer.analyzing': 'Analyzing...',
    'optimizer.score': 'Match Score',
    'optimizer.analysis': 'Analysis',
    'optimizer.missingKeywords': 'Missing Keywords',
    'optimizer.suggestedSummary': 'Suggested Summary',
    'optimizer.apply': 'Apply',
    'optimizer.improvementTips': 'Improvement Tips',

    'preview.summary': 'Professional Summary',
    'preview.skills': 'Skills',
    'preview.experience': 'Experience',
    'preview.education': 'Education',
    'preview.present': 'Present',

    'settings.title': 'AI Model Settings',
    'settings.provider': 'Provider',
    'settings.apiKey': 'API Key',
    'settings.baseUrl': 'Base URL',
    'settings.model': 'Model Name',
    'settings.save': 'Save Settings',
    'settings.apiKeyPlaceholder': 'Enter your API key...',
    'settings.geminiNote': 'Leave empty to use default system key.',
    'settings.securityNote': 'Your API Key is encrypted locally and never stored on our servers.',
    'settings.presets.deepseek': 'DeepSeek',
    'settings.presets.gemini': 'Google Gemini',
    'settings.presets.moonshot': 'Moonshot AI (Kimi)',
    'settings.presets.qwen': 'Qwen (DashScope)',
    'settings.presets.minimax': 'MiniMax',
    'settings.presets.grok': 'Grok (xAI)',
    'settings.presets.custom': 'Custom OpenAI Compatible',
  },
  zh: {
    'app.title': 'ResumeAI 简历架构师',
    'app.subtitle': '管理您的简历并为下一个职位进行优化。',
    'dashboard.createNew': '新建简历',
    'dashboard.startScratch': '从头开始或导入',
    'dashboard.untitled': '未命名简历',
    'dashboard.noSummary': '暂无简介',
    'dashboard.edit': '编辑',
    'dashboard.deleteConfirm': '确定要删除这份简历吗？',
    
    'editor.save': '保存',
    'editor.saved': '已保存!',
    'editor.export': '导出 PDF',
    'editor.import': '导入',
    'editor.loading': '加载中...',
    'editor.personalInfo': '个人信息',
    'editor.fullName': '姓名',
    'editor.jobTitle': '目标职位',
    'editor.email': '邮箱',
    'editor.phone': '电话',
    'editor.location': '地点 (城市, 国家)',
    'editor.summary': '个人简介',
    'editor.summaryPlaceholder': '简要描述您的职业背景...',
    'editor.experience': '工作经历',
    'editor.addRole': '添加经历',
    'editor.company': '公司',
    'editor.role': '职位',
    'editor.startDate': '开始日期',
    'editor.endDate': '结束日期',
    'editor.descriptionPlaceholder': '描述您的成就...',
    'editor.aiPolish': 'AI 润色',
    'editor.skills': '技能',
    'editor.skillsPlaceholder': '以逗号分隔的列表 (例如：React, TypeScript, 项目管理)...',
    'editor.chooseVariation': '选择一个变体：',
    'editor.enterNumber': '输入数字 (1-3) 进行替换：',
    
    'tab.edit': '编辑',
    'tab.optimize': '优化',
    'tab.preview': '预览',
    
    'import.title': '导入简历',
    'import.desc': '上传 PDF/Word 文档或粘贴简历内容。AI 将为您结构化数据。',
    'import.uploadText': '点击上传 PDF 或 Word',
    'import.supports': '支持 .pdf, .docx, .txt',
    'import.orPaste': '或粘贴文本',
    'import.pastePlaceholder': '在此粘贴您的简历文本或 LinkedIn 摘要...',
    'import.cancel': '取消',
    'import.button': '导入',
    'import.change': '点击更改',
    'import.processing': '处理中...',
    'import.stage.upload': '上传文档中...',
    'import.stage.read': 'AI 正在读取内容...',
    'import.stage.extract': '正在提取工作经历...',
    'import.stage.structure': '正在整理技能和教育背景...',
    'import.stage.finalize': '正在生成最终数据结构...',
    'import.stage.done': '完成！',
    'import.stage.prepare': '准备上传...',
    
    'optimizer.title': '职位匹配优化器',
    'optimizer.subtitle': '粘贴 JD 以查看匹配程度并获取 AI 建议。',
    'optimizer.label': '目标职位描述 (JD)',
    'optimizer.placeholder': '在此粘贴职位描述...',
    'optimizer.analyze': '分析匹配度',
    'optimizer.analyzing': '分析中...',
    'optimizer.score': '匹配得分',
    'optimizer.analysis': '分析报告',
    'optimizer.missingKeywords': '缺失关键词',
    'optimizer.suggestedSummary': '建议简介',
    'optimizer.apply': '应用',
    'optimizer.improvementTips': '改进建议',

    'preview.summary': '个人简介',
    'preview.skills': '技能特长',
    'preview.experience': '工作经历',
    'preview.education': '教育背景',
    'preview.present': '至今',

    'settings.title': 'AI 模型配置',
    'settings.provider': '模型服务商',
    'settings.apiKey': 'API Key',
    'settings.baseUrl': '接口地址 (Base URL)',
    'settings.model': '模型名称',
    'settings.save': '保存配置',
    'settings.apiKeyPlaceholder': '输入您的 API Key...',
    'settings.geminiNote': '留空则使用默认系统 Key。',
    'settings.securityNote': '您的 API Key 已在本地加密存储，绝不会上传至我们的服务器。',
    'settings.presets.deepseek': 'DeepSeek (深度求索)',
    'settings.presets.gemini': 'Google Gemini',
    'settings.presets.moonshot': 'Kimi (月之暗面)',
    'settings.presets.qwen': '通义千问 (Qwen)',
    'settings.presets.minimax': 'MiniMax (海螺)',
    'settings.presets.grok': 'Grok (xAI)',
    'settings.presets.custom': '自定义 (OpenAI 兼容)',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
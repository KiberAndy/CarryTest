let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

function t(keyPath) {
  const translationSource = translations[currentLanguage] || {};
  return keyPath.split('.').reduce((obj, key) => {
    return (obj && obj.hasOwnProperty(key)) ? obj[key] : undefined;
  }, translationSource) || keyPath;
}

function detectPreferredLanguage() {
  const storedLang = localStorage.getItem('preferredLanguage');
  if (storedLang && supportedLanguages.includes(storedLang)) return storedLang;

  const browserLangs = navigator.languages || [navigator.language];
  const normalized = browserLangs.map(l => l.slice(0, 2).toLowerCase());
  return normalized.find(lang => supportedLanguages.includes(lang)) || 'ru';
}

async function loadTranslations(lang) {
  if (!supportedLanguages.includes(lang)) return;
  if (translations[lang]) return translations[lang];

  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error(`Translation file not found: ${lang}`);
    translations[lang] = await res.json();
    return translations[lang];
  } catch (error) {
    console.error('[i18n] Failed to load translations:', error);
    throw error;
  }
}

function updateQuestionsData() {
  if (!translations[currentLanguage]?.questions || !translations[currentLanguage]?.options) {
    console.warn('[i18n] Missing questions or options translations');
    return;
  }

  if (!window.originalQuestions) {
    window.originalQuestions = window.questions.map(q => ({ 
      ...q,
      _originalQuestion: q.question,
      _originalOptions: [...q.options]
    }));
  }

  window.questions = window.originalQuestions.map(q => ({
    ...q,
    question: t(`questions.${q.question_i18n}`),
    options: translations[currentLanguage].options[q.question_i18n] || q._originalOptions
  }));

  if (typeof renderQuestions === 'function') renderQuestions();
}

function applyTranslations() {
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  updateQuestionsData();
}

async function setLanguage(lang) {
  if (!supportedLanguages.includes(lang)) return;
  
  try {
    await loadTranslations(lang);
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    applyTranslations();
  } catch (error) {
    console.error('[i18n] Language switch failed:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.originalQuestions) {
    window.originalQuestions = window.questions?.map(q => ({
      ...q,
      _originalQuestion: q.question,
      _originalOptions: [...q.options]
    })) || [];
  }

  const lang = detectPreferredLanguage();
  await setLanguage(lang);

  const langSwitch = document.getElementById('language-switch');
  if (langSwitch) {
    langSwitch.value = currentLanguage;
    langSwitch.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
});
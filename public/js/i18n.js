let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

function t(keyPath) {
  const langData = translations[currentLanguage] || {};
  return keyPath.split('.').reduce((obj, key) => 
    (obj && obj[key] !== undefined) ? obj[key] : null, langData
  ) || keyPath;
}

async function detectPreferredLanguage() {
  const storedLang = localStorage.getItem('preferredLanguage');
  if (storedLang && supportedLanguages.includes(storedLang)) return storedLang;

  const browserLangs = navigator.languages?.map(l => l.slice(0, 2).toLowerCase()) || 
                      [navigator.language?.slice(0, 2).toLowerCase()];
  return supportedLanguages.find(lang => browserLangs.includes(lang)) || 'ru';
}

async function loadTranslations(lang) {
  if (!supportedLanguages.includes(lang)) return;
  if (translations[lang]) return;

  try {
    const response = await fetch(`/lang/${lang}.json`);
    translations[lang] = await response.json();
    console.log(`Loaded ${lang} translations:`, translations[lang]);
  } catch (error) {
    console.error(`Failed loading ${lang} translations:`, error);
    throw error;
  }
}

function updateContent() {
  // Обновляем весь интерфейс
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const keys = el.dataset.i18n.split('|');
    el.textContent = keys.map(k => t(k.trim())).join('');
  });

  // Специальная обработка для тега title
  const title = t('title');
  if (title !== 'title') document.title = title;

  // Обновление вопросов теста
  if (window.questions) {
    window.questions = window.originalQuestions.map(q => ({
      ...q,
      question: t(`questions.${q.question_i18n}`),
      options: t(`options.${q.question_i18n}`)?.split('|') || q._originalOptions
    }));
    if (typeof renderQuestions === 'function') renderQuestions();
  }
}

async function setLanguage(lang) {
  if (!supportedLanguages.includes(lang)) return;

  try {
    await loadTranslations(lang);
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    updateContent();
  } catch (error) {
    console.error('Language change failed:', error);
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  // Сохраняем оригинальные вопросы
  if (window.questions && !window.originalQuestions) {
    window.originalQuestions = window.questions.map(q => ({
      ...q,
      _originalQuestion: q.question,
      _originalOptions: [...q.options]
    }));
  }

  // Устанавливаем язык
  try {
    const lang = await detectPreferredLanguage();
    await setLanguage(lang);
  } catch (error) {
    console.error('Initial language setup failed:', error);
  }

  // Вешаем обработчик на переключатель языка
  document.getElementById('language-switch')?.addEventListener('change', e => {
    setLanguage(e.target.value);
  });
});
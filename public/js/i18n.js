let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

function t(keyPath) {
  return keyPath.split('.').reduce((obj, key) => {
    if (obj && obj.hasOwnProperty(key)) return obj[key];
    return undefined;
  }, translations[currentLanguage]) || keyPath;
}

function detectPreferredLanguage() {
  const storedLang = localStorage.getItem('preferredLanguage');
  if (storedLang && supportedLanguages.includes(storedLang)) return storedLang;

  const browserLangs = navigator.languages || [navigator.language];
  const normalized = browserLangs.map((l) => l.slice(0, 2).toLowerCase());
  return normalized.find((lang) => supportedLanguages.includes(lang)) || 'ru';
}

async function loadTranslations(lang) {
  if (!supportedLanguages.includes(lang)) return;
  if (translations[lang]) return translations[lang];

  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error(`Translation file not found: ${lang}`);
    translations[lang] = await res.json();
    console.log(`[i18n] Loaded ${lang} translations:`, translations[lang]);
  } catch (error) {
    console.error('[i18n] Failed to load translations:', error);
  }
}

// 🔁 Обновляет все вопросы и их опции
function updateQuestionsData() {
  if (!translations[currentLanguage]?.questions || !translations[currentLanguage]?.options) {
    console.warn('[i18n] Вопросы или переводы не загружены');
    return;
  }

  if (!window.originalQuestions) {
    window.originalQuestions = window.questions.map(q => ({ ...q }));
  }

  window.questions = window.originalQuestions.map((q) => ({
    ...q,
    question: t(`questions.${q.question_i18n}`),
    options: t(`options.${q.question_i18n}`)
  }));

  if (typeof renderQuestions === 'function') {
    renderQuestions();
  }
}

// 🏁 Применяет переводы к интерфейсу
function applyTranslations() {
  document.title = t('title');
  const titleEl = document.getElementById('test-title');
  const descEl = document.getElementById('test-description');

  if (titleEl) titleEl.textContent = t('title');
  if (descEl) descEl.textContent = t('description');

  updateQuestionsData();
}

// 🌍 Установка языка
async function setLanguage(lang) {
  if (!supportedLanguages.includes(lang)) return;
  await loadTranslations(lang);
  currentLanguage = lang;
  localStorage.setItem('preferredLanguage', lang);
  applyTranslations();
}

// 🧠 Автоустановка при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  await setLanguage(detectPreferredLanguage());

  // Повесь на переключатель языков, если он есть
  const langSwitch = document.getElementById('language-switch');
  if (langSwitch) {
    langSwitch.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      setLanguage(selectedLang);
    });
  }
});

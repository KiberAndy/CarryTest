let currentLanguage = 'ru'; // По умолчанию русский
const translations = {};
const supportedLanguages = ['ru', 'en'];

function t(keyPath) {
  const langData = translations[currentLanguage] || {};
  return keyPath.split('.').reduce((obj, key) => 
    (obj && obj[key] !== undefined) ? obj[key] : null, langData
  ) || keyPath; // Если перевод не найден, возвращаем сам ключ
}

async function detectPreferredLanguage() {
  const storedLang = localStorage.getItem('preferredLanguage');
  if (storedLang && supportedLanguages.includes(storedLang)) return storedLang;

  const browserLangs = navigator.languages?.map(l => l.slice(0, 2).toLowerCase()) || 
                      [navigator.language?.slice(0, 2).toLowerCase()];
  return supportedLanguages.find(lang => browserLangs.includes(lang)) || 'ru'; // Если язык не найден, по умолчанию русский
}

async function loadTranslations(lang) {
  if (!supportedLanguages.includes(lang)) return;

  if (translations[lang]) return; // Если переводы уже загружены, не загружаем снова

  try {
    const response = await fetch(`/lang/${lang}.json`);
    if (response.ok) {
      translations[lang] = await response.json();
      console.log(`Loaded ${lang} translations:`, translations[lang]);
    } else {
      throw new Error(`Failed to load translations for ${lang}`);
    }
  } catch (error) {
    console.error(`Error loading ${lang} translations:`, error);
    throw error; // Перехватываем ошибку для обработки
  }
}

function updateContent() {
  // Обновляем все элементы с переводами
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const keys = el.dataset.i18n.split('|');
    el.textContent = keys.map(k => t(k.trim())).join('');
  });

  // Обновляем тег title без проверки
  document.title = t('title'); // Теперь всегда обновляем title

  // Обновляем вопросы теста
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
    await loadTranslations(lang); // Загружаем переводы для выбранного языка
    currentLanguage = lang; // Устанавливаем текущий язык
    localStorage.setItem('preferredLanguage', lang); // Сохраняем язык в localStorage
    updateContent(); // Обновляем контент
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
    const lang = await detectPreferredLanguage(); // Определяем предпочтительный язык
    await setLanguage(lang); // Загружаем переводы и устанавливаем язык
  } catch (error) {
    console.error('Initial language setup failed:', error);
  }

  // Вешаем обработчик на переключатель языка
  document.getElementById('language-switch')?.addEventListener('change', e => {
    setLanguage(e.target.value); // Переключаем язык при изменении
  });
});

let currentLanguage = 'ru'; // По умолчанию русский
const translations = {};
const supportedLanguages = ['ru', 'en']; // Поддерживаемые языки

/**
 * Функция для получения перевода по ключу
 */
function t(keyPath) {
  const langData = translations[currentLanguage] || {};
  return keyPath.split('.').reduce((obj, key) => 
    (obj && obj[key] !== undefined) ? obj[key] : null, langData
  ) || keyPath; // Если перевод не найден, возвращаем сам ключ
}

/**
 * Определение предпочтительного языка пользователя
 */
async function detectPreferredLanguage() {
  const storedLang = localStorage.getItem('preferredLanguage');
  if (storedLang && supportedLanguages.includes(storedLang)) return storedLang;

  const browserLangs = navigator.languages?.map(l => l.slice(0, 2).toLowerCase()) || 
                      [navigator.language?.slice(0, 2).toLowerCase()];
  return supportedLanguages.find(lang => browserLangs.includes(lang)) || 'ru'; // По умолчанию русский
}

/**
 * Загрузка переводов для указанного языка
 */
async function loadTranslations(lang) {
  if (!supportedLanguages.includes(lang)) return;

  if (translations[lang]) return; // Если переводы уже загружены, не загружаем снова

  try {
    const response = await fetch(`./lang/${lang}.json`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    translations[lang] = await response.json();
    console.log(`Переводы для ${lang} успешно загружены`, translations[lang]);
  } catch (error) {
    console.error(`Ошибка загрузки переводов для ${lang}:`, error);
    throw error;
  }
}

/**
 * Обновление контента страницы на основе текущего языка
 */
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

  console.log('Контент обновлен для языка:', currentLanguage);
}

/**
 * Установка текущего языка
 */
async function setLanguage(lang) {
  if (!supportedLanguages.includes(lang)) return;

  try {
    // Сначала пытаемся загрузить основной язык
    await loadTranslations(lang);
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    updateContent();
  } catch (error) {
    console.error(`Ошибка загрузки ${lang}, попытка загрузить резервный язык 'en'`);
    try {
      // Если основной не загрузился, загружаем английский как резервный
      await loadTranslations('en');
      currentLanguage = 'en';
      localStorage.setItem('preferredLanguage', 'en');
      updateContent();
    } catch (err) {
      console.error('Не удалось загрузить ни один язык', err);
    }
  }
}

/**
 * Инициализация приложения
 */
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
    console.log('Язык установлен:', lang);
  } catch (error) {
    console.error('Ошибка инициализации языка:', error);
  }

  // Вешаем обработчик на переключатель языка
  document.getElementById('language-switch')?.addEventListener('change', e => {
    setLanguage(e.target.value); // Переключаем язык при изменении
  });
});
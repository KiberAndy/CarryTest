// i18n.js - Система перевода
const i18n = {
  currentLanguage: 'ru',
  translations: {},
  supportedLanguages: ['ru', 'en'],

  // Инициализация системы
  async init() {
    await this.loadTranslations('ru');
    await this.loadTranslations('en');
    this.setLanguage(this.detectPreferredLanguage());
  },

  // Загрузка переводов
  async loadTranslations(lang) {
    try {
      const response = await fetch(`/lang/${lang}.json`);
      this.translations[lang] = await response.json();
    } catch (error) {
      console.error(`Error loading ${lang} translations:`, error);
    }
  },

  // Установка языка
  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) return;
    this.currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    this.applyTranslations();
  },

  // Определение языка браузера
  detectPreferredLanguage() {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && this.supportedLanguages.includes(storedLang)) {
      return storedLang;
    }
    
    const browserLang = navigator.language.slice(0, 2);
    return this.supportedLanguages.includes(browserLang) ? browserLang : 'ru';
  },

  // Получение перевода
  t(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj?.[key], this.translations[this.currentLanguage]) || keyPath;
  },

  // Применение переводов
  applyTranslations() {
    // Мета-данные
    document.title = this.t('title');
    document.querySelector('meta[name="description"]').content = this.t('description');

    // Обновление интерфейса
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });

    // Обновление вопросов, если тест уже инициализирован
    if (window.quizInitialized) {
      updateQuestionsText();
      renderQuiz();
    }
  }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  
  // Настройка переключателя языка
  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.value = i18n.currentLanguage;
    langSelect.addEventListener('change', (e) => {
      i18n.setLanguage(e.target.value);
    });
  }
});

// Функция для обновления текста вопросов
function updateQuestionsText() {
  questions.forEach((q, index) => {
    const qKey = `question${index + 1}`;
    q.question = i18n.t(`questions.${qKey}`);
    
    if (i18n.t(`options.${qKey}`)) {
      q.options.forEach((opt, i) => {
        opt.text = i18n.t(`options.${qKey}[${i}]`);
      });
    }
  });
}

// Пометить, что тест инициализирован
window.quizInitialized = true;
// 🌐 Улучшенная система перевода интерфейса
let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

// 🔎 Утилита для доступа к переводу по ключу
function t(keyPath) {
    return keyPath.split('.').reduce((obj, key) => {
        if (obj && obj.hasOwnProperty(key)) return obj[key];
        return keyPath;  // Возвращаем ключ, если перевод не найден
    }, translations[currentLanguage]) || keyPath;
}

// 🧠 Умный детектор предпочтительного языка
function detectPreferredLanguage() {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && supportedLanguages.includes(storedLang)) {
        return storedLang;
    }

    const browserLangs = navigator.languages || [navigator.language];
    const normalized = browserLangs.map(l => l.slice(0, 2).toLowerCase());

    return normalized.find(lang => supportedLanguages.includes(lang)) || 'ru';
}

// 🛠️ Загрузка перевода
async function loadTranslations(lang) {
    if (!supportedLanguages.includes(lang)) return;

    try {
        const response = await fetch(`/lang/${lang}.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        translations[lang] = await response.json();
    } catch (error) {
        console.error(`[i18n] Error loading ${lang}:`, error);
    }
}

// 🌍 Установка языка и применение переводов
async function setLanguage(lang) {
    if (currentLanguage === lang) return;

    if (!translations[lang]) {
        await loadTranslations(lang);
    }

    if (!translations[lang]) {
        console.warn(`[i18n] Failed to load ${lang}, keeping ${currentLanguage}`);
        return;
    }

    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    applyTranslations();
}

// 🎨 Применение переводов
function applyTranslations() {
    const tData = translations[currentLanguage];
    if (!tData) return;

    // Обновление мета-данных
    document.title = t('title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = t('description');

    // Обновление статических элементов
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    // Обновление подсказок
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.title = t(el.dataset.tooltip);
    });
}

// 🚀 Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    const lang = detectPreferredLanguage();
    const select = document.getElementById('language-select');
    if (select) select.value = lang;
    await setLanguage(lang);
});

// 🎮 Обработчик выбора языка
const langSelect = document.getElementById('language-select');
if (langSelect) {
    langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}

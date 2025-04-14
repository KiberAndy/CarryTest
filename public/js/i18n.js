// 🌐 Улучшенная система перевода интерфейса
let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

// 🔎 Утилита для доступа к переводу по ключу
function t(keyPath) {
    return keyPath.split('.').reduce((obj, key) => {
        if (obj && obj.hasOwnProperty(key)) return obj[key];
        return undefined;
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
        console.log(`[i18n] Loaded ${lang} translations:`, translations[lang]);
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

    // Обновление вопросов
    updateQuestionsData();
    renderQuiz();
}

// 🔄 Обновление вопросов и опций по ключам i18n
function updateQuestionsData() {
    if (!window.questions || !translations[currentLanguage]) {
        console.warn('[i18n] Вопросы или переводы не загружены');
        return;
    }

    const tData = translations[currentLanguage];
    console.log('[i18n] Загружены переводы:', tData); // Логируем все загруженные переводы

    questions.forEach((q, index) => {
        const qKey = q.question_i18n;
        const optionsKey = q.options_i18n || q.question_i18n;

        // Логируем каждый вопрос и ключи
        console.log(`[i18n] Обработка вопроса ${index + 1}: ${qKey}`);

        // ✅ Перевод текста вопроса
        if (qKey && tData.questions && tData.questions[qKey]) {
            console.log(`[i18n] Перевод для вопроса "${qKey}":`, tData.questions[qKey]);
            q.question = tData.questions[qKey];
        } else {
            console.warn(`[i18n] Не найден перевод для question_i18n: ${qKey}`);
            q.question = '[❌ Нет перевода вопроса]';
        }

        // ✅ Перевод текста вариантов ответа
        if (Array.isArray(q.options)) {
            console.log(`[i18n] Вопрос ${index + 1} содержит варианты ответа. Ключ для перевода опций:`, optionsKey);
            console.log('Translating options for key:', optionsKey, '=>', tData.options?.[optionsKey]);

            const translatedOptions = tData.options?.[optionsKey];

            if (Array.isArray(translatedOptions)) {
                console.log(`[i18n] Найден переведённый список опций для ${optionsKey}:`, translatedOptions);
                q.options.forEach((optText, i) => {
                    if (translatedOptions[i]) {
                        console.log(`[i18n] Опция ${i + 1}: заменена на ${translatedOptions[i]}`);
                        q.options[i] = translatedOptions[i];
                    } else {
                        console.warn(`[i18n] Не найден перевод для опции ${i + 1} вопроса ${optionsKey}`);
                        q.options[i] = '[❌ Нет перевода опции]';
                    }
                });
            } else {
                console.warn(`[i18n] Не найден список опций для ${optionsKey}`);
                q.options = q.options.map(() => '[❌ Нет перевода]');
            }
        } else {
            console.warn(`[i18n] Вопрос ${index + 1} не содержит корректный массив опций`);
        }
    });

    console.log('[i18n] Завершена обработка вопросов и опций:', questions); // Логируем обновленные вопросы и опции
}

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

// 🔄 Обновление данных вопросов
function updateQuestionsData() {
    if (!window.questions || !translations[currentLanguage]) {
        console.warn('[i18n] Вопросы или переводы не загружены');
        return;
    }

    if (!Array.isArray(window.questions) || !window.questions.every(q => q.options && Array.isArray(q.options))) {
        console.error('[i18n] Неверная структура window.questions. Ожидается массив объектов с массивом options');
        return;
    }

    const qData = translations[currentLanguage];
    const qList = qData.questions || {};
    const optList = qData.options || {};

    questions.forEach((q, index) => {
        const qKey = `question${index + 1}`;

        // ✅ Обновление текста вопроса
        if (qList[qKey]) {
            q.question = qList[qKey];
        } else {
            console.warn(`[i18n] Не найден текст вопроса: ${qKey}`);
            q.question = '[❌ Нет перевода вопроса]';
        }

        // ✅ Обновление текста вариантов ответа
        if (optList[qKey] && Array.isArray(optList[qKey])) {
            const optsFromTranslation = optList[qKey];
            q.options.forEach((opt, i) => {
                if (optsFromTranslation[i]) {
                    opt.text = optsFromTranslation[i];
                } else {
                    console.warn(`[i18n] Не найден перевод опции ${i + 1} в ${qKey}`);
                    opt.text = `[❌ Нет текста]`;
                }
            });
        } else {
            console.warn(`[i18n] Не найден список вариантов для ${qKey}`);
            q.options.forEach(opt => {
                opt.text = '[❌ Нет текста]';
            });
        }
    });
}

// 📋 Функция отрисовки викторины
function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) return;

    quizContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const questionHTML = `
            <div class="question">
                <h3>${question.question}</h3>
                <div class="options" id="options-${index}"></div>
            </div>
        `;
        quizContainer.insertAdjacentHTML('beforeend', questionHTML);

        const optionsContainer = quizContainer.querySelector(`#options-${index}`);
        question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option.text || '[❌ Нет текста]';

            // Обработчик выбора ответа
            optionDiv.addEventListener('click', () => {
                if (typeof handleAnswerSelect === 'function') {
                    handleAnswerSelect(index, optIndex, optionDiv);
                } else {
                    console.error('❌ handleAnswerSelect не определён!');
                }
            });

            optionsContainer.appendChild(optionDiv);
        });
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

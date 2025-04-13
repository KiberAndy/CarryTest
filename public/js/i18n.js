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
    if (!tData || !tData.questions || !tData.options) {
        console.warn('[i18n] Вопросы или переводы не загружены');
        return;
    }

    // Обновление мета-данных
    document.title = t('title');
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.content = t('description');

    // Обновление статических элементов
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    // Обновление подсказок
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.title = t(`tooltips.${el.dataset.tooltip}`);
    });

    // Обновление вопросов и опций
    updateQuestionsData();
    renderQuiz();
}

// 🔄 Обновление данных вопросов
function updateQuestionsData() {
    if (!window.questions || !translations[currentLanguage]) return;

    questions.forEach((q) => {
        const qKey = q.question_i18n;
        
        // Обновление текста вопроса
        const translatedQuestion = translations[currentLanguage].questions?.[qKey];
        if (translatedQuestion) {
            q.question = translatedQuestion;
        }

        // Обновление вариантов ответов
        const translatedOptions = translations[currentLanguage].options?.[qKey];
        if (translatedOptions && Array.isArray(q.options)) {
            q.options = q.options.map((opt, i) => translatedOptions[i] ?? opt);
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

        const optionsContainer = document.getElementById(`options-${index}`);
        question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option;

            // Обработчик выбора ответа
            optionDiv.addEventListener('click', () => {
                if (typeof handleAnswerSelect === 'function') {
                    handleAnswerSelect(index, optIndex, optionDiv);
                } else {
                    console.error('[i18n] handleAnswerSelect is not defined');
                }
            });

            optionsContainer.appendChild(optionDiv);
        });
    });
}

// 🚀 Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    const lang = detectPreferredLanguage();
    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = lang;
    await setLanguage(lang);
});

// 🎮 Обработчик выбора языка
const langSelect = document.getElementById('language-select');
if (langSelect) {
    langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}

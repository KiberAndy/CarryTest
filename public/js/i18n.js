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
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('description');

    // Обновление статических элементов
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    // Обновление подсказок
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.title = t(el.dataset.tooltip);
    });

    // Полное обновление вопросов
    updateQuestionsData();
    renderQuiz();
}

// 🔄 Обновление данных вопросов
function updateQuestionsData() {
    if (!window.questions || !translations[currentLanguage]) return;

    questions.forEach((q, index) => {
        const qKey = `question${index + 1}`;

        // Обновление текста вопроса
        if (translations[currentLanguage].questions?.[qKey]) {
            q.question = translations[currentLanguage].questions[qKey];
        }

        // Обновление вариантов ответов
        if (translations[currentLanguage].options?.[qKey]) {
            q.options.forEach((opt, i) => {
                if (translations[currentLanguage].options[qKey][i]) {
                    opt.text = translations[currentLanguage].options[qKey][i];
                } else {
                    console.warn(`[i18n] Missing option ${i} for ${qKey}`);
                }
            });
        }
    });
}

// 📋 Функция отрисовки викторины
function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) {
        console.error(`[UI] quiz-container не найден`);
        return;
    }

    quizContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const questionHTML = `
            <div class="question">
                <h3>${question.question || '[Нет текста вопроса]'}</h3>
                <div class="options" id="options-${index}"></div>
            </div>
        `;
        quizContainer.insertAdjacentHTML('beforeend', questionHTML);

        const optionsContainer = quizContainer.querySelector(`#options-${index}`);
        if (!optionsContainer) return;

        question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option.text || '[Нет текста]';

            optionDiv.addEventListener('click', () => {
                handleAnswerSelect(index, optIndex, optionDiv);
            });

            optionsContainer.appendChild(optionDiv);
        });
    });
}

// ✅ Обработчик выбора ответа
function handleAnswerSelect(questionIndex, optionIndex, optionDiv) {
    console.log(`[Quiz] Вопрос ${questionIndex}, выбран вариант ${optionIndex}`);

    // Подсветка выбранного варианта
    const optionsContainer = optionDiv?.parentElement;
    if (optionsContainer) {
        optionsContainer.querySelectorAll('.option').forEach(el => {
            el.classList.remove('selected');
        });
        optionDiv.classList.add('selected');
    }

    // Здесь можно сохранить выбор, отправить данные или перейти к следующему вопросу
    // Например:
    // saveAnswer(questionIndex, optionIndex);
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

// 🌐 Улучшенная система перевода интерфейса
let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];

// 🔎 Утилита для доступа к переводу по ключу
function t(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj?.[key], translations[currentLanguage]) || keyPath;
}

// 🧠 Умный детектор предпочтительного языка
function detectPreferredLanguage() {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && supportedLanguages.includes(storedLang)) {
        return storedLang;
    }

    const browserLangs = navigator.languages || [navigator.language];
    const normalized = browserLangs.map(l => l.slice(0, 2).toLowerCase());

    const matched = normalized.find(lang => supportedLanguages.includes(lang));
    return matched || 'ru'; // fallback
}

// 🛠️ Загрузка перевода
async function loadTranslations(lang) {
    if (!supportedLanguages.includes(lang)) {
        console.warn(`Язык ${lang} не поддерживается`);
        return;
    }

    try {
        const response = await fetch(`/lang/${lang}.json`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        translations[lang] = await response.json();
    } catch (error) {
        console.error(`Ошибка загрузки перевода "${lang}":`, error);
    }
}

// 🌍 Установка языка и применение переводов
async function setLanguage(lang) {
    if (!translations[lang]) {
        await loadTranslations(lang);
    }

    if (!translations[lang]) {
        console.warn(`Не удалось загрузить ${lang}. Остался ${currentLanguage}`);
        return;
    }

    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    applyTranslations();
}

// 🎨 Применение переводов ко всем меткам и интерфейсу
function applyTranslations() {
    const tData = translations[currentLanguage];
    if (!tData) return;

    // Title и description
    document.title = t('title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('description');

    // Все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) el.textContent = text;
    });

    // Применение подсказок (tooltips)
    document.querySelectorAll('[data-tooltip]').forEach((el) => {
        const tooltipKey = el.getAttribute('data-tooltip');
        const tooltipText = t(tooltipKey);
        if (tooltipText) el.setAttribute('title', tooltipText);
    });

    // Переводим вопросы через i18n-ключи, если заданы
    if (window.questions && Array.isArray(questions)) {
        questions.forEach((q) => {
            // Перевод текста вопроса по ключу question_i18n
            if (q.question_i18n) {
                const translatedQuestion = t(`questions.${q.question_i18n}`);
                if (translatedQuestion) q.question = translatedQuestion;
            }

            // Перевод текста tooltip, если указан
            if (q.tooltip) {
                const translatedTooltip = t(`tooltips.${q.tooltip}`);
                if (translatedTooltip) q.tooltipText = translatedTooltip;
            }

            // Перевод каждого варианта по его ключу i18n
            q.options?.forEach((opt) => {
                if (opt.i18n) {
                    const translatedOption = t(`options.${opt.i18n}`);
                    if (translatedOption) opt.text = translatedOption;
                }
            });
        });

        // Если уже отрисовано — обновляем
        if (document.getElementById('quiz-container').children.length > 0) {
            renderQuiz();
        }
    }

    // Вопросы (если есть) - дополнительное обновление
    if (window.questions && tData.questions) {
        questions.forEach((q, i) => {
            const qTrans = tData.questions[i];
            if (!qTrans) return;
            q.question = qTrans.question || q.question;
            q.options = qTrans.options || q.options;
        });

        if (document.getElementById('quiz-container').children.length > 0) {
            renderQuiz();
        }
    }
}

// 🚀 Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const defaultLang = detectPreferredLanguage();

    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = defaultLang;
        langSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }

    setLanguage(defaultLang);
});

// 📋 Функция отрисовки викторины
function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = ''; // Очищаем контейнер перед рендерингом

    questions.forEach((question, index) => {
        // Создаем элемент для вопроса
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        questionElement.innerHTML = `<strong>Вопрос ${index + 1}/20</strong>: ${question.question}`;

        // Создаем элементы для вариантов ответа
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options';

        question.options.forEach((option) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option.text; // Используем текст из объекта option

            // Добавляем обработчик события для выбора варианта
            optionElement.addEventListener('click', () => {
                // Логика выбора варианта
                console.log(`Выбран вариант: ${option.text}`);
            });

            optionsContainer.appendChild(optionElement);
        });

        questionElement.appendChild(optionsContainer);
        quizContainer.appendChild(questionElement);
    });
}
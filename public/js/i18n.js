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
        console.log(`Переводы для языка ${lang} загружены:`, translations[lang]);
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
    if (window.questions && Array.isArray(window.questions)) {
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

        // После применения переводов вызываем renderQuiz
        renderQuiz();
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

    // Пример загрузки вопросов
    window.questions = [
        {
            "question": "Как ты реагируешь на проигрыш?",
            "question_i18n": "question1",
            "options": [
                { "text": "Спокойно анализирую ошибки", "i18n": "q1o1" },
                { "text": "Лёгкое недовольство", "i18n": "q1o2" },
                { "text": "Сильно расстраиваюсь", "i18n": "q1o3" },
                { "text": "Злюсь и обвиняю команду", "i18n": "q1o4" }
            ],
            "trait": "temperament",
            "weights": [100, 70, 30, 0]
        },
        {
            "question": "Ты предпочитаешь играть:",
            "question_i18n": "question2",
            "options": [
                { "text": "Всегда на команду", "i18n": "q2o1" },
                { "text": "В основном на команду", "i18n": "q2o2" },
                { "text": "Чаще на себя", "i18n": "q2o3" },
                { "text": "Только на себя", "i18n": "q2o4" }
            ],
            "trait": "teamSpirit",
            "weights": [100, 75, 30, 0]
        },
        // Другие вопросы...
    ];

    setLanguage(defaultLang);

    // Проверка загрузки вопросов
    if (!window.questions || !Array.isArray(window.questions)) {
        console.error('Вопросы не загружены или имеют неверную структуру');
    } else {
        console.log('Вопросы загружены:', window.questions);
    }
});

// 📋 Функция отрисовки викторины
function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = ''; // Очищаем контейнер перед рендерингом

    if (!window.questions || !Array.isArray(window.questions)) {
        console.error('Вопросы не загружены или имеют неверную структуру');
        return;
    }

    questions.forEach((question, index) => {
        console.log(`Отрисовка вопроса ${index + 1}:`, question);

        // Создаем элемент для вопроса
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        questionElement.innerHTML = `<strong>Вопрос ${index + 1}/20</strong>: ${question.question}`;

        // Создаем элементы для вариантов ответа
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options';

        if (!question.options || !Array.isArray(question.options)) {
            console.error(`Вопрос ${index + 1} не содержит вариантов ответа`);
            return;
        }

        question.options.forEach((option) => {
            console.log(`Отрисовка варианта ответа:`, option);

            if (!option.text) {
                console.error(`Вариант ответа у вопроса ${index + 1} не содержит текста`);
                return;
            }

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
// 🌐 Улучшенная система перевода интерфейса
let currentLanguage = 'ru';
const translations = {};
const supportedLanguages = ['ru', 'en'];
let answers = {}; // Добавляем хранилище ответов

// 🔎 Утилита для доступа к переводу по ключу
function t(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj?.[key], translations[currentLanguage]) || keyPath;
}

// 🧠 Обновленный детектор языка
function detectPreferredLanguage() {
    return localStorage.getItem('preferredLanguage') || 
           navigator.language.slice(0, 2) === 'en' ? 'en' : 'ru';
}

// 🛠️ Загрузка перевода
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/lang/${lang}.json`);
        translations[lang] = await response.json();
        console.log('Translations loaded:', translations[lang]);
    } catch (error) {
        console.error('Translation load error:', error);
    }
}

// 🌍 Установка языка
async function setLanguage(lang) {
    if (!translations[lang]) await loadTranslations(lang);
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    applyTranslations();
}

// 🎨 Применение переводов
function applyTranslations() {
    // Обновляем мета-данные
    document.title = t('title');
    document.querySelector('meta[name="description"]').content = t('description');

    // Обновляем селектор языка
    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = currentLanguage;

    // Полностью перерисовываем викторину
    renderQuiz();
}

// 📋 Функция отрисовки викторины
function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = '';

    questions.forEach((q, index) => {
        const questionHTML = `
            <div class="question">
                <h3>${t(`questions.question${index + 1}`)}</h3>
                <div class="options" id="options-${index}"></div>
            </div>
        `;
        quizContainer.insertAdjacentHTML('beforeend', questionHTML);

        const optionsContainer = document.getElementById(`options-${index}`);
        const options = t(`options.question${index + 1}`);

        options.forEach((optionText, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = `option${answers[index] === optIndex ? ' selected' : ''}`;
            optionDiv.textContent = optionText;
            
            optionDiv.addEventListener('click', () => {
                handleAnswerSelect(index, optIndex, optionsContainer);
            });

            optionsContainer.appendChild(optionDiv);
        });
    });

    updateProgress();
}

// 🎮 Обработчик выбора ответа
function handleAnswerSelect(questionIndex, optionIndex, container) {
    // Сбрасываем выделение
    container.querySelectorAll('.option').forEach(opt => 
        opt.classList.remove('selected')
    );
    
    // Устанавливаем новый выбор
    container.children[optionIndex].classList.add('selected');
    answers[questionIndex] = optionIndex;
    
    // Сохраняем и обновляем прогресс
    localStorage.setItem('playerCompatibilityAnswers', JSON.stringify(answers));
    updateProgress();
}

// 📊 Обновление прогресса
function updateProgress() {
    const progress = document.getElementById('completion-info');
    if (progress) {
        const answered = Object.keys(answers).length;
        progress.textContent = `${answered}/${questions.length} questions answered`;
    }
}

// 🚀 Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    // Загрузка сохраненных ответов
    answers = JSON.parse(localStorage.getItem('playerCompatibilityAnswers')) || {};
    
    // Инициализация языка
    const lang = detectPreferredLanguage();
    document.getElementById('language-select').value = lang;
    await setLanguage(lang);
    
    // Обработчик изменения языка
    document.getElementById('language-select').addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
});
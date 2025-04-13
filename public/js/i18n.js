// i18n.js — полный, несокращённый, рабочий

let currentLanguage = "ru";
let translations = {};

// Сохраняем оригинальные вопросы для возврата при смене языка
window.originalQuestions = window.originalQuestions || JSON.parse(JSON.stringify(questions));

async function setLanguage(lang) {
  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error(`[i18n] Translation file not found: /lang/${lang}.json`);

    const translated = await res.json();
    translations = translated;
    currentLanguage = lang;

    console.log(`[i18n] Loaded ${lang} translations:`, translated);
    applyTranslations();
  } catch (err) {
    console.error("[i18n]", err);
  }
}

function applyTranslations() {
  document.getElementById("title").textContent = translations.title || "Player Compatibility Test";
  document.getElementById("description").textContent = translations.description || "";

  updateQuestionsData();
  renderQuestions();
  restoreSelectedAnswers();
}

function updateQuestionsData() {
  if (!translations.questions || !translations.options) {
    console.warn("[i18n] Вопросы или переводы не загружены");
    return;
  }

  questions = window.originalQuestions.map((q) => {
    const id = q.question_i18n;
    const translatedQuestion = translations.questions[id] || q.question;
    const translatedOptions = translations.options[id] || q.options;

    return {
      ...q,
      question: translatedQuestion,
      options: translatedOptions
    };
  });
}

function renderQuestions() {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question-block";

    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.innerHTML = q.question;
    qDiv.appendChild(qText);

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    q.options.forEach((opt, optIndex) => {
      const btn = document.createElement("button");
      btn.className = "option-button";
      btn.innerHTML = opt;
      btn.addEventListener("click", () => handleAnswerSelect(index, optIndex));
      optionsDiv.appendChild(btn);
    });

    qDiv.appendChild(optionsDiv);
    container.appendChild(qDiv);
  });
}

let selectedAnswers = [];

function handleAnswerSelect(questionIndex, optionIndex) {
  selectedAnswers[questionIndex] = optionIndex;
  highlightSelectedAnswers();
}

function highlightSelectedAnswers() {
  const blocks = document.querySelectorAll(".question-block");

  blocks.forEach((block, qIndex) => {
    const buttons = block.querySelectorAll(".option-button");
    buttons.forEach((btn, oIndex) => {
      btn.classList.toggle("selected", selectedAnswers[qIndex] === oIndex);
    });
  });
}

function restoreSelectedAnswers() {
  highlightSelectedAnswers();
}

// Автозагрузка языка с локали браузера
const browserLang = navigator.language.startsWith("ru") ? "ru" : "en";
setLanguage(browserLang);

// Поддержка переключателя языка (если он есть)
document.querySelectorAll(".lang-switch").forEach(btn => {
  btn.addEventListener("click", () => {
    const lang = btn.getAttribute("data-lang");
    setLanguage(lang);
  });
});

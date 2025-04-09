// netlify/functions/saveResults.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 🔁 Стабильная сериализация (гарантирует одинаковый hash)
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys.map(key => `"${key}":${stableStringify(obj[key])}`).join(',')}}`;
}

// 🧬 Генерация токена (на основе хэша, с base64 обрезкой)
function generateStableRandomToken(dataString, length = 7) {
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  const base62 = Buffer.from(hash, 'hex').toString('base64')
    .replace(/[+/=]/g, '').slice(0, length).replace(/^\d/, 'a');
  return base62;
}

// 🔑 Генерация session_id (на всякий случай, вдруг пригодится)
function generateId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    console.log('❌ Запрос не POST. Возвращаем ошибку 405');
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    console.log('🔄 Начинаем обработку запроса...');
    
    // Логируем тело запроса
    const body = event.body ? JSON.parse(event.body) : {};
    console.log('Тело запроса:', body);

    // Проверяем, является ли запрос запросом конфигурации
    if (body.action === 'config') {
      console.log('🔄 Обработка запроса конфигурации...');
      // Возвращаем переменные окружения
      return {
        statusCode: 200,
        body: JSON.stringify({
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_KEY: process.env.SUPABASE_KEY
        })
      };
    }

    // Остальная логика сохранения результатов теста
    const { answers, scores } = body;

    // 🔍 Валидация данных
    if (!answers || typeof answers !== 'object') {
      console.log('❌ Недействительные ответы');
      throw new Error('Invalid or missing "answers"');
    }
    if (!scores || typeof scores !== 'object') {
      console.log('❌ Недействительные оценки');
      throw new Error('Invalid or missing "scores"');
    }

const answersString = stableStringify({ answers, scores });
const shareToken = generateStableRandomToken(answersString);
const sessionId = generateId('session-');

const serverTime = new Date().toISOString();  // Точное время с сервера
return {
  statusCode: 200,
  body: JSON.stringify({
    share_token: shareToken,
    expires_at: expiresAt.toISOString(),
    server_time: serverTime  // Отправляем точное время с сервера
  })
};


// ⏳ Устанавливаем срок жизни токена
const expiresAt = new Date();
expiresAt.setMinutes(expiresAt.getMinutes() + 1);

// Логируем время жизни токена
console.log(`⏳ Токен будет жить до: ${expiresAt.toISOString()} — потом RIP 🪦`);

const expiresAt = new Date(expires_at);
const currentTime = new Date();
const bufferTime = 2000; // 2 секунды на запас

if (expiresAt.getTime() + bufferTime > currentTime.getTime()) {
  console.log('✅ Токен действителен!');
} else {
  console.log('❌ Токен истёк!');
}


// 4. Возвращаем срок действия токена
return {
  statusCode: 200,
  body: JSON.stringify({
    share_token: shareToken,
    expires_at: expiresAt.toISOString()  // Отправляем expiresAt в ответ
  })
};

// 🧪 Инициализация Supabase
console.log('🔄 Инициализация Supabase...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


// 🔁 Проверка на дубликат
console.log('🔄 Проверка на дубликат в базе данных...');
const { data: existing, error: selectError } = await supabase
  .from('test_results')
  .select('share_token')
  .eq('answers_hash', shareToken)
  .maybeSingle();

if (selectError) {
  console.log('❌ Ошибка при запросе из базы:', selectError);
  throw selectError;
}

if (existing) {
  console.log('✅ Дублирование найдено, возвращаем существующий токен');
  return {
    statusCode: 200,
    body: JSON.stringify({ share_token: existing.share_token, reused: true })
  };
}

// 📝 Сохраняем новый результат в таблицу
console.log('🔄 Сохраняем новые данные в Supabase...');
const { error } = await supabase.from('test_results').insert([{
  answers,
  scores,
  session_id: sessionId,
  share_token: shareToken,
  answers_hash: shareToken,
  created_at: new Date().toISOString(),
  expires_at: expiresAt.toISOString() // 🎯 ВАЖНО: срок действия токена
}]);


    if (error) {
      console.error('❌ Ошибка при сохранении в Supabase:', error);
      throw error;
    }

    console.log('✅ Результаты успешно сохранены');
    return {
      statusCode: 200,
      body: JSON.stringify({ share_token: shareToken, reused: false })
    };

  } catch (error) {
    console.error('❌ Ошибка на сервере:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};

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
    console.log('❌ Некорректный метод запроса');
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const { answers, scores } = JSON.parse(event.body);
    console.log('Загружены данные:', { answers, scores });

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

    // 🧪 Инициализация Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 🔁 Проверка на дубликат
    const { data: existing } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();

    if (existing) {
      console.log('✅ Дублирование найдено, возвращаем существующий токен');
      return {
        statusCode: 200,
        body: JSON.stringify({ share_token: existing.share_token, reused: true })
      };
    }

    // 📝 Сохраняем результат
    const { error } = await supabase.from('test_results').insert([{
      answers,
      scores,
      session_id: sessionId,
      share_token: shareToken,
      answers_hash: shareToken,
      created_at: new Date().toISOString()
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
    console.error('❌ saveResults ошибка:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto'); // Используем встроенный модуль для хеширования

// 1. Стабильная сериализация данных
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys.map(key => 
    `"${key}":${stableStringify(obj[key])}`
  ).join(',')}}`;
}

// 2. Генерация случайного, но стабильного токена
function generateStableRandomToken(dataString, length = 7) {
  // Создаем хеш SHA-256 от данных
  const hash = crypto.createHash('sha256')
    .update(dataString)
    .digest('hex'); // 64 символа
  
  // Преобразуем хеш в base62 (0-9a-zA-Z)
  const base62 = Buffer.from(hash, 'hex')
    .toString('base64')
    .replace(/[+/=]/g, '') // Убираем не-URL-safe символы
    .slice(0, length)
    .replace(/^\d/, 'a'); // Гарантируем, что токен не начинается с цифры

  return base62;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST' };
  }

  try {
    const { answers, scores } = JSON.parse(event.body);
    if (!answers || !scores) throw new Error('Missing data');

    // 1. Стабильная сериализация
    const dataString = stableStringify({ answers, scores });
    
    // 2. Генерация токена (стабильный для одинаковых данных)
    const shareToken = generateStableRandomToken(dataString);

    // 3. Поиск существующей записи
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { data: existing } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          share_token: existing.share_token,
          reused: true 
        })
      };
    }

    // 4. Сохранение новой записи
    const { data: newRecord } = await supabase
      .from('test_results')
      .insert([{
        answers,
        scores,
        answers_hash: shareToken, // Хеш как ID
        share_token: shareToken,
        created_at: new Date().toISOString()
      }])
      .select();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        share_token: shareToken,
        reused: false 
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
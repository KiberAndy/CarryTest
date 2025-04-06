const { createClient } = require('@supabase/supabase-js');

// 🔄 Стабильный JSON.stringify (одинаковый для одинаковых данных)
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const keyValuePairs = sortedKeys.map(key => 
    `"${key}":${stableStringify(obj[key])}`
  );
  return `{${keyValuePairs.join(',')}}`;
}

// 🎲 Генератор случайных токенов (но стабильных для одинаковых данных)
function generateRandomToken(baseString) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let hash = 0;

  // 1. Создаем хеш на основе данных (для стабильности)
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Преобразуем в 32-битное целое
  }

  // 2. Добавляем случайность, но так, чтобы одинаковые данные давали одинаковый токен
  const rnd = Math.abs(hash) % 1000000;
  let token = '';
  
  for (let i = 0; i < 7; i++) {
    const index = (rnd + i * 31) % chars.length;
    token += chars[index];
  }

  return token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Только POST!' }) };
  }

  try {
    const { answers, scores } = JSON.parse(event.body);
    if (!answers || !scores) {
      throw new Error('Нет answers или scores!');
    }

    // 1. Создаем стабильную строку из данных (для поиска дубликатов)
    const dataString = stableStringify({ answers, scores });
    
    // 2. Генерируем токен (рандомный, но стабильный для одинаковых данных)
    const shareToken = generateRandomToken(dataString);

    // 3. Ищем в Supabase, есть ли уже такой результат
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: existing, error: lookupError } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();

    if (lookupError) throw lookupError;

    // 4. Если нашли дубликат → возвращаем старую ссылку
    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          share_token: existing.share_token,
          reused: true 
        })
      };
    }

    // 5. Если нет → сохраняем в базу и возвращаем новую ссылку
    const { data: newResult, error: insertError } = await supabase
      .from('test_results')
      .insert([{
        answers,
        scores,
        answers_hash: shareToken, // <- сохраняем хеш для поиска дубликатов
        share_token: shareToken,  // <- сам токен (b0NvyPh, 4q45ty и т. д.)
        created_at: new Date().toISOString()
      }])
      .select();

    if (insertError) throw insertError;

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
      body: JSON.stringify({ 
        error: 'Ошибка сервера',
        details: error.message 
      })
    };
  }
};
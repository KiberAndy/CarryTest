const { createClient } = require('@supabase/supabase-js');

// 🔒 Стабильный stringify — для одинаковых токенов при одинаковых данных
function stableStringify(obj) {
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  } else if (obj && typeof obj === 'object') {
    return `{${Object.keys(obj).sort().map(key =>
      `"${key}":${stableStringify(obj[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(obj);
}

// 🔑 Генератор токена на основе стабильной сериализации
function generateShareToken(dataString) {
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  hash = Math.abs(hash);

  for (let i = 0; i < 7; i++) {
    token += chars[(hash + i * 31) % chars.length];
  }

  return token;
}

exports.handler = async (event) => {
  // Логирование метода запроса
  console.log('HTTP Method:', event.httpMethod);

  // Проверка метода запроса
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Только POST-запросы разрешены' })
    };
  }

  try {
    // Логирование тела запроса
    console.log('Received body:', event.body);

    // Инициализация Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Парсинг тела запроса
    const { answers, scores } = JSON.parse(event.body);

    if (!answers || !scores) {
      throw new Error('Неверный формат данных: отсутствуют answers или scores');
    }

    // Логирование парсенных данных
    console.log('Parsed answers:', answers);
    console.log('Parsed scores:', scores);

    // Стабильная сериализация данных для генерации токена
    const dataString = stableStringify({ answers, scores });
    const shareToken = generateShareToken(dataString);
    console.log('Generated stable share token:', shareToken);

    // Создаем хеш ответов для поиска
    const answersHash = generateShareToken(dataString); // Используем тот же хеш для поиска

    // Проверяем существование таких результатов
    const { data: existingResult, error: lookupError } = await supabase
      .from('test_results')
      .select('id, share_token')
      .eq('answers_hash', answersHash)
      .maybeSingle();

    if (lookupError) {
      console.error('Error while looking up result:', lookupError);
      throw lookupError;
    }

    // Если нашли - возвращаем существующий токен
    if (existingResult) {
      console.log('Found existing result:', existingResult);
      return {
        statusCode: 200,
        body: JSON.stringify({
          share_token: existingResult.share_token,
          id: existingResult.id,
          reused: true
        })
      };
    }

    // Если не нашли - создаем новую запись
    const { data, error } = await supabase
      .from('test_results')
      .insert([{
        answers,
        scores,
        answers_hash: answersHash,
        share_token: shareToken,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error while inserting result:', error);
      throw error;
    }

    console.log('New result inserted:', data[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        share_token: shareToken,
        id: data[0].id,
        reused: false
      })
    };

  } catch (error) {
    console.error('Server Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Ошибка сервера',
        details: error.message
      })
    };
  }
};

const { createClient } = require('@supabase/supabase-js');

// 🔒 Генерация случайного токена из 62 символов, длиной 7
function generateRandomToken() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < 7; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
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

    // Генерация случайного токена
    const shareToken = generateRandomToken();
    console.log('Generated random share token:', shareToken);

    // Создаем хеш ответов для поиска
    const answersHash = generateRandomToken(); // Здесь мы используем случайный токен вместо хеша

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

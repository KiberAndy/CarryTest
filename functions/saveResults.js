const { createClient } = require('@supabase/supabase-js');

// Функция для создания хеша ответов (должна быть идентичной на клиенте и сервере)
function hashAnswers(answers) {
  const str = JSON.stringify(answers);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 8);  // Возвращаем хеш
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

    // Создаем хеш ответов (будет использован как share_token)
    const answersHash = hashAnswers(answers);
    console.log('Generated answers hash:', answersHash);

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
        share_token: answersHash,
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
        share_token: answersHash,
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

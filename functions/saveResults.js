// netlify/functions/saveResults.js
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
  return Math.abs(hash).toString(36).slice(0, 8);
}

exports.handler = async (event) => {
  // Проверка метода запроса
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Только POST-запросы разрешены' })
    };
  }

  try {
    // Инициализация Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Парсинг тела запроса
    const { answers, scores, shareToken } = JSON.parse(event.body);
    if (!answers || !scores || !shareToken) {
      throw new Error('Неверный формат данных: отсутствуют answers, scores или shareToken');
    }

    // Проверка существования токена в базе данных
    const { data: existingResult, error: lookupError } = await supabase
      .from('test_results')
      .select('id, share_token')
      .eq('share_token', shareToken)
      .maybeSingle();

    // Если нашли - возвращаем существующий токен
    if (existingResult) {
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
        share_token: shareToken,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        share_token: shareToken,
        id: data[0].id,
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

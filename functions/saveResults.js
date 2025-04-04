// netlify/functions/saveResults.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Проверяем метод запроса
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Только POST-запросы разрешены' })
    };
  }

  try {
    // Инициализация Supabase с вашими переменными
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,    // Используем ваш формат
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Парсим тело запроса
    const requestData = JSON.parse(event.body);
    
    // Валидация данных
    if (!requestData?.answers || !requestData?.scores) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Неверный формат данных' })
      };
    }

    // Генерация токена (6 символов)
    const shareToken = Math.random().toString(36).substring(2, 8);

    // Запись в Supabase
    const { data, error } = await supabase
      .from('test_results')
      .insert([{
        answers: requestData.answers,
        scores: requestData.scores,
        share_token: shareToken,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        share_token: shareToken,
        id: data[0].id 
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
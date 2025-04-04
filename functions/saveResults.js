// netlify/functions/saveResults.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log("📥 Incoming request:", {
    method: event.httpMethod,
    body: event.body
  });

  // Проверяем метод запроса
  if (event.httpMethod !== 'POST') {
    console.log("❌ Метод не POST");
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Только POST-запросы разрешены' })
    };
  }

  try {
    // Проверка переменных окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("🔐 Supabase env:", {
      url: supabaseUrl,
      keyPresent: !!supabaseKey
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("❌ Supabase переменные окружения не заданы");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Парсим тело запроса
    let requestData;
    try {
      requestData = JSON.parse(event.body);
      console.log("📦 Parsed request data:", requestData);
    } catch (parseError) {
      console.log("❌ Ошибка при парсинге тела запроса:", parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Невозможно распарсить тело запроса' })
      };
    }

    // Валидация данных
    if (!requestData?.answers || !requestData?.scores) {
      console.log("❌ Неверный формат данных:", requestData);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Неверный формат данных' })
      };
    }

    const shareToken = Math.random().toString(36).substring(2, 8);
    const insertPayload = {
      answers: requestData.answers,
      scores: requestData.scores,
      share_token: shareToken,
      created_at: new Date().toISOString()
    };

    console.log("📝 Payload for Supabase insert:", insertPayload);

    const { data, error } = await supabase
      .from('test_results')
      .insert([insertPayload])
      .select();

    if (error) {
      console.log("❌ Ошибка Supabase:", error);
      throw error;
    }

    console.log("✅ Успешно сохранено в Supabase:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        share_token: shareToken,
        id: data[0].id
      })
    };

  } catch (error) {
    console.log("🔥 Сработал catch:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Ошибка сервера',
        details: error.message
      })
    };
  }
};

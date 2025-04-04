// Импортируем Supabase JS (не требуется установка, Netlify включает его автоматически)
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Параметры из URL: /getResults?token=XXX
  const { token } = event.queryStringParameters;

  // Инициализируем Supabase с ключами из переменных окружения
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Запрос к Supabase
    const { data, error } = await supabase
      .from('test_results')  // Ваша таблица
      .select('*')
      .eq('share_token', token)  // Поле с токеном
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
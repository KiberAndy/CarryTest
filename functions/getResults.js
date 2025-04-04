const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { token } = event.queryStringParameters;

  // Используем переменные с префиксом NEXT_PUBLIC_
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,    // Из настроек Netlify
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Из настроек Netlify
  );

  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('share_token', token)
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
      body: JSON.stringify({ error: "Failed to load results" }),
    };
  }
};
// Запрос переменных окружения из Netlify Functions
fetch('/.netlify/functions/env')
  .then(response => response.json())
  .then(env => {
    const supabase = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    console.log('✅ Supabase подключён!', supabase);
  })
  .catch(err => console.error('Ошибка получения переменных:', err));


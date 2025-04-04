exports.handler = async (event) => {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const data = JSON.parse(event.body);
        
        // Проверяем завершение теста
        if (!data.completed) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Тест не завершён' }) };
        }

        // Генерируем токен
        const share_token = crypto.randomUUID().split('-')[0];

        // Сохраняем в Supabase
        const { error } = await supabase
            .from('test_results')
            .insert([{ 
                answers: data.answers,
                scores: data.scores,
                share_token,
                created_at: data.timestamp
            }]);

        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ share_token }) };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};
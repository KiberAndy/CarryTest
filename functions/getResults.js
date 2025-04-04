const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const testData = JSON.parse(event.body);
        const share_token = crypto.randomUUID().split('-')[0]; // Более надежный токен

        const { error } = await supabase
            .from('test_results')
            .insert([{ ...testData, share_token }]);

        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ share_token }) };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};
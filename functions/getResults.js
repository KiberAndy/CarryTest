const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const data = JSON.parse(event.body);
        const share_token = Math.random().toString(36).substring(2, 10);

        const { error } = await supabase
            .from('test_results')
            .insert([{ ...data, share_token }]);

        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify({ share_token })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
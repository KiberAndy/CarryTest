// netlify/functions/saveResults.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 🔁 1. Стабильная сериализация
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys.map(key => `"${key}":${stableStringify(obj[key])}`).join(',')}}`;
}

// 🧬 2. Генерация токена
function generateStableRandomToken(dataString, length = 7) {
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  const base62 = Buffer.from(hash, 'hex').toString('base64')
    .replace(/[+/=]/g, '').slice(0, length).replace(/^\d/, 'a');
  return base62;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const { answers, scores } = JSON.parse(event.body);
    if (!Array.isArray(answers) || typeof scores !== 'object') {
      throw new Error('Invalid or missing data');
    }

    const dataString = stableStringify({ answers, scores });
    const shareToken = generateStableRandomToken(dataString);

    // 🛡️ Безопасные переменные
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { data: existing } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ share_token: existing.share_token, reused: true })
      };
    }

    await supabase.from('test_results').insert([{
      answers,
      scores,
      answers_hash: shareToken,
      share_token: shareToken,
      created_at: new Date().toISOString()
    }]);

    return {
      statusCode: 200,
      body: JSON.stringify({ share_token: shareToken, reused: false })
    };

  } catch (error) {
    console.error('❌ saveResults ошибка:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack // 👈 добавим стек ошибки
      })
    };
  } // ← закрытие try/catch
};   // ← закрытие handler


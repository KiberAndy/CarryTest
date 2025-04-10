// netlify/functions/saveResults.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 📦 Стабильная сериализация
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys.map(key => `"${key}":${stableStringify(obj[key])}`).join(',')}}`;
}

// 🧬 Генерация токена (hash → base64 → trimmed)
function generateStableRandomToken(dataString, length = 7) {
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  const base62 = Buffer.from(hash, 'hex').toString('base64')
    .replace(/[+/=]/g, '').slice(0, length).replace(/^\d/, 'a');
  return base62;
}

function generateId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    if (body.action === 'config') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          SUPABASE_URL: SUPABASE_URL,
          SUPABASE_KEY: SUPABASE_SERVICE_ROLE_KEY
        })
      };
    }

    const { answers, scores, session_id, hcaptcha_token } = body;
    const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';

    if (!answers || typeof answers !== 'object') throw new Error('Invalid or missing "answers"');
    if (!scores || typeof scores !== 'object') throw new Error('Invalid or missing "scores"');
    if (!hcaptcha_token) throw new Error('Missing hCaptcha token');

    // 🧠 Проверка hCaptcha
    const captchaCheck = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET,
        response: hcaptcha_token,
        remoteip: ip
      }),
    });
    const captchaResult = await captchaCheck.json();
    if (!captchaResult.success) return { statusCode: 403, body: 'Captcha failed' };

    // 🚦 Rate limit через Redis
    const rateKey = `ip:${ip}`;
    const redisRes = await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${rateKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });
    const count = parseInt(await redisRes.text());
    if (count === 1) {
      await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${rateKey}/600`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      });
    }
    if (count > 10) {
      return { statusCode: 429, body: 'Too many requests, try again later.' };
    }

    // 🧩 Генерация токена и сессии
    const answersString = stableStringify({ answers, scores });
    const shareToken = generateStableRandomToken(answersString);
    const finalSessionId = session_id || generateId('session-');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    // 🔌 Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 🔁 Проверка на дубликат
    const { data: existing, error: selectError } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ share_token: existing.share_token, reused: true })
      };
    }

    const { error: insertError } = await supabase.from('test_results').insert([{
      answers,
      scores,
      session_id: finalSessionId,
      share_token: shareToken,
      answers_hash: shareToken,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }]);
    if (insertError) throw insertError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        reused: false
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};


const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys.map(key => `"${key}":${stableStringify(obj[key])}`).join(',')}}`;
}

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
  console.log('🛰️ Новый запрос:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    console.log('📦 Распарсено тело:', body);

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
    
    function getClientIp(event) {
        let ip = event.headers['x-forwarded-for'];
        
        if (ip) {
            // Берем первый IP, если их несколько
            ip = ip.split(',')[0].trim();
        } else {
            ip = event.headers['client-ip'] || '';
        }
        
        // Проверяем, что IP валидный (v4 или v6)
        if (!ip || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/.test(ip)) {
            console.warn('⚠️ Неверный IP, пропускаем проверку');
            return undefined;
        }
        
        return ip;
    }

    if (!answers || typeof answers !== 'object') throw new Error('Invalid or missing "answers"');
    if (!scores || typeof scores !== 'object') throw new Error('Invalid or missing "scores"');
    if (!hcaptcha_token) throw new Error('Missing hCaptcha token');

    console.log('✅ Данные прошли первичную валидацию');

    // Логируем значение HCAPTCHA_SECRET
    console.log('HCAPTCHA_SECRET:', process.env.HCAPTCHA_SECRET);
    
    // 1. Получаем IP с защитой от ошибок
    let ip;
    try {
        ip = getClientIp(event);
        console.log('Определен IP адрес:', ip);
    } catch (error) {
        console.error('Ошибка при получении IP:', error);
        ip = null;
    }

    // 2. Проверяем наличие обязательных данных
    if (!HCAPTCHA_SECRET) {
        console.error('HCAPTCHA_SECRET не настроен');
        return { statusCode: 500, body: 'Server configuration error' };
    }

    // 3. Формируем параметры для hCaptcha
    const captchaParams = {
        secret: HCAPTCHA_SECRET,
        response: hcaptcha_token
    };

    // Добавляем IP только если он валидный
    if (ip) {
        captchaParams.remoteip = ip;
    }

    // 4. Логируем параметры перед отправкой
    console.log('Параметры для hCaptcha:', {
        hasIp: !!ip,
        tokenPresent: !!hcaptcha_token,
        secretPresent: !!HCAPTCHA_SECRET
    });

    try {
        // 🧠 hCaptcha
        const captchaCheck = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(captchaParams),
        });

        const captchaResult = await captchaCheck.json();

        // Логируем результат запроса
        console.log('🧪 Результат hCaptcha:', captchaResult);

        // Если капча не прошла валидацию
        if (!captchaResult.success) {
            console.error('❌ Ошибка капчи:', captchaResult['error-codes']);
            return { 
                statusCode: 403, 
                body: JSON.stringify({
                    error: 'Проверка капчи не пройдена',
                    details: captchaResult['error-codes']
                })
            };
        }
    } catch (error) {
        console.error('🔥 Ошибка при проверке капчи:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({
                error: 'Ошибка сервера при проверке капчи',
                details: error.message
            })
        };
    }



    // 🚦 Redis Rate Limit
    const rateKey = `ip:${ip}`;
    const redisRes = await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${rateKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });
    const count = parseInt(await redisRes.text());
    console.log('🔢 Redis счётчик:', count);

    if (count === 1) {
      await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${rateKey}/600`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      });
      console.log('🕒 Redis TTL установлен');
    }

    if (count > 10) {
      console.warn('🚫 Превышен лимит запросов');
      return { statusCode: 429, body: 'Too many requests, try again later.' };
    }

    // 🔗 Подключение Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const answersString = stableStringify({ answers, scores });
    const shareToken = generateStableRandomToken(answersString);
    const finalSessionId = session_id || generateId('session-');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('🛠️ Начинаем вставку. shareToken:', shareToken);

    const { data: existing, error: selectError } = await supabase
      .from('test_results')
      .select('share_token')
      .eq('answers_hash', shareToken)
      .maybeSingle();
    if (selectError) {
      console.error('❌ Ошибка при SELECT:', selectError);
      throw selectError;
    }

    if (existing) {
      console.log('♻️ Найден дубликат. Возвращаем существующий токен.');
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
    if (insertError) {
      console.error('❌ Ошибка при INSERT:', insertError);
      throw insertError;
    }

    console.log('✅ Результат успешно сохранён');

    return {
      statusCode: 200,
      body: JSON.stringify({
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        reused: false
      })
    };
  } catch (error) {
    console.error('🔥 Системная ошибка:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};

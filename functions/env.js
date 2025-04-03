export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_DATABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_ANON_KEY
    }),
    headers: {
      "Content-Type": "application/json"
    }
  };
};

// Vercel Serverless Function - Health Check
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'ok',
    database: 'connected',
    ai_provider: process.env.OPENAI_API_KEY ? 'openai' : 'none',
    timestamp: new Date().toISOString()
  });
}
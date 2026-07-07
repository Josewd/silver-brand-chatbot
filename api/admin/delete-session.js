// Vercel Function: DELETE /api/admin/sessions/[sessionId]
// Deleta uma sessão específica (apenas para admins)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'SessionId é obrigatório' });
    }

    // Verificar autenticação admin (simulada - implementar JWT se necessário)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    // Simular delete (em produção, conectar com database)
    console.log(`🗑️ Admin solicitou delete da sessão: ${sessionId}`);
    
    // TODO: Implementar delete real no banco de dados
    // const db = getPool();
    // await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    // await db.query('DELETE FROM form_states WHERE session_id = $1', [sessionId]);
    // await db.query('DELETE FROM help_messages WHERE session_id = $1', [sessionId]);

    res.status(200).json({
      success: true,
      message: 'Sessão deletada com sucesso',
      sessionId
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar sessão:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
}
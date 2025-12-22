
import { Resend } from 'resend';

// Certifique-se de configurar a variável de ambiente RESEND_API_KEY no painel do Vercel.
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido. Use POST.` });
  }

  const { to, name, username, password } = req.body;

  if (!to || !name || !username || !password) {
    return res.status(400).json({ error: 'Dados insuficientes para o envio: to, name, username e password são obrigatórios.' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'ALS Transportes <no-reply@resend.dev>', // Substitua por no-reply@seudominio.com.br após validar no Resend
      to: [to],
      subject: 'Portal ALS - Suas Credenciais de Acesso',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 24px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -1px; font-style: italic;">ALS TRANSPORTES</h1>
            <p style="color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Portal Operacional SSZ</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Olá, <strong>${name}</strong>.</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Suas credenciais para acesso ao sistema foram geradas pelo administrador operacional. Utilize os dados abaixo para logar:</p>
            
            <div style="margin: 25px 0; padding: 20px; background-color: #f1f5f9; border-radius: 12px;">
              <div style="margin-bottom: 15px;">
                <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Usuário / CPF</span>
                <div style="font-size: 18px; font-weight: 900; color: #1e40af; font-family: monospace;">${username}</div>
              </div>
              <div>
                <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Senha Provisória</span>
                <div style="font-size: 18px; font-weight: 900; color: #059669; font-family: monospace;">${password}</div>
              </div>
            </div>
            
            <p style="font-size: 12px; color: #ef4444; font-weight: bold; margin-bottom: 0;">Nota: No seu primeiro login, o sistema exigirá que você altere sua senha por questões de segurança.</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">Este é um e-mail automático. Favor não responder.</p>
            <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} ALS Transportes</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Erro Resend:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error('Erro Crítico API:', err);
    return res.status(500).json({ error: err.message || 'Falha interna ao processar envio de e-mail.' });
  }
}

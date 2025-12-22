
import { Resend } from 'resend';

// A chave de API deve ser configurada no painel do Vercel como RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  // Garantir que apenas requisições POST sejam aceitas
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { to, name, username, password } = req.body;

  // Validação básica dos dados recebidos
  if (!to || !name || !username || !password) {
    return res.status(400).json({ error: 'Dados insuficientes para o envio do e-mail.' });
  }

  try {
    // Envio do e-mail utilizando o SDK oficial do Resend
    const { data, error } = await resend.emails.send({
      from: 'ALS Transportes <no-reply@resend.dev>', // No futuro, troque por no-reply@seudominio.com.br
      to: [to],
      subject: 'ALS Transportes - Credenciais de Acesso ao Portal',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Bem-vindo ao Portal ALS</h2>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Sua conta de colaborador foi criada com sucesso. Utilize os dados abaixo para o seu primeiro acesso:</p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 25px 0;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Usuário</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #1e40af;">${username}</p>
            
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Senha Temporária</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #059669;">${password}</p>
          </div>
          
          <p style="font-size: 13px; color: #ef4444; font-weight: bold;">IMPORTANTE:</p>
          <p style="font-size: 12px; color: #64748b; line-height: 1.6;">
            Ao realizar o primeiro login, o sistema solicitará obrigatoriamente que você crie uma nova senha pessoal e segura.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            Este é um e-mail automático enviado pelo servidor ALS Transportes. Por favor, não responda.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Erro retornado pelo Resend:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (error: any) {
    console.error("Falha crítica no envio via Resend:", error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar e-mail.' });
  }
}

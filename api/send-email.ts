
// Este arquivo deve ser colocado na pasta /api do seu projeto Vercel
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, name, username, password } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'ALS Transportes <no-reply@resend.dev>', // Ou seu domínio verificado
      to: [to],
      subject: 'Portal ALS - Suas Credenciais de Acesso',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #f8fafc;">
          <h2 style="color: #2563eb;">Bem-vindo ao Portal Operacional ALS</h2>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Seu cadastro foi concluído com sucesso. Abaixo estão suas credenciais para o primeiro acesso:</p>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0;"><strong>Usuário:</strong> ${username}</p>
            <p style="margin: 5px 0 0 0;"><strong>Senha:</strong> ${password}</p>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
            Este é um e-mail automático. Por favor, não responda.
            Ao logar pela primeira vez, o sistema solicitará a troca obrigatória de senha.
          </p>
        </div>
      `,
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json(error);
  }
}

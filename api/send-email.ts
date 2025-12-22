
export default async function handler(req: any, res: any) {
  return res.status(410).json({ error: 'Funcionalidade desativada nesta versão do sistema.' });
}

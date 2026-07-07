
import { Customer, Port } from '../types';
import { db } from './storage';

const genId = (prefix: string) =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`);

export interface CnpjData {
  name?: string;
  legalName?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  cnpj: string;
}

/** Consulta os dados de um CNPJ na Receita (mesma fonte do cadastro rápido). */
export async function lookupCnpj(cnpjRaw: string): Promise<CnpjData | null> {
  const cnpj = (cnpjRaw || '').replace(/\D/g, '');
  if (cnpj.length !== 14) return null;
  try {
    const res = await fetch(`https://minhareceita.org/${cnpj}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      cnpj,
      name: (data.nome_fantasia || data.razao_social || '').toUpperCase() || undefined,
      legalName: (data.razao_social || '').toUpperCase() || undefined,
      address: `${data.logradouro || ''}${data.numero ? ', ' + data.numero : ''}`.trim().toUpperCase() || undefined,
      neighborhood: (data.bairro || '').toUpperCase() || undefined,
      city: (data.municipio || '').toUpperCase() || undefined,
      state: (data.uf || '').toUpperCase() || undefined,
      zipCode: (data.cep || '').replace(/\D/g, '') || undefined,
    };
  } catch {
    return null;
  }
}

interface FallbackInfo {
  nome?: string;
  cnpj?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  bairro?: string;
  cep?: string;
}

/**
 * Garante um cliente cadastrado para o CNPJ informado. Se não existir na lista,
 * busca os dados na Receita (ou usa o fallback da OS) e cadastra automaticamente.
 * Retorna o cliente (existente ou recém-criado) ou null se não houver CNPJ.
 */
export async function ensureCustomerByCnpj(
  existing: Customer[],
  cnpjRaw: string | undefined,
  fallback?: FallbackInfo
): Promise<{ customer: Customer; created: boolean } | null> {
  const cnpj = (cnpjRaw || '').replace(/\D/g, '');
  if (cnpj.length < 8) return null;

  const found = existing.find(c => {
    const cc = (c.cnpj || '').replace(/\D/g, '');
    return cc === cnpj || (cc.length >= 8 && cc.slice(0, 8) === cnpj.slice(0, 8));
  });
  if (found) return { customer: found, created: false };

  const receita = cnpj.length === 14 ? await lookupCnpj(cnpj) : null;
  const customer: Customer = {
    id: genId('cust'),
    name: receita?.name || fallback?.nome || 'CLIENTE IMPORTADO',
    legalName: receita?.legalName || fallback?.nome,
    cnpj,
    address: receita?.address || fallback?.endereco,
    neighborhood: receita?.neighborhood || fallback?.bairro,
    city: receita?.city || fallback?.municipio,
    state: receita?.state || fallback?.uf,
    zipCode: receita?.zipCode || fallback?.cep,
    registrationDate: new Date().toISOString(),
  } as Customer;

  const ok = await db.saveCustomer(customer);
  if (!ok) return null;
  return { customer, created: true };
}

/**
 * Garante um porto/terminal cadastrado. Sem CNPJ na OS, casa por nome; se não
 * existir e houver CNPJ, cadastra a partir dele. Retorna o porto ou null.
 */
export async function ensurePortByCnpj(
  existing: Port[],
  cnpjRaw: string | undefined,
  fallbackName?: string
): Promise<{ port: Port; created: boolean } | null> {
  const cnpj = (cnpjRaw || '').replace(/\D/g, '');
  if (cnpj.length >= 8) {
    const found = existing.find(p => {
      const cc = (p.cnpj || '').replace(/\D/g, '');
      return cc === cnpj || (cc.length >= 8 && cc.slice(0, 8) === cnpj.slice(0, 8));
    });
    if (found) return { port: found, created: false };
  }
  if (cnpj.length !== 14) return null;

  const receita = await lookupCnpj(cnpj);
  const port: Port = {
    id: genId('prt'),
    name: receita?.name || fallbackName || 'TERMINAL IMPORTADO',
    legalName: receita?.legalName || fallbackName,
    cnpj,
    address: receita?.address,
    neighborhood: receita?.neighborhood,
    city: receita?.city,
    state: receita?.state,
    zipCode: receita?.zipCode,
    registrationDate: new Date().toISOString(),
  } as Port;

  const ok = await db.savePort(port);
  if (!ok) return null;
  return { port, created: true };
}

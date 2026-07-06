
import React from 'react';
import { CteDocParty } from '../../../types';

export const fmtMoney = (v?: number): string =>
  v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtQty = (v: number): string =>
  v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export const fmtCnpjCpf = (v?: string): string => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v;
};

export const fmtCep = (v?: string): string => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : v;
};

export const PartyCard: React.FC<{ party: CteDocParty; ctes?: string[]; compact?: boolean }> = ({ party, ctes = [], compact }) => (
  <div className={`p-3 border rounded-2xl space-y-0.5 ${compact ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
    <div className="flex items-start justify-between gap-2">
      <p className={`text-[10px] font-black uppercase ${compact ? 'text-white' : 'text-slate-800'}`}>{party.nome || '—'}</p>
      {ctes.length > 0 && (
        <span className="text-[7px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black shrink-0 uppercase">
          CT-E {ctes.join(', ')}
        </span>
      )}
    </div>
    {party.cnpjCpf && (
      <p className={`text-[9px] ${compact ? 'text-slate-300' : 'text-slate-600'}`}>
        <span className="font-bold">CNPJ/CPF:</span> {fmtCnpjCpf(party.cnpjCpf)}
        {party.ie ? <span className="ml-2"><span className="font-bold">IE:</span> {party.ie}</span> : null}
      </p>
    )}
    {party.endereco && <p className={`text-[9px] ${compact ? 'text-slate-300' : 'text-slate-600'}`}>{party.endereco}</p>}
    {(party.municipio || party.uf || party.cep) && (
      <p className={`text-[9px] ${compact ? 'text-slate-300' : 'text-slate-600'}`}>
        {[party.municipio, party.uf].filter(Boolean).join(' - ')}
        {party.cep ? ` — CEP: ${fmtCep(party.cep)}` : ''}
      </p>
    )}
    {party.fone && <p className={`text-[9px] ${compact ? 'text-slate-300' : 'text-slate-600'}`}><span className="font-bold">Fone:</span> {party.fone}</p>}
  </div>
);

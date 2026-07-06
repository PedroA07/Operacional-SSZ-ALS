
import React, { useState } from 'react';
import { CteDocParty } from '../../../types';

export const fmtMoney = (v?: number): string =>
  v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtQty = (v: number): string =>
  v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

// Valores prontos para colar em outros sistemas (decimal com vírgula, sem milhar)
export const copyMoney = (v?: number): string =>
  v === undefined ? '' : v.toFixed(2).replace('.', ',');

export const copyQty = (v: number): string => String(v).replace('.', ',');

export const CopyButton: React.FC<{ value?: string; title?: string; light?: boolean }> = ({ value, title, light }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback para contextos sem clipboard API (HTTP)
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copiado!' : (title || 'Copiar')}
      className={`p-1 rounded-lg transition-colors shrink-0 ${
        copied
          ? 'text-emerald-500'
          : light
            ? 'text-slate-400 hover:text-white hover:bg-white/10'
            : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      {copied ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      )}
    </button>
  );
};

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
      <div className="flex items-center gap-1 min-w-0">
        <p className={`text-[10px] font-black uppercase ${compact ? 'text-white' : 'text-slate-800'}`}>{party.nome || '—'}</p>
        <CopyButton value={party.nome} title="Copiar nome" light={compact} />
      </div>
      {ctes.length > 0 && (
        <span className="text-[7px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black shrink-0 uppercase">
          CT-E {ctes.join(', ')}
        </span>
      )}
    </div>
    {party.cnpjCpf && (
      <p className={`text-[9px] flex items-center gap-1 ${compact ? 'text-slate-300' : 'text-slate-600'}`}>
        <span><span className="font-bold">CNPJ/CPF:</span> {fmtCnpjCpf(party.cnpjCpf)}</span>
        <CopyButton value={fmtCnpjCpf(party.cnpjCpf)} title="Copiar CNPJ/CPF" light={compact} />
        {party.ie ? <span className="ml-1"><span className="font-bold">IE:</span> {party.ie}</span> : null}
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

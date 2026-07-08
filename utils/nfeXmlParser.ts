
import { CteDocParty, NfeDocSummary } from '../types';

// Parser de XML de NF-e (modelo 55) para os anexos de Emissões:
// extrai valor da nota, pesos, volumes, partes e container das obs.

const text = (parent: Element | Document | null, tag: string): string => {
  if (!parent) return '';
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
};

const first = (parent: Element | Document | null, tag: string): Element | null => {
  if (!parent) return null;
  return parent.getElementsByTagName(tag)[0] || null;
};

const num = (v: string): number | undefined => {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};

const parseParty = (el: Element | null): CteDocParty | undefined => {
  if (!el) return undefined;
  const ender = Array.from(el.children).find(c => c.localName.startsWith('ender')) || null;
  return {
    nome: text(el, 'xNome'),
    cnpjCpf: text(el, 'CNPJ') || text(el, 'CPF'),
    ie: text(el, 'IE'),
    endereco: [text(ender, 'xLgr'), text(ender, 'nro'), text(ender, 'xCpl'), text(ender, 'xBairro')]
      .filter(Boolean).join(', '),
    municipio: text(ender, 'xMun'),
    uf: text(ender, 'UF'),
    cep: text(ender, 'CEP'),
    pais: text(ender, 'xPais'),
    fone: text(ender, 'fone'),
  };
};

/** Faz o parse de um XML de NF-e (nfeProc ou NFe). Retorna null se não for NF-e. */
export function parseNfeXml(xmlText: string): NfeDocSummary | null {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return null;
    const infNFe = first(doc, 'infNFe');
    if (!infNFe) return null;

    const ide = first(infNFe, 'ide');
    const chave = (infNFe.getAttribute('Id') || '').replace(/^NFe/i, '');

    // Pesos e volumes: soma de todos os <vol> do transporte
    const transp = first(infNFe, 'transp');
    let pesoBruto = 0, pesoLiquido = 0, qVolumes = 0;
    if (transp) {
      for (const vol of Array.from(transp.getElementsByTagName('vol'))) {
        pesoBruto += num(text(vol, 'pesoB')) || 0;
        pesoLiquido += num(text(vol, 'pesoL')) || 0;
        qVolumes += num(text(vol, 'qVol')) || 0;
      }
    }

    // Container nas informações complementares: "CONTAINER....: MRKU0171244"
    const infCpl = text(first(infNFe, 'infAdic'), 'infCpl');
    const contMatch = infCpl.match(/CONTAINER[.\s:]*([A-Z]{4}\s?\d{7})/i)
      || infCpl.match(/\b([A-Z]{4}\d{7})\b/);
    const container = contMatch ? contMatch[1].replace(/\s/g, '').toUpperCase() : undefined;

    return {
      numero: text(ide, 'nNF') || undefined,
      serie: text(ide, 'serie') || undefined,
      chave: chave || undefined,
      dataEmissao: text(ide, 'dhEmi') || undefined,
      valorNf: num(text(first(infNFe, 'ICMSTot'), 'vNF')),
      pesoBruto: pesoBruto > 0 ? pesoBruto : undefined,
      pesoLiquido: pesoLiquido > 0 ? pesoLiquido : undefined,
      qVolumes: qVolumes > 0 ? qVolumes : undefined,
      container,
      emitente: parseParty(first(infNFe, 'emit')),
      destinatario: parseParty(first(infNFe, 'dest')),
    };
  } catch (e) {
    console.error('[nfeXmlParser] Erro ao fazer parse do XML:', e);
    return null;
  }
}

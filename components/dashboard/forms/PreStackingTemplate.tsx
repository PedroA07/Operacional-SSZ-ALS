
import React, { useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { maskCNPJ, maskCEP } from '../../../utils/masks';

interface PreStackingTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const PreStackingTemplate: React.FC<PreStackingTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario 
}) => {
  const borderStyle = "1px solid #1e293b";

  useEffect(() => {
    const generate = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el && value) {
        try {
          JsBarcode(`#${id}`, value, { 
            format: "CODE128", 
            width: 2, 
            height: 25, 
            displayValue: false, 
            margin: 0, 
            background: "transparent" 
          });
        } catch (e) { }
      }
    };
    if (formData.container) generate('ps-barcode-container', formData.container);
    if (formData.tara) generate('ps-barcode-tara', formData.tara);
    if (formData.seal) generate('ps-barcode-lacre', formData.seal);
  }, [formData]);

  return (
    <div 
      id="pre-stacking-doc" 
      style={{ 
        width: '794px', 
        height: '1123px', 
        padding: '40px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* CABEÇALHO PREMIUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid #1e40af', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ width: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '48px', fontWeight: 900, fontStyle: 'italic', color: '#1e40af', lineHeight: '1' }}>ALS</span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#94a3b8', letterSpacing: '4px', marginLeft: '10px' }}>TRANSPORTES</span>
          </div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '5px' }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>
        <div style={{ textAlign: 'right', width: '300px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#000000' }}>MINUTA PRE-STACKING</div>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginTop: '4px' }}>
            EMISSÃO: <span style={{ fontSize: '18px', color: '#000000' }}>{formData.displayDate || '--/--/----'}</span>
          </div>
        </div>
      </div>

      {/* BLOCO CLIENTE (REMETENTE) */}
      <div style={{ border: borderStyle, padding: '12px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>CLIENTE (CONTRATANTE)</div>
        <div style={{ display: 'flex', gap: '20px' }}>
           <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7px', fontWeight: 900, color: '#64748b' }}>RAZÃO SOCIAL</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRemetente?.legalName || '---'}</div>
           </div>
           <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7px', fontWeight: 900, color: '#64748b' }}>NOME FANTASIA</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af' }}>{selectedRemetente?.name || '---'}</div>
           </div>
        </div>
      </div>

      {/* BLOCO EQUIPAMENTO COM CÓDIGO DE BARRAS */}
      <div style={{ display: 'flex', border: borderStyle, marginBottom: '10px', height: '100px', overflow: 'hidden' }}>
        <div style={{ width: '300px', padding: '10px', borderRight: borderStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>CONTAINER</div>
          <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: '1.1' }}>{formData.container || '---'}</div>
          <div style={{ marginTop: 'auto', height: '28px', display: 'flex', alignItems: 'center' }}>
            <svg id="ps-barcode-container" style={{ width: '250px', height: '20px' }}></svg>
          </div>
        </div>
        <div style={{ width: '130px', padding: '10px', borderRight: borderStyle, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textAlign: 'left' }}>TARA</div>
          <div style={{ fontSize: '14px', fontWeight: 900 }}>{formData.tara || '---'}</div>
          <div style={{ marginTop: 'auto', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg id="ps-barcode-tara" style={{ width: '100px', height: '20px' }}></svg>
          </div>
        </div>
        <div style={{ width: '130px', padding: '10px', borderRight: borderStyle, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textAlign: 'left' }}>LACRE</div>
          <div style={{ fontSize: '14px', fontWeight: 900 }}>{formData.seal || '---'}</div>
          <div style={{ marginTop: 'auto', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg id="ps-barcode-lacre" style={{ width: '100px', height: '20px' }}></svg>
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>TIPO</div>
          <div style={{ fontSize: '18px', fontWeight: 900 }}>{formData.tipo || '---'}</div>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', marginTop: 'auto' }}>PADRÃO: CHEIO</div>
        </div>
      </div>

      {/* BLOCO OPERACIONAL GRID (ALTERADO: NAVIO E BOOKING LADO A LADO) */}
      <div style={{ display: 'flex', border: borderStyle, marginBottom: '10px' }}>
        <div style={{ flex: 1, padding: '8px', borderRight: borderStyle, backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>NAVIO / EMBARCAÇÃO</div>
          <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</div>
        </div>
        <div style={{ flex: 1, padding: '8px', borderRight: borderStyle }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>BOOKING</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af' }}>{formData.booking || '---'}</div>
        </div>
        <div style={{ flex: 1, padding: '8px', borderRight: borderStyle }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>AUTORIZAÇÃO DE COLETA</div>
          <div style={{ fontSize: '14px', fontWeight: 900 }}>{formData.autColeta || '---'}</div>
        </div>
        <div style={{ flex: 1, padding: '8px' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>NOTA FISCAL</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af' }}>{formData.nf || '---'}</div>
        </div>
      </div>

      {/* BLOCO MOTORISTA DETALHADO */}
      <div style={{ border: borderStyle, padding: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ flex: '2', paddingRight: '15px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA</div>
            <div style={{ fontSize: '14px', fontWeight: 900 }}>{selectedDriver?.name || '---'}</div>
          </div>
          <div style={{ flex: '1' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CPF</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</div>
          </div>
          <div style={{ flex: '1' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>Nº ORDEM SERVIÇO (OS)</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#1e40af' }}>{formData.os || '---'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '330px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>{selectedDriver?.plateHorse || '---'}</div>
          </div>
          <div style={{ width: '330px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>{selectedDriver?.plateTrailer || '---'}</div>
          </div>
        </div>
      </div>

      {/* BLOCO LOCAIS (CARREGAMENTO E ENTREGA) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1, border: borderStyle, padding: '10px' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', marginBottom: '5px' }}>LOCAL DE CARREGAMENTO</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRemetente?.name || '---'}</div>
          <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>{selectedRemetente?.city || '---'} - {selectedRemetente?.state || '--'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
             <span style={{ fontSize: '8px', fontWeight: 'bold' }}>CNPJ: {selectedRemetente?.cnpj || '---'}</span>
             <span style={{ fontSize: '8px', fontWeight: 'bold' }}>CEP: {selectedRemetente?.zipCode ? maskCEP(selectedRemetente.zipCode) : '---'}</span>
          </div>
        </div>
        <div style={{ flex: 1, border: borderStyle, padding: '10px', backgroundColor: '#eff6ff' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#1e40af', borderBottom: '1px solid #bfdbfe', marginBottom: '5px' }}>LOCAL DE ENTREGA (PRE-STACKING)</div>
          <div style={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }}>{selectedDestinatario?.legalName || '---'}</div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#3b82f6', marginTop: '1px' }}>FANTASIA: {selectedDestinatario?.name || '---'}</div>
          <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>{selectedDestinatario?.city || '---'} - {selectedDestinatario?.state || '--'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
             <span style={{ fontSize: '8px', fontWeight: 'bold' }}>CNPJ: {selectedDestinatario?.cnpj ? maskCNPJ(selectedDestinatario.cnpj) : '---'}</span>
             <span style={{ fontSize: '8px', fontWeight: 'bold' }}>CEP: {selectedDestinatario?.zipCode ? maskCEP(selectedDestinatario.zipCode) : '---'}</span>
          </div>
        </div>
      </div>

      {/* CONTROLE DE PORTARIA (ALTERADO: MAIOR ESPAÇAMENTO PARA CARIMBO) */}
      <div style={{ border: borderStyle, padding: '20px', flex: '1', display: 'flex', gap: '40px' }}>
        <div style={{ flex: '1', borderRight: '1px solid #f1f5f9', paddingRight: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', marginBottom: '15px', letterSpacing: '2px' }}>CONTROLE ENTRADA</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '15px' }}>DATA: __________________ HORA: _________</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '20px' }}>ASSINATURA: ___________________________</div>
          <div style={{ width: '100%', height: '185px', border: '2px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: 'auto', backgroundColor: '#fdfdfd' }}>
            <span style={{ width: '100%', fontSize: '11px', fontWeight: 900, color: '#cbd5e1', fontStyle: 'italic', textTransform: 'uppercase' }}>ESPAÇO PARA CARIMBO DE ENTRADA</span>
          </div>
        </div>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', marginBottom: '15px', letterSpacing: '2px' }}>CONTROLE SAÍDA</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '15px' }}>DATA: __________________ HORA: _________</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '20px' }}>ASSINATURA: ___________________________</div>
          <div style={{ width: '100%', height: '185px', border: '2px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: 'auto', backgroundColor: '#fdfdfd' }}>
            <span style={{ width: '100%', fontSize: '11px', fontWeight: 900, color: '#cbd5e1', fontStyle: 'italic', textTransform: 'uppercase' }}>ESPAÇO PARA CARIMBO DE SAÍDA</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '8px', color: '#94a3b8', fontWeight: 'bold' }}>
        ESTA MINUTA COMPROVA A ENTREGA DO EQUIPAMENTO CHEIO NO TERMINAL INDICADO.
      </div>
    </div>
  );
};

export default PreStackingTemplate;

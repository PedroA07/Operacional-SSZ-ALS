import React from 'react';

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
  const themeColor = "#059669"; // Emerald / Verde Forte

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
      {/* CABEÇALHO RÍGIDO ALS PREMIUM EMERALD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `4px solid ${themeColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ width: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '48px', fontWeight: 900, fontStyle: 'italic', color: themeColor, lineHeight: '1' }}>ALS</span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#94a3b8', letterSpacing: '4px', marginLeft: '10px' }}>TRANSPORTES</span>
          </div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '5px' }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>
        <div style={{ textAlign: 'right', width: '300px' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px' }}>MINUTA DE PRÉ-STACKING</div>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginTop: '4px' }}>
            EMISSÃO: <span style={{ fontSize: '18px', color: '#000000' }}>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* LOCAL DE ENTREGA - DESTAQUE EMERALD */}
      <div style={{ border: `2px solid ${themeColor}`, padding: '15px', backgroundColor: '#ecfdf5', marginBottom: '20px', borderRadius: '4px' }}>
        <p style={{ fontSize: '9px', fontWeight: 900, color: themeColor, marginBottom: '5px', letterSpacing: '2px' }}>LOCAL DE ENTREGA (TERMINAL DE DESTINO)</p>
        <p style={{ fontSize: '20px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || formData.manualLocal || 'NÃO INFORMADO'}
        </p>
      </div>

      {/* GRID DE DADOS DA OPERAÇÃO */}
      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
         <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>ORDEM DE SERVIÇO (OS)</p>
            <p style={{ fontSize: '18px', fontWeight: 900, color: themeColor }}>{formData.os || '---'}</p>
         </div>
         <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>NOTA FISCAL</p>
            <p style={{ fontSize: '16px', fontWeight: 900 }}>{formData.nf || '---'}</p>
         </div>
      </div>

      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
         <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>CLIENTE / EXPORTADOR</p>
            <p style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.2' }}>
              {selectedRemetente?.legalName || selectedRemetente?.name || '---'}
            </p>
         </div>
         <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>BOOKING / NAVIO</p>
            <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>
              {formData.booking || '---'} {formData.ship ? `| ${formData.ship}` : ''}
            </p>
         </div>
      </div>

      {/* EQUIPAMENTO DESTAQUE EMERALD */}
      <div style={{ border: `1px solid ${themeColor}`, marginBottom: '20px', display: 'flex', backgroundColor: '#f0fdf4' }}>
         <div style={{ flex: 1, borderRight: `1px solid ${themeColor}`, padding: '15px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: themeColor, marginBottom: '4px' }}>UNIDADE (CONTAINER)</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: '#000000', fontFamily: 'monospace' }}>
              {formData.container || '---'}
            </p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '2px' }}>
              TIPO: {formData.tipo} - TARA: {formData.tara || '---'}
            </p>
         </div>
         <div style={{ flex: 1, padding: '15px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: themeColor, marginBottom: '4px' }}>LACRE OFICIAL</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: '#000000' }}>{formData.seal || '---'}</p>
         </div>
      </div>

      {/* BLOCO MOTORISTA AJUSTADO (PADRÃO ALS EMERALD) */}
      <div style={{ border: borderStyle, padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
          <div style={{ flex: '2' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA TRANSPORTADOR</p>
            <p style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedDriver?.name || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
            <p style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</p>
            <p style={{ fontSize: '14px', fontWeight: 900 }}>{selectedDriver?.plateHorse || '---'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
           <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</p>
              <p style={{ fontSize: '22px', fontWeight: 900, color: themeColor }}>{selectedDriver?.plateTrailer || '---'}</p>
           </div>
           <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CONTATO</p>
              <p style={{ fontSize: '13px', fontWeight: 900 }}>{selectedDriver?.phone || '---'}</p>
           </div>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div style={{ border: borderStyle, padding: '15px', minHeight: '80px', marginBottom: '20px' }}>
        <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>OBSERVAÇÕES OPERACIONAIS</p>
        <p style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1.4', textTransform: 'uppercase' }}>
          {formData.obs || 'O EQUIPAMENTO DEVERÁ SER ENTREGUE EM BOAS CONDIÇÕES DE LIMPEZA E ESTRUTURA.'}
        </p>
      </div>

      {/* ESPAÇO PARA CARIMBO E ASSINATURA */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, marginTop: '20px' }}>
         <div style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>Carimbo / Visto Terminal</span>
         </div>
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
            <p style={{ fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#64748b' }}>ASSINATURA DO MOTORISTA</p>
         </div>
      </div>

      {/* RODAPÉ INSTITUCIONAL EMERALD */}
      <div style={{ marginTop: '30px', borderTop: `1px solid ${themeColor}33`, paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 'bold' }}>
           AVENIDA ANA COSTA, 59 - SANTOS SP | CONTATO: 13 99628-0762
         </div>
         <div style={{ opacity: 0.3 }}>
           <span style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: themeColor }}>ALS</span>
         </div>
      </div>
    </div>
  );
};

export default PreStackingTemplate;
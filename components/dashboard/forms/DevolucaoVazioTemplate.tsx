import React from 'react';

interface DevolucaoVazioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const DevolucaoVazioTemplate: React.FC<DevolucaoVazioTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario 
}) => {
  const borderStyle = "1px solid #1e293b";
  const themeColor = "#d97706";

  const renderMinutaPart = (isBottom: boolean) => (
    <div style={{ 
      height: '540px', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '15px 40px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* CABEÇALHO COMPACTO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${themeColor}`, paddingBottom: '3px', marginBottom: '8px' }}>
        <div style={{ width: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', marginRight: '6px', overflow: 'hidden', borderRadius: '8px' }}>
              <img src="/logo.jfif" alt="ALS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', letterSpacing: '2px' }}>TRANSPORTES</span>
          </div>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b' }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>
        <div style={{ textAlign: 'right', width: '300px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px' }}>MINUTA DE DEVOLUÇÃO</div>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>
            EMISSÃO: <span style={{ fontSize: '12px', color: '#000000' }}>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* LOCAL DE DEVOLUÇÃO */}
      <div style={{ border: `1.5px solid ${themeColor}`, padding: '6px 10px', backgroundColor: '#fef3c7', marginBottom: '8px', borderRadius: '4px' }}>
        <p style={{ fontSize: '7px', fontWeight: 900, color: themeColor, marginBottom: '1px', letterSpacing: '1px' }}>LOCAL DE DEVOLUÇÃO (TERMINAL / DEPOT)</p>
        <p style={{ fontSize: '14px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', lineHeight: '1' }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || formData.manualLocal || 'NÃO INFORMADO'}
        </p>
      </div>

      {/* GRID DE DADOS - LINHA 1 (BL, ARMADOR, NAVIO) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '0', border: borderStyle, marginBottom: '4px' }}>
         <div style={{ borderRight: borderStyle, padding: '4px 8px' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>BL / BOOKING</p>
            <p style={{ fontSize: '11px', fontWeight: 900, color: themeColor }}>{formData.booking || '---'}</p>
         </div>
         <div style={{ borderRight: borderStyle, padding: '4px 8px' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>ARMADOR</p>
            <p style={{ fontSize: '11px', fontWeight: 900 }}>{formData.agencia || '---'}</p>
         </div>
         <div style={{ padding: '4px 8px' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>NAVIO</p>
            <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</p>
         </div>
      </div>

      {/* CLIENTE */}
      <div style={{ border: borderStyle, borderTop: 'none', padding: '4px 8px', marginBottom: '4px' }}>
        <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>CLIENTE / EXPORTADOR</p>
        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1' }}>
          {selectedRemetente?.legalName || selectedRemetente?.name || '---'}
        </p>
      </div>

      {/* EQUIPAMENTO E POD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: borderStyle, borderTop: 'none', marginBottom: '8px', backgroundColor: '#f8fafc' }}>
         <div style={{ borderRight: borderStyle, padding: '4px 8px' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>EQUIPAMENTO (UNIT)</p>
            <p style={{ fontSize: '12px', fontWeight: 900, color: themeColor }}>{formData.container || '---'}</p>
            <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b' }}>TIPO: {formData.tipo} - {formData.padrao}</p>
         </div>
         <div style={{ padding: '4px 8px' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '1px' }}>POD (PORTO DE DESCARGA)</p>
            <p style={{ fontSize: '12px', fontWeight: 900 }}>{formData.pod || '---'}</p>
         </div>
      </div>

      {/* MOTORISTA COMPACTO */}
      <div style={{ border: borderStyle, padding: '6px 10px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px', marginBottom: '3px' }}>
          <div style={{ flex: '2' }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA TRANSPORTADOR</p>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedDriver?.name || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
            <p style={{ fontSize: '9px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>CNH</p>
            <p style={{ fontSize: '9px', fontWeight: 'bold' }}>{selectedDriver?.cnh || '---'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</p>
            <p style={{ fontSize: '18px', fontWeight: 900, color: themeColor, lineHeight: '1' }}>{selectedDriver?.plateHorse || '---'}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</p>
            <p style={{ fontSize: '18px', fontWeight: 900, color: themeColor, lineHeight: '1' }}>{selectedDriver?.plateTrailer || '---'}</p>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontSize: '5px', fontWeight: 900, color: '#94a3b8' }}>CONTATO</p>
            <p style={{ fontSize: '10px', fontWeight: 900 }}>{selectedDriver?.phone || '---'}</p>
          </div>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div style={{ border: borderStyle, padding: '6px 10px', minHeight: '30px', marginBottom: '10px' }}>
        <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px', letterSpacing: '1px' }}>OBSERVAÇÕES OPERACIONAIS</p>
        <p style={{ fontSize: '8px', fontWeight: 'bold', lineHeight: '1.1', textTransform: 'uppercase' }}>
          {formData.obs || 'O TERMINAL DEVERÁ EMITIR O TICKET DE RECEBIMENTO APÓS A DESCARGA DA UNIDADE VAZIA.'}
        </p>
      </div>

      {/* CARIMBO E ASSINATURA - AMPLIADOS */}
      <div style={{ display: 'flex', gap: '15px', flex: 1, minHeight: '100px' }}>
         <div style={{ flex: 1.2, border: '1px dashed #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>Carimbo / Visto Depósito</span>
         </div>
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '15px' }}>
            <div style={{ borderBottom: '1.5px solid #000', marginBottom: '8px' }}></div>
            <p style={{ fontSize: '10px', fontWeight: 900, textAlign: 'center', color: '#64748b' }}>ASSINATURA DO MOTORISTA</p>
         </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '8px', borderTop: `1px solid ${themeColor}33`, paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '6px', color: '#94a3b8', fontWeight: 'bold' }}>
           AVENIDA ANA COSTA, 59 - SANTOS SP | CONTATO: 13 99628-0762
         </div>
         <div style={{ opacity: 0.3, width: '30px', height: '30px', overflow: 'hidden', borderRadius: '4px' }}>
           <img src="/logo.jfif" alt="ALS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
         </div>
      </div>
    </div>
  );

  return (
    <div 
      id="devolucao-vazio-doc" 
      style={{ 
        width: '794px', 
        height: '1123px', 
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {renderMinutaPart(false)}
      
      {/* LINHA TRACEJADA DE CORTE */}
      <div style={{ 
        width: '100%', 
        borderTop: '2px dashed #cbd5e1', 
        margin: '10px 0',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '0 10px',
          fontSize: '10px',
          color: '#94a3b8',
          fontWeight: 'bold'
        }}>
          CORTE AQUI
        </div>
      </div>

      {renderMinutaPart(true)}
    </div>
  );
};

export default DevolucaoVazioTemplate;

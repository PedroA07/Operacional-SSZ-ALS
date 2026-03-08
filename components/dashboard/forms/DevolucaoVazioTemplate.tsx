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
  const themeColor = "#d97706"; // Âmbar / Laranja Forte

  const renderDocumentCopy = () => (
    <div style={{ 
      height: '540px', 
      padding: '30px 40px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxSizing: 'border-box',
      backgroundColor: '#ffffff'
    }}>
      {/* CABEÇALHO RÍGIDO ALS PREMIUM AMBER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${themeColor}`, paddingBottom: '8px', marginBottom: '15px' }}>
        <div style={{ width: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, fontStyle: 'italic', color: themeColor, lineHeight: '1' }}>ALS</span>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', letterSpacing: '3px', marginLeft: '8px' }}>TRANSPORTES</span>
          </div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', marginTop: '3px' }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>
        <div style={{ textAlign: 'right', width: '250px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px' }}>MINUTA DE DEVOLUÇÃO</div>
          <div style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', marginTop: '2px' }}>
            EMISSÃO: <span style={{ fontSize: '14px', color: '#000000' }}>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* LOCAL DE DEVOLUÇÃO - DESTAQUE */}
      <div style={{ border: `1.5px solid ${themeColor}`, padding: '10px 15px', backgroundColor: '#fef3c7', marginBottom: '15px', borderRadius: '4px' }}>
        <p style={{ fontSize: '8px', fontWeight: 900, color: themeColor, marginBottom: '3px', letterSpacing: '1.5px' }}>LOCAL DE DEVOLUÇÃO (TERMINAL / DEPOT)</p>
        <p style={{ fontSize: '16px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || formData.manualLocal || 'NÃO INFORMADO'}
        </p>
        {selectedDestinatario && (
           <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '2px' }}>
             {selectedDestinatario.address} - {selectedDestinatario.city} / {selectedDestinatario.state}
           </p>
        )}
      </div>

      {/* GRID DE DADOS DA OPERAÇÃO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>BL / BOOKING</p>
          <p style={{ fontSize: '14px', fontWeight: 900, color: themeColor }}>{formData.booking || '---'}</p>
        </div>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>ARMADOR</p>
          <p style={{ fontSize: '14px', fontWeight: 900 }}>{formData.agencia || '---'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>CLIENTE / EXPORTADOR</p>
          <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.1' }}>
            {selectedRemetente?.legalName || selectedRemetente?.name || '---'}
          </p>
        </div>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>NAVIO</p>
          <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px', backgroundColor: '#f8fafc' }}>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>EQUIPAMENTO (UNIT)</p>
          <p style={{ fontSize: '16px', fontWeight: 900, color: themeColor }}>
            {formData.container || '---'}
          </p>
          <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '1px' }}>
            TIPO: {formData.tipo} - {formData.padrao}
          </p>
        </div>
        <div style={{ border: borderStyle, padding: '8px' }}>
          <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>POD (PORTO DE DESCARGA)</p>
          <p style={{ fontSize: '14px', fontWeight: 900 }}>{formData.pod || '---'}</p>
        </div>
      </div>

      {/* BLOCO MOTORISTA */}
      <div style={{ border: borderStyle, padding: '10px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '6px' }}>
          <div style={{ flex: '2' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA TRANSPORTADOR</p>
            <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedDriver?.name || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
            <p style={{ fontSize: '10px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>CNH</p>
            <p style={{ fontSize: '10px', fontWeight: 'bold' }}>{selectedDriver?.cnh || '---'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: themeColor, lineHeight: '1' }}>{selectedDriver?.plateHorse || '---'}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: themeColor, lineHeight: '1' }}>{selectedDriver?.plateTrailer || '---'}</p>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontSize: '6px', fontWeight: 900, color: '#94a3b8' }}>CONTATO</p>
            <p style={{ fontSize: '11px', fontWeight: 900 }}>{selectedDriver?.phone || '---'}</p>
          </div>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div style={{ border: borderStyle, padding: '10px', minHeight: '50px', marginBottom: '15px' }}>
        <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px', letterSpacing: '1px' }}>OBSERVAÇÕES OPERACIONAIS</p>
        <p style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: '1.3', textTransform: 'uppercase' }}>
          {formData.obs || 'O TERMINAL DEVERÁ EMITIR O TICKET DE RECEBIMENTO APÓS A DESCARGA DA UNIDADE VAZIA.'}
        </p>
      </div>

      {/* ESPAÇO PARA CARIMBO E ASSINATURA */}
      <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
         <div style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>Carimbo / Visto Depósito</span>
         </div>
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '5px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
            <p style={{ fontSize: '8px', fontWeight: 900, textAlign: 'center', color: '#64748b' }}>ASSINATURA DO MOTORISTA</p>
         </div>
      </div>

      {/* RODAPÉ INSTITUCIONAL */}
      <div style={{ marginTop: '15px', borderTop: `1px solid ${themeColor}33`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 'bold' }}>
           AVENIDA ANA COSTA, 59 - SANTOS SP | CONTATO: 13 99628-0762
         </div>
         <div style={{ opacity: 0.3 }}>
           <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: themeColor }}>ALS</span>
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
        position: 'relative'
      }}
    >
      {/* VIA 1 */}
      {renderDocumentCopy()}

      {/* LINHA TRACEJADA DE CORTE */}
      <div style={{ 
        width: '100%', 
        borderTop: '2px dashed #94a3b8', 
        position: 'relative',
        margin: '10px 0'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '-10px', 
          right: '20px', 
          fontSize: '9px', 
          color: '#94a3b8', 
          fontWeight: 'bold',
          backgroundColor: '#ffffff',
          padding: '0 10px'
        }}>
          TESOURA / CORTE
        </div>
      </div>

      {/* VIA 2 */}
      {renderDocumentCopy()}
    </div>
  );
};

export default DevolucaoVazioTemplate;

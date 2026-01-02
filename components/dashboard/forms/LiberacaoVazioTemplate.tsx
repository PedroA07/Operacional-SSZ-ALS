
import React from 'react';

interface LiberacaoVazioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
  manualPortName?: string;
}

const LiberacaoVazioTemplate: React.FC<LiberacaoVazioTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario,
  manualPortName
}) => {
  const borderStyle = "1px solid #334155";
  const themeColor = "#334155"; // Slate-700 padrão do botão

  return (
    <div 
      id="liberacao-vazio-doc" 
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
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '42px', fontWeight: 900, fontStyle: 'italic', color: themeColor, lineHeight: '1' }}>ALS</span>
          <span style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '3px', marginLeft: '8px' }}>TRANSPORTES</span>
        </div>
      </div>

      <div style={{ border: `2px solid ${themeColor}`, padding: '15px', textAlign: 'center', marginBottom: '20px', backgroundColor: '#f8fafc' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 900, textDecoration: 'underline', letterSpacing: '1px', color: themeColor }}>MINUTA DE LIBERAÇÃO DE CNTR VAZIO</h1>
      </div>

      {/* DEPÓSITO / TERMINAL */}
      <div style={{ border: borderStyle, padding: '15px', textAlign: 'center', marginBottom: '25px', backgroundColor: '#f1f5f9' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, textDecoration: 'underline', color: themeColor }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || manualPortName || 'INFORMAR TERMINAL'} {selectedDestinatario?.city ? `- ${selectedDestinatario.city}` : ''}
        </h2>
      </div>

      {/* TABELA PRINCIPAL DE DADOS */}
      <div style={{ border: borderStyle, marginBottom: '20px' }}>
        {[
          { label: 'BOOKING:', value: formData.booking },
          { label: 'CLIENTE:', value: selectedRemetente?.legalName || selectedRemetente?.name },
          { label: 'NAVIO:', value: formData.ship },
          { label: 'ARMADOR:', value: formData.agencia },
          { label: 'POD:', value: formData.pod || '---' },
          { label: 'EQUIPAMENTO:', value: `${formData.qtd || '01'}X${formData.tipo} - ${formData.padrao}` },
          { label: 'OBS:', value: formData.obs || 'VISTORIA SERÁ FEITO PELO MOTORISTA' },
          { label: 'MOTORISTA:', value: selectedDriver?.name, isHighlight: true }
        ].map((row, idx) => (
          <div key={idx} style={{ display: 'flex', borderBottom: idx === 7 ? 'none' : borderStyle }}>
            <div style={{ 
              width: '180px', 
              padding: '10px 15px', 
              backgroundColor: row.isHighlight ? '#f1f5f9' : '#f8fafc', 
              borderRight: borderStyle,
              fontSize: '11px',
              fontWeight: 900,
              color: themeColor
            }}>
              {row.label}
            </div>
            <div style={{ 
              flex: 1, 
              padding: '10px 15px', 
              fontSize: '12px', 
              fontWeight: 900,
              textTransform: 'uppercase'
            }}>
              {row.value || '---'}
            </div>
          </div>
        ))}
      </div>

      {/* DADOS DO MOTORISTA (LINHA ÚNICA) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ flex: 1, display: 'flex', border: borderStyle, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '60px', padding: '10px', backgroundColor: '#f8fafc', borderRight: borderStyle, fontSize: '10px', fontWeight: 900, textAlign: 'center', color: themeColor }}>CPF:</div>
          <div style={{ flex: 1, padding: '10px', fontSize: '11px', fontWeight: 900 }}>{selectedDriver?.cpf || '---'}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', border: borderStyle, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '60px', padding: '10px', backgroundColor: '#f8fafc', borderRight: borderStyle, fontSize: '10px', fontWeight: 900, textAlign: 'center', color: themeColor }}>RG:</div>
          <div style={{ flex: 1, padding: '10px', fontSize: '11px', fontWeight: 900 }}>{selectedDriver?.rg || '---'}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', border: borderStyle, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '60px', padding: '10px', backgroundColor: '#f8fafc', borderRight: borderStyle, fontSize: '10px', fontWeight: 900, textAlign: 'center', color: themeColor }}>CNH:</div>
          <div style={{ flex: 1, padding: '10px', fontSize: '11px', fontWeight: 900 }}>{selectedDriver?.cnh || '---'}</div>
        </div>
      </div>

      {/* DADOS DO VEÍCULO */}
      <div style={{ display: 'flex', gap: '200px', marginBottom: '40px', justifyContent: 'center' }}>
        <div style={{ width: '220px', display: 'flex', border: borderStyle, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '80px', padding: '10px', backgroundColor: '#f8fafc', borderRight: borderStyle, fontSize: '10px', fontWeight: 900, textAlign: 'center', color: themeColor }}>CAVALO:</div>
          <div style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 900, textAlign: 'center', color: themeColor }}>{selectedDriver?.plateHorse || '---'}</div>
        </div>
        <div style={{ width: '220px', display: 'flex', border: borderStyle, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '80px', padding: '10px', backgroundColor: '#f8fafc', borderRight: borderStyle, fontSize: '10px', fontWeight: 900, textAlign: 'center', color: themeColor }}>CARRETA:</div>
          <div style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 900, textAlign: 'center' }}>{selectedDriver?.plateTrailer || '---'}</div>
        </div>
      </div>

      {/* FOOTER - AUTORIZAÇÃO */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '9px', lineHeight: '1.6' }}>
          <p style={{ fontStyle: 'italic', fontWeight: 'bold' }}>Autorizado por:</p>
          <p style={{ fontWeight: 900, fontSize: '10px' }}>TRANSPORTADORA: <span style={{ fontWeight: 500 }}>LUARA MEL VIEIRA TRANSPORTES LTDA</span></p>
          <p style={{ fontWeight: 900 }}>CNPJ: <span style={{ fontWeight: 500 }}>13.841.647/0004-30</span></p>
          <p style={{ fontWeight: 900 }}>ENDEREÇO: <span style={{ fontWeight: 500 }}>AVENIDA ANA COSTA, 59 - SANTOS SP</span></p>
          <p style={{ fontWeight: 900 }}>TELEFONE: <span style={{ fontWeight: 500 }}>13 99628-0762</span></p>
        </div>
        <div style={{ opacity: 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '48px', fontWeight: 900, fontStyle: 'italic', color: themeColor, lineHeight: '1' }}>ALS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiberacaoVazioTemplate;


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
  const borderStyle = "1px solid #000000";
  const bgHeader = "#f1f5f9";

  return (
    <div 
      id="devolucao-vazio-doc" 
      style={{ 
        width: '794px', 
        height: '1123px', 
        padding: '50px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* TÍTULO EM DESTAQUE (ESTILO REFERÊNCIA) */}
      <div style={{ border: '2px solid #000', padding: '20px', textAlign: 'center', backgroundColor: '#dbeafe', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, textDecoration: 'underline', margin: 0, color: '#000' }}>
          MINUTA DE DEVOLUÇÃO DE CONTAINER VAZIO
        </h1>
      </div>

      {/* LOCAL DE DEVOLUÇÃO - DESTAQUE */}
      <div style={{ border: borderStyle, padding: '15px', backgroundColor: '#f0fdf4', marginBottom: '25px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '5px', letterSpacing: '1px' }}>LOCAL DA DEVOLUÇÃO (DEPOT / PRE-STACKING)</p>
        <p style={{ fontSize: '22px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', margin: 0 }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || formData.manualLocal || 'NÃO INFORMADO'}
        </p>
      </div>

      {/* TABELA DE DADOS DA CARGA (ESTILO GRID) */}
      <div style={{ border: borderStyle, borderBottom: 'none' }}>
        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>CONTAINER:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 900 }}>{formData.container || '---'} {formData.tipo ? `- ${formData.tipo}` : ''}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>CLIENTE:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedRemetente?.name || '---'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>NAVIO:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>ARMADOR:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 900 }}>{formData.agencia || '---'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>POD:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 900 }}>{formData.pod || '---'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>BL / BOOKING:</span>
          </div>
          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e40af' }}>{formData.booking || '---'}</span>
          </div>
        </div>
      </div>

      <div style={{ height: '40px' }}></div>

      {/* BLOCO MOTORISTA (REFERÊNCIA) */}
      <div style={{ border: borderStyle, borderBottom: 'none' }}>
        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle }}>
            <span style={{ fontSize: '10px', fontWeight: 900 }}>MOTORISTA:</span>
          </div>
          <div style={{ flex: 1, padding: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedDriver?.name || '---'}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ flex: 1, display: 'flex', borderRight: borderStyle }}>
             <div style={{ width: '100px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, textAlign: 'right' }}>
               <span style={{ fontSize: '9px', fontWeight: 900 }}>CPF:</span>
             </div>
             <div style={{ flex: 1, padding: '10px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', borderRight: borderStyle }}>
             <div style={{ width: '100px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, textAlign: 'right' }}>
               <span style={{ fontSize: '9px', fontWeight: 900 }}>RG:</span>
             </div>
             <div style={{ flex: 1, padding: '10px', fontWeight: 'bold' }}>{selectedDriver?.rg || '---'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
             <div style={{ width: '100px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle, textAlign: 'right' }}>
               <span style={{ fontSize: '9px', fontWeight: 900 }}>CNH:</span>
             </div>
             <div style={{ flex: 1, padding: '10px', fontWeight: 'bold' }}>{selectedDriver?.cnh || '---'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: borderStyle }}>
          <div style={{ flex: 1, display: 'flex', borderRight: borderStyle }}>
             <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle }}>
               <span style={{ fontSize: '10px', fontWeight: 900 }}>CAVALO:</span>
             </div>
             <div style={{ flex: 1, padding: '10px', fontSize: '18px', fontWeight: 900, color: '#1e40af' }}>{selectedDriver?.plateHorse || '---'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
             <div style={{ width: '180px', padding: '10px', backgroundColor: bgHeader, borderRight: borderStyle }}>
               <span style={{ fontSize: '10px', fontWeight: 900 }}>CARRETA:</span>
             </div>
             <div style={{ flex: 1, padding: '10px', fontSize: '18px', fontWeight: 900 }}>{selectedDriver?.plateTrailer || '---'}</div>
          </div>
        </div>
      </div>

      {/* AUTORIZAÇÃO E LOGO */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '9px', lineHeight: '1.6' }}>
          <p style={{ fontWeight: 900, fontStyle: 'italic', marginBottom: '5px' }}>Autorizado por:</p>
          <p style={{ fontWeight: 900, textTransform: 'uppercase' }}>TRANSPORTADORA: LUARA MEL VIEIRA TRANSPORTES LTDA</p>
          <p style={{ fontWeight: 700 }}>CNPJ: 13.841.647/0004-30</p>
          <p style={{ fontWeight: 700 }}>ENDEREÇO: AVENIDA ANA COSTA, 59 - SANTOS SP</p>
          <p style={{ fontWeight: 700 }}>TELEFONE: 13 99628-0762</p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
             <span style={{ fontSize: '42px', fontWeight: 900, fontStyle: 'italic', color: '#1e40af', lineHeight: '1' }}>ALS</span>
           </div>
           <div style={{ height: '3px', width: '80px', backgroundColor: '#84cc16', marginLeft: 'auto', marginTop: '5px' }}></div>
        </div>
      </div>
    </div>
  );
};

export default DevolucaoVazioTemplate;

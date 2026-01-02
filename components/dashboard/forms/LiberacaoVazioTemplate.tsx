
import React from 'react';

interface LiberacaoVazioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const LiberacaoVazioTemplate: React.FC<LiberacaoVazioTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario 
}) => {
  const borderStyle = "1px solid #1e293b";

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
      {/* CABEÇALHO RÍGIDO ALS PREMIUM */}
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
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px' }}>LIBERAÇÃO DE VAZIO</div>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginTop: '4px' }}>
            EMISSÃO: <span style={{ fontSize: '18px', color: '#000000' }}>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* TERMINAL DE RETIRADA - DESTAQUE */}
      <div style={{ border: '2px solid #1e40af', padding: '15px', backgroundColor: '#eff6ff', marginBottom: '20px', borderRadius: '4px' }}>
        <p style={{ fontSize: '9px', fontWeight: 900, color: '#1e40af', marginBottom: '5px', letterSpacing: '2px' }}>LOCAL DE RETIRADA (TERMINAL / DEPÓSITO)</p>
        <p style={{ fontSize: '20px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
          {selectedDestinatario?.legalName || selectedDestinatario?.name || formData.manualLocal || 'NÃO INFORMADO'}
        </p>
        {selectedDestinatario && (
           <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '3px' }}>
             {selectedDestinatario.address} - {selectedDestinatario.city} / {selectedDestinatario.state}
           </p>
        )}
      </div>

      {/* GRID DE DADOS DA OPERAÇÃO */}
      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
         <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>BOOKING</p>
            <p style={{ fontSize: '16px', fontWeight: 900, color: '#1e40af' }}>{formData.booking || '---'}</p>
         </div>
         <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>ARMADOR</p>
            <p style={{ fontSize: '16px', fontWeight: 900 }}>{formData.agencia || '---'}</p>
         </div>
      </div>

      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
         <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>CLIENTE / EXPORTADOR</p>
            <p style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.2' }}>
              {selectedRemetente?.legalName || selectedRemetente?.name || '---'}
            </p>
            {selectedRemetente?.legalName && selectedRemetente?.name && selectedRemetente.name !== selectedRemetente.legalName && (
              <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>
                FANTASIA: {selectedRemetente.name}
              </p>
            )}
         </div>
         <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>NAVIO</p>
            <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</p>
         </div>
      </div>

      <div style={{ border: borderStyle, marginBottom: '20px', display: 'flex', backgroundColor: '#f8fafc' }}>
         <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>EQUIPAMENTO</p>
            <p style={{ fontSize: '14px', fontWeight: 900 }}>
              {formData.qtdContainer} X {formData.tipo} - {formData.padrao}
            </p>
         </div>
         <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>POD (PORTO DE DESCARGA)</p>
            <p style={{ fontSize: '16px', fontWeight: 900, color: '#1e40af' }}>{formData.pod || '---'}</p>
         </div>
      </div>

      {/* BLOCO MOTORISTA AJUSTADO (PADRÃO ALS) */}
      <div style={{ border: borderStyle, padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
          <div style={{ flex: '2' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA AUTORIZADO</p>
            <p style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase' }}>{selectedDriver?.name || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
            <p style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</p>
          </div>
          <div style={{ flex: '1' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CNH</p>
            <p style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedDriver?.cnh || '---'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '238px' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: '#1e40af', lineHeight: '1' }}>{selectedDriver?.plateHorse || '---'}</p>
          </div>
          <div style={{ width: '238px' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: '#1e40af', lineHeight: '1' }}>{selectedDriver?.plateTrailer || '---'}</p>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CONTATO</p>
            <p style={{ fontSize: '13px', fontWeight: 900 }}>{selectedDriver?.phone || '---'}</p>
          </div>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div style={{ border: borderStyle, padding: '15px', minHeight: '80px', marginBottom: '20px' }}>
        <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>OBSERVAÇÕES OPERACIONAIS</p>
        <p style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1.4', textTransform: 'uppercase' }}>
          {formData.obs || 'O MOTORISTA DEVERÁ REALIZAR A VISTORIA DAS UNIDADES NO ATO DA RETIRADA.'}
        </p>
      </div>

      {/* ESPAÇO PARA CARIMBO E ASSINATURA */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, marginTop: '20px' }}>
         <div style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>Carimbo / Visto Depósito</span>
         </div>
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
            <p style={{ fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#64748b' }}>ASSINATURA DO MOTORISTA</p>
         </div>
      </div>

      {/* RODAPÉ INSTITUCIONAL */}
      <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 'bold' }}>
           AVENIDA ANA COSTA, 59 - SANTOS SP | CONTATO: 13 99628-0762
         </div>
         <div style={{ opacity: 0.3 }}>
           <span style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: '#1e40af' }}>ALS</span>
         </div>
      </div>
    </div>
  );
};

export default LiberacaoVazioTemplate;

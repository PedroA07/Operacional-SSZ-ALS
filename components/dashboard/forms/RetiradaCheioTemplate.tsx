import React from 'react';

interface RetiradaCheioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedCliente: any;
  selectedTerminal: any;
}

const RetiradaCheioTemplate: React.FC<RetiradaCheioTemplateProps> = ({
  formData,
  selectedDriver,
  selectedCliente,
  selectedTerminal,
}) => {
  const borderStyle = '1px solid #1e293b';
  const themeColor = '#3730a3';
  const themeBg = '#eef2ff';

  return (
    <div
      id="retirada-cheio-doc"
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
        position: 'relative',
      }}
    >
      {/* CABEÇALHO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: `4px solid ${themeColor}`,
          paddingBottom: '10px',
          marginBottom: '20px',
        }}
      >
        <div style={{ width: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', marginRight: '10px', overflow: 'hidden' }}>
              <img
                src="/logo.jpg"
                alt="ALS"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
              />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#94a3b8', letterSpacing: '4px' }}>
              TRANSPORTES
            </span>
          </div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '5px' }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>

        <div style={{ textAlign: 'right', width: '300px' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px' }}>
            RETIRADA DE CONTAINER CHEIO
          </div>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginTop: '4px' }}>
            EMISSÃO:{' '}
            <span style={{ fontSize: '18px', color: '#000000' }}>
              {formData.displayDate || new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* TERMINAL DE RETIRADA */}
      <div
        style={{
          border: `2px solid ${themeColor}`,
          padding: '15px',
          backgroundColor: themeBg,
          marginBottom: '20px',
          borderRadius: '4px',
        }}
      >
        <p style={{ fontSize: '9px', fontWeight: 900, color: themeColor, marginBottom: '5px', letterSpacing: '2px' }}>
          TERMINAL / LOCAL DE RETIRADA
        </p>
        <p style={{ fontSize: '20px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
          {selectedTerminal?.legalName || selectedTerminal?.name || formData.manualTerminal || 'NÃO INFORMADO'}
        </p>
        {selectedTerminal && (
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '3px' }}>
            {selectedTerminal.address} — {selectedTerminal.city} / {selectedTerminal.state}
          </p>
        )}
      </div>

      {/* CONTAINER + TIPO */}
      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
        <div style={{ flex: 2, borderRight: borderStyle, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>CONTAINER</p>
          <p style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: '#000000' }}>
            {formData.container || '---'}
          </p>
        </div>
        <div style={{ flex: 1, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>TIPO</p>
          <p style={{ fontSize: '18px', fontWeight: 900, color: themeColor }}>{formData.tipo || '---'}</p>
        </div>
      </div>

      {/* CLIENTE + NAVIO */}
      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
        <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>CLIENTE / IMPORTADOR</p>
          <p style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.2' }}>
            {selectedCliente?.legalName || selectedCliente?.name || '---'}
          </p>
          {selectedCliente?.legalName && selectedCliente?.name && selectedCliente.name !== selectedCliente.legalName && (
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>
              FANTASIA: {selectedCliente.name}
            </p>
          )}
        </div>
        <div style={{ flex: 1, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>NAVIO</p>
          <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>{formData.ship || '---'}</p>
        </div>
      </div>

      {/* ARMADOR + POD */}
      <div style={{ border: borderStyle, marginBottom: '10px', display: 'flex' }}>
        <div style={{ flex: 1, borderRight: borderStyle, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>ARMADOR</p>
          <p style={{ fontSize: '16px', fontWeight: 900 }}>{formData.agencia || '---'}</p>
        </div>
        <div style={{ flex: 1, padding: '12px' }}>
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>POD</p>
          <p style={{ fontSize: '16px', fontWeight: 900, color: themeColor }}>{formData.pod || '---'}</p>
        </div>
      </div>

      {/* BL / BOOKING */}
      <div style={{ border: borderStyle, marginBottom: '20px', padding: '12px' }}>
        <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>BL / BOOKING</p>
        <p style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>{formData.booking || '---'}</p>
      </div>

      {/* MOTORISTA */}
      {selectedDriver && (
        <>
          <div
            style={{
              backgroundColor: themeColor,
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '9px',
              fontWeight: 900,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '0px',
            }}
          >
            MOTORISTA AUTORIZADO
          </div>
          <div style={{ border: borderStyle, borderTop: 'none', marginBottom: '10px', padding: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px' }}>
              {selectedDriver.name || '---'}
            </p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
                <p style={{ fontSize: '12px', fontWeight: 900 }}>{selectedDriver.cpf || '---'}</p>
              </div>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>RG</p>
                <p style={{ fontSize: '12px', fontWeight: 900 }}>{selectedDriver.rg || '---'}</p>
              </div>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>CNH</p>
                <p style={{ fontSize: '12px', fontWeight: 900 }}>{selectedDriver.cnh || '---'}</p>
              </div>
            </div>
          </div>

          {/* VEÍCULO */}
          <div style={{ border: borderStyle, display: 'flex', marginBottom: '20px' }}>
            <div style={{ flex: 1, borderRight: borderStyle, padding: '12px', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '6px' }}>CAVALO</p>
              <p style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '3px', fontFamily: 'monospace', color: '#000000' }}>
                {selectedDriver.plateHorse || '---'}
              </p>
            </div>
            <div style={{ flex: 1, padding: '12px', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '6px' }}>CARRETA</p>
              <p style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '3px', fontFamily: 'monospace', color: '#000000' }}>
                {selectedDriver.plateTrailer || '---'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* OBSERVAÇÕES */}
      {formData.obs && (
        <div
          style={{
            border: '1px dashed #94a3b8',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#f8fafc',
          }}
        >
          <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}>OBSERVAÇÕES</p>
          <p style={{ fontSize: '11px', lineHeight: '1.6', color: '#334155' }}>{formData.obs}</p>
        </div>
      )}

      {/* ASSINATURA */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, marginTop: 'auto' }}>
        <div
          style={{
            flex: 1,
            border: '1px dashed #cbd5e1',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            minHeight: '70px',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>
            Carimbo / Visto Terminal
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
          <p style={{ fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#64748b' }}>
            ASSINATURA DO MOTORISTA
          </p>
        </div>
      </div>

      {/* RODAPÉ */}
      <div
        style={{
          marginTop: '20px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 'bold' }}>
          AVENIDA ANA COSTA, 59 — SANTOS SP | CONTATO: 13 99628-0762
        </div>
        <div style={{ opacity: 0.3, width: '40px', height: '40px', overflow: 'hidden' }}>
          <img src="/logo.jpg" alt="ALS" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
      </div>
    </div>
  );
};

export default RetiradaCheioTemplate;

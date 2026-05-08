import React from 'react';

interface DevolucaoVazioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

// Estilos base reutilizáveis — margin e padding sempre explícitos
// para evitar margens padrão do browser que causam sobreposição no html2canvas
const p0: React.CSSProperties = { margin: 0, padding: 0 };
const label: React.CSSProperties = { ...p0, fontSize: '6px', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', lineHeight: '1.2', marginBottom: '2px' };
const value: React.CSSProperties = { ...p0, fontSize: '10px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.3' };
const valueOrange: React.CSSProperties = { ...value, color: '#d97706' };
const valueLarge: React.CSSProperties = { ...p0, fontSize: '14px', fontWeight: 900, color: '#d97706', lineHeight: '1.2', textTransform: 'uppercase' };

const THEME = '#d97706';
const BORDER = '1px solid #334155';

const Cell: React.FC<{ label: string; value: string; style?: React.CSSProperties; valStyle?: React.CSSProperties }> =
  ({ label: lbl, value: val, style, valStyle }) => (
    <div style={{ padding: '5px 8px', boxSizing: 'border-box', ...style }}>
      <div style={label}>{lbl}</div>
      <div style={{ ...value, ...valStyle }}>{val || '---'}</div>
    </div>
  );

const DevolucaoVazioTemplate: React.FC<DevolucaoVazioTemplateProps> = ({
  formData,
  selectedDriver,
  selectedRemetente,
  selectedDestinatario,
}) => {
  const emissao = new Date().toLocaleDateString('pt-BR');
  const localDevolucao =
    selectedDestinatario?.legalName ||
    selectedDestinatario?.name ||
    formData?.manualLocal ||
    'NÃO INFORMADO';

  const renderPart = () => (
    <div style={{
      width: '794px',
      height: '510px',
      padding: '18px 36px 14px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, Helvetica, sans-serif',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2.5px solid ${THEME}`, paddingBottom: '6px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <img src="/logo.jpg" alt="ALS" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '10px', display: 'block' }} />
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', letterSpacing: '2.5px' }}>TRANSPORTES</span>
          </div>
          <div style={{ fontSize: '6.5px', fontWeight: 700, color: '#64748b', margin: 0 }}>
            LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...p0, fontSize: '17px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: '1.1' }}>MINUTA DE DEVOLUÇÃO</div>
          <div style={{ ...p0, fontSize: '7px', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
            EMISSÃO:&nbsp;
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>{emissao}</span>
          </div>
        </div>
      </div>

      {/* ── LOCAL DE DEVOLUÇÃO ── */}
      <div style={{ border: `1.5px solid ${THEME}`, backgroundColor: '#fef3c7', borderRadius: '4px', padding: '5px 10px', boxSizing: 'border-box' }}>
        <div style={{ ...label, color: THEME, marginBottom: '3px' }}>LOCAL DE DEVOLUÇÃO (TERMINAL / DEPOT)</div>
        <div style={{ ...p0, fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.2' }}>
          {localDevolucao}
        </div>
      </div>

      {/* ── BL / ARMADOR / NAVIO ── */}
      <div style={{ display: 'flex', border: BORDER, boxSizing: 'border-box' }}>
        <div style={{ flex: '1.2', borderRight: BORDER, padding: '5px 8px', boxSizing: 'border-box' }}>
          <div style={label}>BL / BOOKING</div>
          <div style={valueOrange}>{formData?.booking || '---'}</div>
        </div>
        <div style={{ flex: '1', borderRight: BORDER, padding: '5px 8px', boxSizing: 'border-box' }}>
          <div style={label}>ARMADOR</div>
          <div style={value}>{formData?.agencia || '---'}</div>
        </div>
        <div style={{ flex: '1.2', padding: '5px 8px', boxSizing: 'border-box' }}>
          <div style={label}>NAVIO</div>
          <div style={value}>{formData?.ship || '---'}</div>
        </div>
      </div>

      {/* ── CLIENTE ── */}
      <div style={{ border: BORDER, borderTop: 'none', padding: '5px 8px', boxSizing: 'border-box' }}>
        <div style={label}>CLIENTE / EXPORTADOR</div>
        <div style={value}>{selectedRemetente?.legalName || selectedRemetente?.name || '---'}</div>
      </div>

      {/* ── EQUIPAMENTO + POD ── */}
      <div style={{ display: 'flex', border: BORDER, borderTop: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ flex: '1', borderRight: BORDER, padding: '5px 8px', boxSizing: 'border-box' }}>
          <div style={label}>EQUIPAMENTO (UNIT)</div>
          <div style={valueLarge}>{formData?.container || '---'}</div>
          <div style={{ ...p0, fontSize: '7px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
            TIPO: {formData?.tipo || '---'} — {formData?.padrao || '---'}
          </div>
        </div>
        <div style={{ flex: '1', padding: '5px 8px', boxSizing: 'border-box' }}>
          <div style={label}>POD (PORTO DE DESCARGA)</div>
          <div style={valueLarge}>{formData?.pod || '---'}</div>
        </div>
      </div>

      {/* ── MOTORISTA ── */}
      <div style={{ border: BORDER, padding: '5px 8px', boxSizing: 'border-box' }}>
        {/* linha 1: nome / CPF / CNH */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '5px' }}>
          <div style={{ flex: '2', paddingRight: '8px', boxSizing: 'border-box' }}>
            <div style={label}>MOTORISTA TRANSPORTADOR</div>
            <div style={value}>{selectedDriver?.name || '---'}</div>
          </div>
          <div style={{ flex: '1', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', paddingRight: '8px', boxSizing: 'border-box' }}>
            <div style={label}>CPF</div>
            <div style={{ ...value, fontSize: '9px' }}>{selectedDriver?.cpf || '---'}</div>
          </div>
          <div style={{ flex: '1', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', boxSizing: 'border-box' }}>
            <div style={label}>CNH</div>
            <div style={{ ...value, fontSize: '9px' }}>{selectedDriver?.cnh || '---'}</div>
          </div>
        </div>
        {/* linha 2: placas / contato */}
        <div style={{ display: 'flex', gap: '0', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', paddingRight: '8px', boxSizing: 'border-box' }}>
            <div style={label}>PLACA CAVALO</div>
            <div style={{ ...p0, fontSize: '17px', fontWeight: 900, color: THEME, lineHeight: '1.2', textTransform: 'uppercase' }}>
              {selectedDriver?.plateHorse || '---'}
            </div>
          </div>
          <div style={{ flex: '1', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', paddingRight: '8px', boxSizing: 'border-box' }}>
            <div style={label}>PLACA CARRETA</div>
            <div style={{ ...p0, fontSize: '17px', fontWeight: 900, color: THEME, lineHeight: '1.2', textTransform: 'uppercase' }}>
              {selectedDriver?.plateTrailer || '---'}
            </div>
          </div>
          <div style={{ flex: '1', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', boxSizing: 'border-box', textAlign: 'right' }}>
            <div style={label}>CONTATO</div>
            <div style={{ ...value, fontSize: '9px' }}>{selectedDriver?.phone || '---'}</div>
          </div>
        </div>
      </div>

      {/* ── OBSERVAÇÕES ── */}
      <div style={{ border: BORDER, padding: '5px 8px', boxSizing: 'border-box' }}>
        <div style={label}>OBSERVAÇÕES OPERACIONAIS</div>
        <div style={{ ...p0, fontSize: '7.5px', fontWeight: 700, lineHeight: '1.4', textTransform: 'uppercase', marginTop: '2px' }}>
          {formData?.obs || 'O TERMINAL DEVERÁ EMITIR O TICKET DE RECEBIMENTO APÓS A DESCARGA DA UNIDADE VAZIA.'}
        </div>
      </div>

      {/* ── CARIMBO + ASSINATURA ── */}
      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: '64px' }}>
        <div style={{
          flex: '1.3',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
        }}>
          <span style={{ fontSize: '9px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>
            Carimbo / Visto Depósito
          </span>
        </div>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ borderBottom: '1.5px solid #334155', marginBottom: '6px' }} />
          <div style={{ ...p0, fontSize: '8px', fontWeight: 900, textAlign: 'center', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ASSINATURA DO MOTORISTA
          </div>
        </div>
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${THEME}44`, paddingTop: '5px', marginTop: '2px' }}>
        <div style={{ ...p0, fontSize: '6px', color: '#94a3b8', fontWeight: 700 }}>
          AVENIDA ANA COSTA, 59 — SANTOS SP | CONTATO: 13 99628-0762
        </div>
        <img src="/logo.jpg" alt="ALS" style={{ width: '26px', height: '26px', objectFit: 'contain', borderRadius: '8px', opacity: 0.25 }} />
      </div>

    </div>
  );

  return (
    <div
      id="devolucao-vazio-doc"
      style={{
        width: '794px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {renderPart()}

      {/* ── LINHA DE CORTE ── */}
      <div style={{ width: '100%', position: 'relative', margin: '4px 0' }}>
        <div style={{ borderTop: '2px dashed #cbd5e1', width: '100%' }} />
        <div style={{
          position: 'absolute',
          top: '-9px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '0 10px',
          fontSize: '8px',
          color: '#94a3b8',
          fontWeight: 900,
          letterSpacing: '1.5px',
          margin: 0,
        }}>
          ✂ CORTE AQUI
        </div>
      </div>

      {renderPart()}
    </div>
  );
};

export default DevolucaoVazioTemplate;

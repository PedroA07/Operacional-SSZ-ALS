import React from 'react';

interface RetiradaCheioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedCliente: any;
  selectedTerminal: any;
}

const p0: React.CSSProperties = { margin: 0, padding: 0 };
const lbl: React.CSSProperties = { ...p0, fontSize: '7px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', lineHeight: '1.3', marginBottom: '3px' };
const val: React.CSSProperties = { ...p0, fontSize: '12px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.3' };
const THEME = '#3730a3';
const THEME_BG = '#eef2ff';
const BORDER = '1px solid #1e293b';

const RetiradaCheioTemplate: React.FC<RetiradaCheioTemplateProps> = ({
  formData,
  selectedDriver,
  selectedCliente,
  selectedTerminal,
}) => (
  <div
    id="retirada-cheio-doc"
    style={{
      width: '794px',
      height: '1123px',
      padding: '36px 40px',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      fontFamily: 'Arial, Helvetica, sans-serif',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* ── CABEÇALHO ── */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `4px solid ${THEME}`, paddingBottom: '10px', marginBottom: '18px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <img src="/logo.jpg" alt="ALS" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', display: 'block' }} />
          <span style={{ ...p0, fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '4px' }}>TRANSPORTES</span>
        </div>
        <div style={{ ...p0, fontSize: '8px', fontWeight: 700, color: '#64748b' }}>
          LUARA MEL VIEIRA TRANSPORTES LTDA. | CNPJ: 13.841.647/0004-30
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...p0, fontSize: '20px', fontWeight: 900, lineHeight: '1.1' }}>RETIRADA DE CONTAINER CHEIO</div>
        <div style={{ ...p0, fontSize: '9px', fontWeight: 700, color: '#94a3b8', marginTop: '4px' }}>
          EMISSÃO:&nbsp;
          <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
            {formData?.displayDate || new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>

    {/* ── TERMINAL DE RETIRADA ── */}
    <div style={{ border: `2px solid ${THEME}`, padding: '12px 14px', backgroundColor: THEME_BG, marginBottom: '14px', borderRadius: '4px', boxSizing: 'border-box' }}>
      <div style={{ ...lbl, color: THEME, marginBottom: '4px' }}>TERMINAL / LOCAL DE RETIRADA</div>
      <div style={{ ...p0, fontSize: '20px', fontWeight: 900, lineHeight: '1.2', textTransform: 'uppercase' }}>
        {selectedTerminal?.legalName || selectedTerminal?.name || formData?.manualTerminal || 'NÃO INFORMADO'}
      </div>
      {selectedTerminal && (
        <div style={{ ...p0, fontSize: '10px', fontWeight: 700, color: '#64748b', marginTop: '3px', textTransform: 'uppercase' }}>
          {[selectedTerminal.address, selectedTerminal.city, selectedTerminal.state].filter(Boolean).join(' — ')}
        </div>
      )}
    </div>

    {/* ── CONTAINER + TIPO ── */}
    <div style={{ display: 'flex', border: BORDER, marginBottom: '8px', boxSizing: 'border-box' }}>
      <div style={{ flex: 2, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>CONTAINER</div>
        <div style={{ ...p0, fontSize: '22px', fontWeight: 900, letterSpacing: '2px', lineHeight: '1.2' }}>
          {formData?.container || '---'}
        </div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>TIPO</div>
        <div style={{ ...p0, fontSize: '18px', fontWeight: 900, color: THEME, lineHeight: '1.2' }}>{formData?.tipo || '---'}</div>
      </div>
    </div>

    {/* ── CLIENTE + NAVIO ── */}
    <div style={{ display: 'flex', border: BORDER, borderTop: 'none', marginBottom: '8px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>CLIENTE / IMPORTADOR</div>
        <div style={{ ...val, fontSize: '13px' }}>{selectedCliente?.legalName || selectedCliente?.name || '---'}</div>
        {selectedCliente?.legalName && selectedCliente?.name && selectedCliente.name !== selectedCliente.legalName && (
          <div style={{ ...p0, fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>
            FANTASIA: {selectedCliente.name}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>NAVIO</div>
        <div style={{ ...val, fontSize: '14px' }}>{formData?.ship || '---'}</div>
      </div>
    </div>

    {/* ── ARMADOR + POD ── */}
    <div style={{ display: 'flex', border: BORDER, borderTop: 'none', marginBottom: '8px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>ARMADOR</div>
        <div style={{ ...val, fontSize: '14px' }}>{formData?.agencia || '---'}</div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>POD</div>
        <div style={{ ...val, fontSize: '16px', color: THEME }}>{formData?.pod || '---'}</div>
      </div>
    </div>

    {/* ── BL / BOOKING ── */}
    <div style={{ border: BORDER, borderTop: 'none', padding: '10px 12px', marginBottom: '18px', boxSizing: 'border-box' }}>
      <div style={lbl}>BL / BOOKING</div>
      <div style={{ ...p0, fontSize: '18px', fontWeight: 900, letterSpacing: '1px', lineHeight: '1.2' }}>{formData?.booking || '---'}</div>
    </div>

    {/* ── MOTORISTA ── */}
    {selectedDriver && (
      <>
        <div style={{
          backgroundColor: THEME,
          color: '#ffffff',
          padding: '7px 12px',
          fontSize: '8px',
          fontWeight: 900,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          MOTORISTA AUTORIZADO
        </div>
        <div style={{ border: BORDER, borderTop: 'none', padding: '10px 12px', marginBottom: '8px', boxSizing: 'border-box' }}>
          <div style={{ ...val, fontSize: '14px', marginBottom: '8px' }}>{selectedDriver.name || '---'}</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={lbl}>CPF</div>
              <div style={{ ...val, fontSize: '11px' }}>{selectedDriver.cpf || '---'}</div>
            </div>
            <div>
              <div style={lbl}>RG</div>
              <div style={{ ...val, fontSize: '11px' }}>{selectedDriver.rg || '---'}</div>
            </div>
            <div>
              <div style={lbl}>CNH</div>
              <div style={{ ...val, fontSize: '11px' }}>{selectedDriver.cnh || '---'}</div>
            </div>
          </div>
        </div>

        {/* ── PLACAS ── */}
        <div style={{ display: 'flex', border: BORDER, marginBottom: '18px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, borderRight: BORDER, padding: '12px', boxSizing: 'border-box' }}>
            <div style={lbl}>CAVALO</div>
            <div style={{ ...p0, fontSize: '26px', fontWeight: 900, letterSpacing: '3px', fontFamily: 'monospace', lineHeight: '1.2' }}>
              {selectedDriver.plateHorse || '---'}
            </div>
          </div>
          <div style={{ flex: 1, padding: '12px', boxSizing: 'border-box' }}>
            <div style={lbl}>CARRETA</div>
            <div style={{ ...p0, fontSize: '26px', fontWeight: 900, letterSpacing: '3px', fontFamily: 'monospace', lineHeight: '1.2' }}>
              {selectedDriver.plateTrailer || '---'}
            </div>
          </div>
        </div>
      </>
    )}

    {/* ── OBSERVAÇÕES ── */}
    {formData?.obs && (
      <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', padding: '10px 12px', marginBottom: '16px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ ...lbl, marginBottom: '5px' }}>OBSERVAÇÕES</div>
        <div style={{ ...p0, fontSize: '10px', fontWeight: 700, lineHeight: '1.5', color: '#334155', textTransform: 'uppercase' }}>
          {formData.obs}
        </div>
      </div>
    )}

    {/* ── CARIMBO + ASSINATURA ── */}
    <div style={{ display: 'flex', gap: '20px', flex: 1, marginTop: 'auto' }}>
      <div style={{ flex: 1, border: '1.5px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', minHeight: '70px' }}>
        <span style={{ ...p0, fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>
          Carimbo / Visto Terminal
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
        <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '8px' }} />
        <div style={{ ...p0, fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          ASSINATURA DO MOTORISTA
        </div>
      </div>
    </div>

    {/* ── RODAPÉ ── */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '16px' }}>
      <div style={{ ...p0, fontSize: '7.5px', color: '#94a3b8', fontWeight: 700 }}>
        AVENIDA ANA COSTA, 59 — SANTOS SP | CONTATO: 13 99628-0762
      </div>
      <img src="/logo.jpg" alt="ALS" style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '10px', opacity: 0.25 }} />
    </div>
  </div>
);

export default RetiradaCheioTemplate;

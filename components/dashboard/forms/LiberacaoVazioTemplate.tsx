import React from 'react';

interface LiberacaoVazioTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const p0: React.CSSProperties = { margin: 0, padding: 0 };
const lbl: React.CSSProperties = { ...p0, fontSize: '7px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', lineHeight: '1.3', marginBottom: '3px' };
const val: React.CSSProperties = { ...p0, fontSize: '12px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.3' };
const THEME = '#334155';
const BORDER = '1px solid #334155';

const LiberacaoVazioTemplate: React.FC<LiberacaoVazioTemplateProps> = ({
  formData,
  selectedDriver,
  selectedRemetente,
  selectedDestinatario,
}) => (
  <div
    id="liberacao-vazio-doc"
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
        <div style={{ ...p0, fontSize: '22px', fontWeight: 900, lineHeight: '1.1' }}>LIBERAÇÃO DE VAZIO</div>
        <div style={{ ...p0, fontSize: '9px', fontWeight: 700, color: '#94a3b8', marginTop: '4px' }}>
          EMISSÃO:&nbsp;
          <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>

    {/* ── LOCAL DE RETIRADA ── */}
    <div style={{ border: `2px solid ${THEME}`, padding: '12px 14px', backgroundColor: '#f8fafc', marginBottom: '14px', borderRadius: '4px', boxSizing: 'border-box' }}>
      <div style={{ ...lbl, color: THEME, marginBottom: '4px' }}>LOCAL DE RETIRADA (TERMINAL / DEPÓSITO)</div>
      <div style={{ ...p0, fontSize: '20px', fontWeight: 900, lineHeight: '1.2', textTransform: 'uppercase' }}>
        {selectedDestinatario?.legalName || selectedDestinatario?.name || formData?.manualLocal || 'NÃO INFORMADO'}
      </div>
      {selectedDestinatario && (
        <div style={{ ...p0, fontSize: '10px', fontWeight: 700, color: '#64748b', marginTop: '3px', textTransform: 'uppercase' }}>
          {[selectedDestinatario.address, selectedDestinatario.city, selectedDestinatario.state].filter(Boolean).join(' — ')}
        </div>
      )}
    </div>

    {/* ── BOOKING + ARMADOR ── */}
    <div style={{ display: 'flex', border: BORDER, marginBottom: '8px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>BOOKING</div>
        <div style={{ ...val, fontSize: '16px', color: THEME }}>{formData?.booking || '---'}</div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>ARMADOR</div>
        <div style={{ ...val, fontSize: '14px' }}>{formData?.agencia || '---'}</div>
      </div>
    </div>

    {/* ── CLIENTE + NAVIO ── */}
    <div style={{ display: 'flex', border: BORDER, borderTop: 'none', marginBottom: '8px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>CLIENTE / EXPORTADOR</div>
        <div style={{ ...val, fontSize: '13px' }}>{selectedRemetente?.legalName || selectedRemetente?.name || '---'}</div>
        {selectedRemetente?.legalName && selectedRemetente?.name && selectedRemetente.name !== selectedRemetente.legalName && (
          <div style={{ ...p0, fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>
            FANTASIA: {selectedRemetente.name}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>NAVIO</div>
        <div style={{ ...val, fontSize: '14px' }}>{formData?.ship || '---'}</div>
      </div>
    </div>

    {/* ── EQUIPAMENTO + POD ── */}
    <div style={{ display: 'flex', border: BORDER, borderTop: 'none', marginBottom: '18px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, borderRight: BORDER, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>EQUIPAMENTO</div>
        <div style={{ ...val, fontSize: '14px' }}>
          {formData?.qtdContainer || '01'} X {formData?.tipo || '---'} — {formData?.padrao || '---'}
        </div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', boxSizing: 'border-box' }}>
        <div style={lbl}>POD (PORTO DE DESCARGA)</div>
        <div style={{ ...val, fontSize: '16px', color: THEME }}>{formData?.pod || '---'}</div>
      </div>
    </div>

    {/* ── MOTORISTA ── */}
    <div style={{ border: BORDER, padding: '12px 14px', marginBottom: '16px', boxSizing: 'border-box' }}>
      {/* linha 1 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 2, paddingRight: '12px', boxSizing: 'border-box' }}>
          <div style={lbl}>MOTORISTA AUTORIZADO</div>
          <div style={{ ...val, fontSize: '15px' }}>{selectedDriver?.name || '---'}</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box' }}>
          <div style={lbl}>CPF</div>
          <div style={{ ...val, fontSize: '11px' }}>{selectedDriver?.cpf || '---'}</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', boxSizing: 'border-box' }}>
          <div style={lbl}>CNH</div>
          <div style={{ ...val, fontSize: '11px' }}>{selectedDriver?.cnh || '---'}</div>
        </div>
      </div>
      {/* linha 2 */}
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, paddingRight: '12px', boxSizing: 'border-box' }}>
          <div style={lbl}>PLACA CAVALO</div>
          <div style={{ ...p0, fontSize: '28px', fontWeight: 900, color: THEME, lineHeight: '1.15', textTransform: 'uppercase' }}>
            {selectedDriver?.plateHorse || '---'}
          </div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box' }}>
          <div style={lbl}>PLACA CARRETA</div>
          <div style={{ ...p0, fontSize: '28px', fontWeight: 900, color: THEME, lineHeight: '1.15', textTransform: 'uppercase' }}>
            {selectedDriver?.plateTrailer || '---'}
          </div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', textAlign: 'right', boxSizing: 'border-box' }}>
          <div style={lbl}>CONTATO</div>
          <div style={{ ...val, fontSize: '12px' }}>{selectedDriver?.phone || '---'}</div>
        </div>
      </div>
    </div>

    {/* ── OBSERVAÇÕES ── */}
    <div style={{ border: BORDER, padding: '10px 14px', marginBottom: '18px', boxSizing: 'border-box' }}>
      <div style={{ ...lbl, marginBottom: '5px' }}>OBSERVAÇÕES OPERACIONAIS</div>
      <div style={{ ...p0, fontSize: '10px', fontWeight: 700, lineHeight: '1.5', textTransform: 'uppercase' }}>
        {formData?.obs || 'O MOTORISTA DEVERÁ REALIZAR A VISTORIA DAS UNIDADES NO ATO DA RETIRADA.'}
      </div>
    </div>

    {/* ── CARIMBO + ASSINATURA ── */}
    <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
      <div style={{ flex: 1, border: '1.5px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <span style={{ ...p0, fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>
          Carimbo / Visto Depósito
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
        <div style={{ borderBottom: '1.5px solid #334155', marginBottom: '8px' }} />
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

export default LiberacaoVazioTemplate;

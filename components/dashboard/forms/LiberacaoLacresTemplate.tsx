import React from 'react';

interface LiberacaoLacresTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedLocal: any;
}

const p0: React.CSSProperties = { margin: 0, padding: 0 };
const lbl: React.CSSProperties = { ...p0, fontSize: '8px', fontWeight: 900, color: '#9f1239', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: '1.3', marginBottom: '3px' };
const val: React.CSSProperties = { ...p0, fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.3' };
const THEME = '#be123c';
const THEME_BG = '#fff1f2';
const BORDER = '1px solid #1e293b';

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const longDate = (isoDate?: string): string => {
  const d = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  return `SANTOS-SP, ${valid.getDate()} DE ${MESES[valid.getMonth()]} DE ${valid.getFullYear()}.`;
};

const LiberacaoLacresTemplate: React.FC<LiberacaoLacresTemplateProps> = ({
  formData,
  selectedDriver,
  selectedLocal,
}) => {
  const localRetirada = selectedLocal?.legalName || selectedLocal?.name || formData?.localRetirada || '---';
  const veiculo = formData?.veiculo || selectedDriver?.plateHorse || '---';
  const cpf = formData?.cpf || selectedDriver?.cpf || '---';
  const rg = formData?.rg || selectedDriver?.rg || '---';
  const motorista = selectedDriver?.name || formData?.motorista || '---';

  const qtdNum = parseInt(String(formData?.quantidade ?? '').replace(/\D/g, ''), 10);
  const lacreLabel = qtdNum === 1 ? 'LACRE' : 'LACRES';
  const mostrarUnidade = !!formData?.porUnidade && (formData?.booking || formData?.container);
  const temObs = !!(formData?.obs && String(formData.obs).trim());

  return (
    <div
      id="liberacao-lacres-doc"
      style={{
        width: '794px',
        height: '1123px',
        padding: '40px 44px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── CABEÇALHO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `4px solid ${THEME}`, paddingBottom: '10px', marginBottom: '10px' }}>
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
          <div style={{ ...p0, fontSize: '9px', fontWeight: 900, color: THEME, letterSpacing: '3px' }}>MEMORANDO</div>
          <div style={{ ...p0, fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {longDate(formData?.date)}
          </div>
        </div>
      </div>

      {/* ── TÍTULO ── */}
      <div style={{ textAlign: 'center', margin: '22px 0 26px' }}>
        <div style={{ ...p0, fontSize: '30px', fontWeight: 900, letterSpacing: '2px' }}>
          LIBERAÇÃO DE LACRES
        </div>
      </div>

      {/* ── DADOS PRINCIPAIS ── */}
      <div style={{ border: BORDER, marginBottom: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', borderBottom: BORDER }}>
          <div style={{ flex: 1, borderRight: BORDER, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>ARMADOR</div>
            <div style={val}>{formData?.armador || '---'}</div>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>TRANSPORTADORA</div>
            <div style={val}>{formData?.transportadora || 'ALS TRANSPORTES'}</div>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, borderRight: BORDER, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>QUANTIDADE</div>
            <div style={{ ...val, color: THEME }}>{formData?.quantidade || '01'} {lacreLabel}</div>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>LOCAL DE RETIRADA</div>
            <div style={val}>{localRetirada}</div>
          </div>
        </div>
      </div>

      {/* ── OBSERVAÇÕES ── */}
      {temObs && (
        <div style={{ border: `2px solid ${THEME}`, backgroundColor: THEME_BG, borderRadius: '4px', padding: '12px 14px', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div style={{ ...lbl, marginBottom: '5px' }}>OBS.</div>
          <div style={{ ...p0, fontSize: '13px', fontWeight: 900, lineHeight: '1.4', textTransform: 'uppercase', color: '#0f172a' }}>
            {formData.obs}
          </div>
        </div>
      )}

      {/* ── BOOKING + CONTAINER (somente por unidade) ── */}
      {mostrarUnidade && (
        <div style={{ display: 'flex', border: BORDER, marginBottom: '22px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, borderRight: BORDER, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>BOOKING</div>
            <div style={{ ...p0, fontSize: '20px', fontWeight: 900, letterSpacing: '1px', lineHeight: '1.2' }}>{formData?.booking || '---'}</div>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', boxSizing: 'border-box' }}>
            <div style={lbl}>CONTAINER</div>
            <div style={{ ...p0, fontSize: '20px', fontWeight: 900, letterSpacing: '2px', lineHeight: '1.2', color: THEME }}>{formData?.container || '---'}</div>
          </div>
        </div>
      )}

      {/* ── DADOS DO RESPONSÁVEL ── */}
      <div style={{
        backgroundColor: THEME,
        color: '#ffffff',
        padding: '8px 14px',
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '3px',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        DADOS DO RESPONSÁVEL
      </div>
      <div style={{ border: BORDER, borderTop: 'none', padding: '14px', marginBottom: '18px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={lbl}>MOTORISTA</div>
          <div style={{ ...val, fontSize: '17px' }}>{motorista}</div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>CPF</div>
            <div style={{ ...val, fontSize: '13px' }}>{cpf}</div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
            <div style={lbl}>RG</div>
            <div style={{ ...val, fontSize: '13px' }}>{rg}</div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
            <div style={lbl}>VEÍCULO</div>
            <div style={{ ...val, fontSize: '15px', color: THEME, fontFamily: 'monospace', letterSpacing: '1px' }}>{veiculo}</div>
          </div>
        </div>
      </div>

      {/* ── ASSINATURA ── */}
      <div style={{ display: 'flex', gap: '24px', flex: 1, marginTop: 'auto' }}>
        <div style={{ flex: 1, border: '1.5px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', minHeight: '80px' }}>
          <span style={{ ...p0, fontSize: '10px', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', fontStyle: 'italic' }}>
            Carimbo / Visto Terminal
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '8px' }} />
          <div style={{ ...p0, fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ASSINATURA / RESPONSÁVEL ALS
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
};

export default LiberacaoLacresTemplate;

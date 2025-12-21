
import React from 'react';

interface OrdemColetaTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const OrdemColetaTemplate: React.FC<OrdemColetaTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario 
}) => {
  const borderStyle = "1px solid #1e293b";

  return (
    <div 
      id="ordem-coleta-doc" 
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
      {/* CABEÇALHO RÍGIDO */}
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
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#000000' }}>ORDEM DE COLETA</div>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginTop: '4px' }}>
            EMISSÃO: <span style={{ fontSize: '18px', color: '#000000' }}>{formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/----'}</span>
          </div>
        </div>
      </div>

      {/* BLOCO REMETENTE/DESTINATARIO */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '352px', height: '110px', border: borderStyle, padding: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>REMETENTE (CLIENTE)</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedRemetente?.name || '---'}</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>{selectedRemetente?.address || '---'}</div>
          <div style={{ fontSize: '10px' }}>{selectedRemetente?.city || '---'} - {selectedRemetente?.state || '--'} | CEP: {selectedRemetente?.zipCode || '---'}</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>CNPJ: {selectedRemetente?.cnpj || '---'}</div>
        </div>
        <div style={{ width: '352px', height: '110px', border: borderStyle, padding: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>DESTINATÁRIO (TERMINAL)</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedDestinatario?.name || '---'}</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>{selectedDestinatario?.address || '---'}</div>
          <div style={{ fontSize: '10px' }}>{selectedDestinatario?.city || '---'} - {selectedDestinatario?.state || '--'} | CEP: {selectedDestinatario?.zipCode || '---'}</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>CNPJ: {selectedDestinatario?.cnpj || '---'}</div>
        </div>
      </div>

      {/* BLOCO CONTAINER / BARCODES / GENSET (OTIMIZADO) */}
      <div style={{ display: 'flex', border: borderStyle, marginBottom: '10px', height: '115px', overflow: 'hidden' }}>
        <div style={{ width: '400px', padding: '10px', borderRight: borderStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>CONTAINER</div>
          <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: '1.2', whiteSpace: 'nowrap', marginBottom: '2px' }}>{formData.container || '---'}</div>
          
          {formData.genset && (
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#1e40af', backgroundColor: '#eff6ff', padding: '1px 5px', borderRadius: '3px', width: 'fit-content', border: '1px solid #bfdbfe' }}>
              GENSET: {formData.genset}
            </div>
          )}

          <div style={{ marginTop: 'auto', height: '32px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <svg id="barcode-container" style={{ width: '300px', height: '22px' }}></svg>
          </div>
        </div>

        <div style={{ width: '157px', padding: '10px', borderRight: borderStyle, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textAlign: 'left' }}>TARA</div>
          <div style={{ fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', marginTop: '2px' }}>{formData.tara || '---'}</div>
          <div style={{ marginTop: 'auto', height: '32px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg id="barcode-tara" style={{ width: '130px', height: '22px' }}></svg>
          </div>
        </div>

        <div style={{ width: '157px', padding: '10px', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textAlign: 'left' }}>LACRE</div>
          <div style={{ fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', marginTop: '2px' }}>{formData.seal || '---'}</div>
          <div style={{ marginTop: 'auto', height: '32px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg id="barcode-lacre" style={{ width: '130px', height: '22px' }}></svg>
          </div>
        </div>
      </div>

      {/* BLOCO OPERACIONAL */}
      <div style={{ display: 'flex', border: borderStyle, backgroundColor: '#f8fafc', marginBottom: '10px' }}>
        <div style={{ width: '178px', padding: '8px', borderRight: borderStyle, overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>ARMADOR</div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{formData.agencia || '---'}</div>
        </div>
        <div style={{ width: '178px', padding: '8px', borderRight: borderStyle, overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>TIPO</div>
          <div style={{ fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap' }}>{formData.tipo}</div>
        </div>
        <div style={{ width: '178px', padding: '8px', borderRight: borderStyle, overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PADRÃO</div>
          <div style={{ fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap' }}>{formData.padrao}</div>
        </div>
        <div style={{ width: '178px', padding: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>OPERAÇÃO</div>
          <div style={{ fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap' }}>{formData.tipoOperacao}</div>
        </div>
      </div>

      <div style={{ display: 'flex', border: borderStyle, marginBottom: '10px' }}>
        <div style={{ width: '238px', padding: '8px', borderRight: borderStyle, overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>NAVIO</div>
          <div style={{ fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap' }}>{formData.ship || '---'}</div>
        </div>
        <div style={{ width: '238px', padding: '8px', borderRight: borderStyle, overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>BOOKING</div>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e40af', whiteSpace: 'nowrap' }}>{formData.booking || '---'}</div>
        </div>
        <div style={{ width: '238px', padding: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>EXPEDIDOR</div>
          <div style={{ fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap' }}>{formData.expedidor || '---'}</div>
        </div>
      </div>

      {/* BLOCO MOTORISTA */}
      <div style={{ border: borderStyle, padding: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ width: '250px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>MOTORISTA</div>
            <div style={{ fontSize: '14px', fontWeight: 900, whiteSpace: 'nowrap' }}>{selectedDriver?.name || '---'}</div>
          </div>
          <div style={{ width: '150px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CPF</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedDriver?.cpf || '---'}</div>
          </div>
          <div style={{ width: '150px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>RG</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedDriver?.rg || '---'}</div>
          </div>
          <div style={{ width: '150px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CNH</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedDriver?.cnh || '---'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '238px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CAVALO</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>{selectedDriver?.plateHorse || '---'}</div>
          </div>
          <div style={{ width: '238px' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>PLACA CARRETA</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>{selectedDriver?.plateTrailer || '---'}</div>
          </div>
          <div style={{ width: '238px', textAlign: 'right' }}>
            <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8' }}>CONTATO</div>
            <div style={{ fontSize: '12px', fontWeight: 900 }}>{selectedDriver?.phone || '---'}</div>
          </div>
        </div>
      </div>

      {/* OPERACIONAL INFERIOR */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '352px', border: borderStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>Nº ORDEM SERVIÇO</span>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#1e40af' }}>{formData.os || '---'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>AUT. COLETA</span>
            <span style={{ fontSize: '12px', fontWeight: 900 }}>{formData.autColeta || '---'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>EMBARCADOR</span>
            <span style={{ fontSize: '12px', fontWeight: 900 }}>{formData.embarcador || '---'}</span>
          </div>
        </div>
        <div style={{ width: '352px', border: borderStyle, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '5px' }}>HORÁRIO AGENDADO COLETA</div>
          <div style={{ fontSize: '28px', fontWeight: 900 }}>
            {formData.horarioAgendado ? new Date(formData.horarioAgendado).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}).replace(',', '') : '---'}
          </div>
        </div>
      </div>

      {/* PORTARIA (ALTURA MAXIMIZADA PARA CARIMBOS) */}
      <div style={{ border: borderStyle, padding: '20px', flex: '1', display: 'flex', gap: '40px' }}>
        <div style={{ flex: '1', borderRight: '1px solid #f1f5f9', paddingRight: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', marginBottom: '15px', letterSpacing: '2px' }}>CONTROLE ENTRADA</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '15px' }}>DATA: __________________ HORA: _________</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '20px' }}>ASSINATURA: ___________________________</div>
          <div style={{ width: '100%', height: '180px', border: '2px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: 'auto', backgroundColor: '#fdfdfd' }}>
            <span style={{ width: '100%', fontSize: '11px', fontWeight: 900, color: '#cbd5e1', fontStyle: 'italic', textTransform: 'uppercase' }}>ESPAÇO PARA CARIMBO DE ENTRADA</span>
          </div>
        </div>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', marginBottom: '15px', letterSpacing: '2px' }}>CONTROLE SAÍDA</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '15px' }}>DATA: __________________ HORA: _________</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '20px' }}>ASSINATURA: ___________________________</div>
          <div style={{ width: '100%', height: '180px', border: '2px dashed #cbd5e1', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: 'auto', backgroundColor: '#fdfdfd' }}>
            <span style={{ width: '100%', fontSize: '11px', fontWeight: 900, color: '#cbd5e1', fontStyle: 'italic', textTransform: 'uppercase' }}>ESPAÇO PARA CARIMBO DE SAÍDA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdemColetaTemplate;

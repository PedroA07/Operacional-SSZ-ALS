
import React from 'react';

interface PreStackingTemplateProps {
  formData: any;
  selectedDriver: any;
  selectedRemetente: any;
  selectedDestinatario: any;
}

const PreStackingTemplate: React.FC<PreStackingTemplateProps> = ({ 
  formData, 
  selectedDriver, 
  selectedRemetente, 
  selectedDestinatario 
}) => {
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '10px',
  };

  const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '4px 6px',
    fontSize: '10px',
    textAlign: 'left',
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: '#e2e8f0',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '9px',
    textTransform: 'uppercase',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#000',
    textTransform: 'uppercase',
  };

  return (
    <div 
      id="pre-stacking-doc" 
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
      }}
    >
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '42px', fontWeight: 900, fontStyle: 'italic', color: '#1e40af', lineHeight: '1' }}>ALS</span>
          <span style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '3px', marginLeft: '8px' }}>TRANSPORTES</span>
        </div>
      </div>
      
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '2px', marginBottom: '5px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>MINUTA DE CHEIO – ALS</div>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>SERVIÇO DE TRANSPORTE INTERMUNICIPAL</div>
      </div>

      {/* CLIENTE */}
      <div style={{ backgroundColor: '#e2e8f0', padding: '4px', border: '1px solid #000', fontWeight: 'bold', fontSize: '10px', marginBottom: '1px' }}>
        CLIENTE: {selectedRemetente?.legalName || selectedRemetente?.name || '---'}
      </div>

      {/* TABELA DE CARGA */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Container</th>
            <th style={headerCellStyle}>Tipo</th>
            <th style={headerCellStyle}>Tara</th>
            <th style={headerCellStyle}>Lacre</th>
            <th style={headerCellStyle}>Booking</th>
            <th style={headerCellStyle}>Aut. Coleta</th>
            <th style={headerCellStyle}>Nota Fiscal</th>
            <th style={headerCellStyle}>OS</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: '35px' }}>
            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>{formData.container || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.tipo || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.tara || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.seal || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.booking || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.autColeta || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.nf || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{formData.os || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* TABELA MOTORISTA / VEÍCULO */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', marginBottom: '5px', textTransform: 'uppercase' }}>
        Motorista / Veículo
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '20%' }}>Navio</th>
            <th style={{ ...headerCellStyle, width: '15%' }}>CPF</th>
            <th style={{ ...headerCellStyle, width: '35%' }}>Motorista</th>
            <th style={{ ...headerCellStyle, width: '15%' }}>Cavalo</th>
            <th style={{ ...headerCellStyle, width: '15%' }}>Carreta</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: '35px' }}>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{formData.ship || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{selectedDriver?.cpf || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{selectedDriver?.name || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{selectedDriver?.plateHorse || ''}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{selectedDriver?.plateTrailer || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* LOCAIS */}
      <div style={{ backgroundColor: '#e2e8f0', padding: '4px', border: '1px solid #000', fontWeight: 'bold', fontSize: '10px', marginBottom: '1px' }}>
        LOCAL DE CARREGAMENTO
      </div>
      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '5px', fontSize: '10px', lineHeight: '1.6' }}>
        <div><span style={labelStyle}>Empresa:</span> {selectedRemetente?.legalName || selectedRemetente?.name || '---'}</div>
        <div><span style={labelStyle}>Endereço:</span> {selectedRemetente?.address || '---'}</div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1 }}><span style={labelStyle}>Cidade:</span> {selectedRemetente?.city || '---'}</div>
          <div style={{ width: '150px' }}><span style={labelStyle}>CEP:</span> {selectedRemetente?.zipCode || '---'}</div>
        </div>
        <div><span style={labelStyle}>CNPJ:</span> {selectedRemetente?.cnpj || '---'}</div>
      </div>

      <div style={{ backgroundColor: '#e2e8f0', padding: '4px', border: '1px solid #000', fontWeight: 'bold', fontSize: '10px', marginBottom: '1px' }}>
        LOCAL DE ENTREGA
      </div>
      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '15px', fontSize: '10px', lineHeight: '1.6' }}>
        <div><span style={labelStyle}>Empresa:</span> {selectedDestinatario?.legalName || selectedDestinatario?.name || '---'}</div>
        <div><span style={labelStyle}>Endereço:</span> {selectedDestinatario?.address || '---'}</div>
        <div><span style={labelStyle}>Cidade:</span> {selectedDestinatario?.city || '---'}</div>
      </div>

      {/* REGISTRO DO CLIENTE */}
      <div style={{ backgroundColor: '#e2e8f0', padding: '4px', border: '1px solid #000', fontWeight: 'bold', fontSize: '10px', marginBottom: '10px' }}>
        REGISTRO DO CLIENTE
      </div>
      
      <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', fontSize: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '10px' }}>Chegada: ____ / ____ / ________</div>
          <div style={{ marginBottom: '10px' }}>Hora: ________ : ________</div>
          <div style={{ marginTop: '20px' }}>Ass: ____________________________________</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '10px' }}>Saída: ____ / ____ / ________</div>
          <div style={{ marginBottom: '10px' }}>Hora: ________ : ________</div>
          <div style={{ marginTop: '20px' }}>Ass: ____________________________________</div>
        </div>
      </div>

      {/* CARIMBOS */}
      <div style={{ display: 'flex', gap: '15px', marginTop: 'auto' }}>
        <div style={{ flex: 1, height: '180px', border: '1px solid #000', position: 'relative' }}>
          <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginTop: '5px' }}>CARIMBO ENTRADA</div>
        </div>
        <div style={{ flex: 1, height: '180px', border: '1px solid #000', position: 'relative' }}>
          <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginTop: '5px' }}>CARIMBO SAÍDA</div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '20px' }}>
        Declaro que recebi a mercadoria acima descrita em perfeitas condições.
      </div>
    </div>
  );
};

export default PreStackingTemplate;


import React from 'react';
import { Driver } from '../../../types';

interface DriverProfileTemplateProps {
  driver: Driver;
}

const DriverProfileTemplate: React.FC<DriverProfileTemplateProps> = ({ driver }) => {
  const borderStyle = "1px solid #e2e8f0";

  return (
    <div className="bg-white">
      {/* PÁGINA 1: DADOS CADASTRAIS */}
      <div 
        id={`driver-profile-card-${driver.id}`}
        style={{ 
          width: '794px', 
          minHeight: '1123px', 
          padding: '50px',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#1e40af' }}>ALS</span>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '3px', marginLeft: '8px' }}>TRANSPORTES</span>
            </div>
            <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '5px' }}>FICHA CADASTRAL DE MOTORISTA - USO OPERACIONAL</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>DATA DE EMISSÃO</p>
            <p style={{ fontSize: '14px', fontWeight: '900' }}>{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* CORPO DO DOCUMENTO */}
        <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
          {/* FOTO */}
          <div style={{ width: '180px', height: '240px', border: borderStyle, borderRadius: '15px', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            {driver.photo ? (
              /* Fix: Use 'objectFit' instead of 'objectCover' to comply with CSS standards and TypeScript definitions */
              <img src={driver.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Motorista" />
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: '#cbd5e1', fontWeight: 'black', fontSize: '10px' }}>FOTO NÃO DISPONÍVEL</div>
            )}
          </div>

          {/* DADOS PESSOAIS */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div style={{ borderBottom: borderStyle, paddingBottom: '5px' }}>
                <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}>NOME COMPLETO</p>
                <p style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' }}>{driver.name}</p>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                   <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>CPF</p>
                   <p style={{ fontSize: '13px', fontWeight: 'bold' }}>{driver.cpf}</p>
                </div>
                <div>
                   <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>RG</p>
                   <p style={{ fontSize: '13px', fontWeight: 'bold' }}>{driver.rg || '---'}</p>
                </div>
             </div>

             <div>
                <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>REGISTRO CNH</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold' }}>{driver.cnh || '---'}</p>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                   <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>TELEFONE</p>
                   <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>{driver.phone}</p>
                </div>
                <div>
                   <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8' }}>E-MAIL</p>
                   <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'lowercase' }}>{driver.email || '---'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* EQUIPAMENTO */}
        <div style={{ marginBottom: '40px' }}>
          <h4 style={{ fontSize: '10px', fontWeight: 900, color: '#1e40af', backgroundColor: '#eff6ff', padding: '8px 15px', borderRadius: '8px', marginBottom: '15px' }}>DADOS DO EQUIPAMENTO</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '15px', border: borderStyle, borderRadius: '12px' }}>
               <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '5px' }}>CAVALO MECÂNICO</p>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900 }}>{driver.plateHorse}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ANO: {driver.yearHorse || '---'}</span>
               </div>
            </div>
            <div style={{ padding: '15px', border: borderStyle, borderRadius: '12px' }}>
               <p style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', marginBottom: '5px' }}>CARRETA / IMPLEMENTO</p>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900 }}>{driver.plateTrailer}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ANO: {driver.yearTrailer || '---'}</span>
               </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DA PÁGINA 1 */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 'bold' }}>ESTE DOCUMENTO É PARA USO EXCLUSIVO DA ALS TRANSPORTES E PARCEIROS OPERACIONAIS.</p>
        </div>
      </div>

      {/* PÁGINA 2: ANEXO CNH (SE EXISTIR) */}
      {driver.cnhPdfUrl && (
        <div 
          id={`driver-cnh-attachment-${driver.id}`}
          style={{ 
            width: '794px', 
            height: '1123px', 
            padding: '50px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ borderBottom: '1px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 900 }}>ANEXO: DOCUMENTO CNH - {driver.name}</p>
          </div>
          <div style={{ width: '100%', height: 'calc(100% - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: '20px', overflow: 'hidden' }}>
             {/* Como é um DataURL, podemos renderizar como imagem para o PDF */}
             <img src={driver.cnhPdfUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfileTemplate;

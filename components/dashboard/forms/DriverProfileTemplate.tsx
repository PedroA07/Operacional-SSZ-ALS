
import React from 'react';
import { Driver, DeliveryPost } from '../../../types';

interface DriverProfileTemplateProps {
  driver: Driver;
  visibility: {
    driverInfo: boolean;
    contacts: boolean;
    equipment: boolean;
    type: boolean;
    beneficiary: boolean;
    whatsapp: boolean;
    operations: boolean;
    portal: boolean;
  };
  delivery?: {
    posts: DeliveryPost[];
    note?: string;
  };
}

const C = {
  navy: '#0f172a',
  blue: '#1d4ed8',
  blueLight: '#eff6ff',
  green: '#059669',
  greenLight: '#ecfdf5',
  slate: '#64748b',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate50: '#f8fafc',
};

const DriverProfileTemplate: React.FC<DriverProfileTemplateProps> = ({ driver, visibility, delivery }) => {
  const border = `1px solid ${C.slate200}`;

  // Rótulo de campo
  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{ fontSize: '8px', fontWeight: 900, color: C.slate400, letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}>{children}</p>
  );

  // Cabeçalho de seção com barra de destaque
  const SectionTitle: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.blue }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <span style={{ width: '4px', height: '16px', backgroundColor: color, borderRadius: '4px', display: 'inline-block' }} />
      <h4 style={{ fontSize: '11px', fontWeight: 900, color: color, letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}>{children}</h4>
    </div>
  );

  const platesHorse = (driver.platesHorse && driver.platesHorse.length > 0)
    ? driver.platesHorse
    : (driver.plateHorse ? [{ id: 'h', plate: driver.plateHorse, year: driver.yearHorse || '', isPrimary: true }] : []);
  const platesTrailer = (driver.platesTrailer && driver.platesTrailer.length > 0)
    ? driver.platesTrailer
    : (driver.plateTrailer ? [{ id: 't', plate: driver.plateTrailer, year: driver.yearTrailer || '', isPrimary: true }] : []);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <div
        id={`driver-profile-card-${driver.id}`}
        style={{
          width: '794px',
          minHeight: '1123px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* CABEÇALHO */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '30px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '54px', height: '54px', backgroundColor: '#ffffff', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxSizing: 'border-box' }}>
              <img src="/logo.jpg" alt="ALS" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} />
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', letterSpacing: '3px', margin: 0 }}>ALS TRANSPORTES</p>
              <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#93c5fd', marginTop: '3px', letterSpacing: '1px' }}>FICHA CADASTRAL DE MOTORISTA · USO OPERACIONAL</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '12px' }}>
            <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#93c5fd', margin: 0, letterSpacing: '1px' }}>DATA DE EMISSÃO</p>
            <p style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', margin: '2px 0 0' }}>{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ padding: '36px 50px', display: 'flex', flexDirection: 'column', gap: '26px', flex: 1 }}>

          {/* HERO: FOTO + IDENTIFICAÇÃO */}
          {visibility.driverInfo && (
            <div style={{ display: 'flex', gap: '26px' }}>
              <div style={{ width: '170px', height: '220px', border: `3px solid ${C.slate200}`, borderRadius: '18px', overflow: 'hidden', backgroundColor: C.slate50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(15,23,42,0.08)' }}>
                {driver.photo
                  ? <img src={driver.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Motorista" />
                  : <span style={{ color: '#cbd5e1', fontWeight: 900, fontSize: '10px', textAlign: 'center' }}>FOTO NÃO<br />DISPONÍVEL</span>}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                <div style={{ borderBottom: border, paddingBottom: '10px' }}>
                  <Label>Nome Completo</Label>
                  <p style={{ fontSize: '22px', fontWeight: 900, color: C.navy, textTransform: 'uppercase', wordBreak: 'break-word', margin: '3px 0 0', lineHeight: 1.1 }}>{driver.name}</p>
                  {visibility.type && (
                    <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '10px', fontWeight: 900, backgroundColor: C.blue, color: '#fff', padding: '4px 12px', borderRadius: '20px', letterSpacing: '1px' }}>
                      {driver.driverType?.toUpperCase() || 'EXTERNO'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><Label>CPF</Label><p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0 0' }}>{driver.cpf}</p></div>
                  <div><Label>RG</Label><p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0 0' }}>{driver.rg || '---'}</p></div>
                  <div><Label>Registro CNH</Label><p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0 0' }}>{driver.cnh || '---'}</p></div>
                  <div>
                    <Label>Status</Label>
                    <p style={{ fontSize: '14px', fontWeight: 900, margin: '2px 0 0', color: driver.status === 'Ativo' ? C.green : '#dc2626' }}>{(driver.status || 'ATIVO').toUpperCase()}</p>
                  </div>
                </div>

                {driver.cnhPdfUrl && (
                  <div style={{ backgroundColor: C.greenLight, padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#047857', letterSpacing: '0.5px' }}>CNH ANEXADA NO DOSSIÊ DIGITAL</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOCAL DE ENTREGA DE DOCUMENTOS — DESTAQUE */}
          {delivery && (delivery.posts.length > 0 || (delivery.note && delivery.note.trim())) && (
            <div style={{ border: '2px solid #f59e0b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(245,158,11,0.15)' }}>
              <div style={{ backgroundColor: '#f59e0b', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', letterSpacing: '1px' }}>ENTREGA DOS DOCUMENTOS</span>
              </div>
              <div style={{ padding: '18px', backgroundColor: '#fffbeb' }}>
                {delivery.note && delivery.note.trim() && (
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e', margin: '0 0 14px', lineHeight: 1.4 }}>{delivery.note}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: delivery.posts.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {delivery.posts.map(post => (
                    <div key={post.id} style={{ backgroundColor: '#ffffff', border: '1px solid #fcd34d', borderRadius: '12px', padding: '12px 14px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>{post.name}</p>
                      {(post.address || post.city) && (
                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', margin: '4px 0 0', textTransform: 'uppercase' }}>
                          {[post.address, post.neighborhood, [post.city, post.state].filter(Boolean).join(' - ')].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {post.phone && <span style={{ fontSize: '10px', fontWeight: 900, color: '#b45309' }}>☎ {post.phone}</span>}
                        {post.hours && <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e', textTransform: 'uppercase' }}>{post.hours}</span>}
                      </div>
                      {post.notes && <p style={{ fontSize: '9px', color: '#a16207', margin: '6px 0 0', fontStyle: 'italic' }}>{post.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTATO */}
          {visibility.contacts && (
            <div>
              <SectionTitle>Contatos Diretos</SectionTitle>
              <div style={{ padding: '18px', border: border, borderRadius: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: C.slate50 }}>
                <div><Label>Telefone Principal</Label><p style={{ fontSize: '15px', fontWeight: 900, color: C.blue, margin: '3px 0 0' }}>{driver.phone}</p></div>
                <div><Label>E-mail</Label><p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'lowercase', margin: '3px 0 0', wordBreak: 'break-word' }}>{driver.email || 'NÃO INFORMADO'}</p></div>
              </div>
            </div>
          )}

          {/* EQUIPAMENTO */}
          {visibility.equipment && (
            <div>
              <SectionTitle>Dados do Equipamento</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', border: border, borderRadius: '14px' }}>
                  <Label>Cavalo Mecânico {platesHorse.length > 1 ? `(${platesHorse.length} placas)` : ''}</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {platesHorse.length === 0 && <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold' }}>---</span>}
                    {platesHorse.map((p, i) => (
                      <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>{p.plate}{p.isPrimary && platesHorse.length > 1 ? ' ★' : ''}</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: C.slate }}>ANO {p.year || '---'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '16px', border: border, borderRadius: '14px' }}>
                  <Label>Carreta / Implemento {platesTrailer.length > 1 ? `(${platesTrailer.length} placas)` : ''}</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {platesTrailer.length === 0 && <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold' }}>---</span>}
                    {platesTrailer.map((p, i) => (
                      <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>{p.plate}{p.isPrimary && platesTrailer.length > 1 ? ' ★' : ''}</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: C.slate }}>ANO {p.year || '---'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BENEFICIÁRIO */}
          {visibility.beneficiary && (
            <div>
              <SectionTitle color={C.green}>Dados do Beneficiário (Pagamento)</SectionTitle>
              <div style={{ padding: '18px', border: border, borderRadius: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: C.greenLight }}>
                <div><Label>Nome Completo</Label><p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0' }}>{driver.beneficiaryName || driver.name}</p></div>
                <div><Label>CPF / CNPJ</Label><p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0' }}>{driver.beneficiaryCnpj || driver.cpf}</p></div>
                <div><Label>Forma Preferencial</Label><p style={{ fontSize: '13px', fontWeight: 900, margin: '2px 0 0', color: C.green }}>{driver.paymentPreference || 'PIX'}</p></div>
                <div><Label>E-mail / Chave</Label><p style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0 0', wordBreak: 'break-word' }}>{driver.beneficiaryEmail || '---'}</p></div>
              </div>
            </div>
          )}

          {/* WHATSAPP */}
          {visibility.whatsapp && driver.whatsappGroupLink && (
            <div style={{ padding: '16px 18px', border: '1px dashed #10b981', borderRadius: '14px', backgroundColor: '#f0fdf4' }}>
              <Label>Comunicação Interna (WhatsApp)</Label>
              <p style={{ fontSize: '13px', fontWeight: 900, color: '#166534', margin: '4px 0 0' }}>{driver.whatsappGroupName || 'OPERACIONAL ALS'}</p>
            </div>
          )}

          {/* PORTAL */}
          {visibility.portal && (
            <div style={{ padding: '22px', border: `2px solid #3b82f6`, borderRadius: '16px', backgroundColor: C.blueLight }}>
              <p style={{ fontSize: '10px', fontWeight: 900, color: C.blue, marginBottom: '14px', textAlign: 'center', letterSpacing: '1px', marginTop: 0 }}>ACESSO AO PORTAL DO MOTORISTA ALS</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '70px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Label>Usuário (CPF)</Label>
                  <p style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0 0' }}>{(driver.cpf || '').replace(/\D/g, '')}</p>
                </div>
                <div style={{ width: '1px', backgroundColor: '#bfdbfe' }} />
                <div style={{ textAlign: 'center' }}>
                  <Label>Senha Padrão</Label>
                  <p style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0 0' }}>{driver.generatedPassword || 'als-2025'}</p>
                </div>
              </div>
            </div>
          )}

          {/* RODAPÉ */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '8px', color: C.slate400, fontWeight: 'bold', letterSpacing: '0.5px' }}>ESTE DOCUMENTO É PARA USO EXCLUSIVO DA ALS TRANSPORTES E PARCEIROS OPERACIONAIS.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfileTemplate;

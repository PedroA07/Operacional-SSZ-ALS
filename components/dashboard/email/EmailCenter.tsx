
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, EmailTemplate, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import EmailTemplateModal from './EmailTemplateModal';
import { reportGenerator } from '../../../utils/reportGenerator';

interface EmailCenterProps {
  user: User;
  trips: Trip[];
}

const EmailCenter: React.FC<EmailCenterProps> = ({ user, trips }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await db.getEmailTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, loadTemplates]);

  const handleCopyTemplate = async (template: EmailTemplate) => {
    try {
      // Se for o modelo Volkswagen (ou similar), usamos a lógica específica se necessário
      // Mas aqui vamos gerar uma tabela genérica baseada na config do template
      
      const now = new Date();
      const hour = now.getHours();
      let saudacao = 'Bom dia';
      if (hour >= 12 && hour < 18) saudacao = 'Boa tarde';
      else if (hour >= 18) saudacao = 'Boa noite';

      const dataAtual = now.toLocaleDateString('pt-BR');
      const horaAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const replaceVars = (text: string) => {
        if (!text) return '';
        return text
          .replace(/\{\{SAUDACAO\}\}/gi, saudacao)
          .replace(/\{\{DATA_ATUAL\}\}/gi, dataAtual)
          .replace(/\{\{HORA_ATUAL\}\}/gi, horaAtual);
      };

      const finalSubject = replaceVars(template.subject).toUpperCase();
      const finalBody = replaceVars(template.body);

      const headerStyle = `background-color: ${template.config.headerColor}; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; text-transform: uppercase;`;
      const cellStyle = `background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;
      const altCellStyle = `background-color: #f8fafc; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;

      let tableHtml = '';

      if (template.config.headerOrientation === 'horizontal') {
        tableHtml = `
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr>
                ${template.config.columns.map(col => `<th style="${headerStyle}">${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${trips.slice(0, 10).map((trip, idx) => `
                <tr>
                  ${template.config.columns.map(col => {
                    const style = template.config.alternateRowColor && idx % 2 !== 0 ? altCellStyle : cellStyle;
                    let value = '---';
                    if (col.toLowerCase().includes('motorista')) value = trip.driver.name;
                    if (col.toLowerCase().includes('placa')) value = trip.driver.plateHorse;
                    if (col.toLowerCase().includes('container')) value = trip.container || '---';
                    if (col.toLowerCase().includes('status')) value = trip.status;
                    if (col.toLowerCase().includes('data')) value = new Date(trip.dateTime).toLocaleDateString('pt-BR');
                    if (col.toLowerCase().includes('os')) value = trip.os;
                    if (col.toLowerCase().includes('cliente')) value = trip.customer.name;
                    return `<td style="${style}">${value.toUpperCase()}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        // Vertical orientation (like the VW one)
        tableHtml = trips.slice(0, 5).map(trip => `
          <table style="border-collapse: collapse; width: 400px; margin-bottom: 25px; table-layout: fixed;">
            ${template.config.columns.map((col, idx) => {
              const style = cellStyle;
              let value = '---';
              if (col.toLowerCase().includes('motorista')) value = trip.driver.name;
              if (col.toLowerCase().includes('placa')) value = trip.driver.plateHorse;
              if (col.toLowerCase().includes('container')) value = trip.container || '---';
              if (col.toLowerCase().includes('status')) value = trip.status;
              if (col.toLowerCase().includes('data')) value = new Date(trip.dateTime).toLocaleDateString('pt-BR');
              if (col.toLowerCase().includes('os')) value = trip.os;
              if (col.toLowerCase().includes('cliente')) value = trip.customer.name;
              
              return `
                <tr>
                  <td style="${headerStyle}; width: 140px;">${col.toUpperCase()}</td>
                  <td style="${style}">${value.toUpperCase()}</td>
                </tr>
              `;
            }).join('')}
          </table>
        `).join('');
      }

      const fullHtml = `
        <div style="font-family: Arial, sans-serif; color: #334155;">
          <p style="margin-bottom: 15px; font-weight: bold;">ASSUNTO: ${finalSubject}</p>
          <div style="white-space: pre-wrap; margin-bottom: 20px;">${finalBody}</div>
          ${tableHtml}
          <p style="margin-top: 30px; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Relatório gerado via ALS TRANSPORTES - ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `;

      const blobHtml = new Blob([fullHtml], { type: 'text/html' });
      const plainText = `${finalSubject}\n\n${finalBody}\n\n(Tabela de dados omitida no modo texto)`;
      const blobPlain = new Blob([plainText], { type: 'text/plain' });

      const clipboardData = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })];
      await navigator.clipboard.write(clipboardData);
      
      alert('Modelo copiado com sucesso para o clipboard!');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao copiar modelo.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Deseja excluir este modelo?')) {
      const success = await db.deleteEmailTemplate(id);
      if (success) loadTemplates();
    }
  };

  const handleEdit = (e: React.MouseEvent, t: EmailTemplate) => {
    e.stopPropagation();
    setSelectedTemplate(t);
    setIsTemplateModalOpen(true);
  };

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-xl transition-all border ${isOpen ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-900'}`}
        title="Modelos de E-mail"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-[420px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[300]">
          <div className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Modelos de E-mail</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Gestão de Comunicação ALS</p>
              </div>
              <button 
                onClick={() => { setSelectedTemplate(null); setIsTemplateModalOpen(true); }}
                className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-90"
                title="Novo Modelo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-6 space-y-4 bg-white min-h-[200px]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carregando Modelos...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                  <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2"/></svg>
                </div>
                <p className="text-[10px] text-slate-300 font-black uppercase italic">Nenhum modelo cadastrado</p>
                <button 
                  onClick={() => { setSelectedTemplate(null); setIsTemplateModalOpen(true); }}
                  className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                >
                  Criar meu primeiro modelo
                </button>
              </div>
            ) : (
              <>
                {/* Modelo Especial Volkswagen (Migrado) */}
                <div className="p-1 mb-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <div className="px-4 py-2 border-b border-blue-100">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Operações Especiais</span>
                  </div>
                  <button 
                    onClick={() => {
                      // Aqui chamamos a lógica original do CopyAllStatusesAction
                      // Para manter a compatibilidade total com o que o usuário já usa
                      const active = trips.filter(t => 
                        t.status !== 'Viagem concluída' && 
                        t.status !== 'Viagem cancelada' &&
                        t.status !== 'Container sobre rodas' &&
                        t.status !== 'Saiu da Volkswagen'
                      ).map(t => {
                        const history = [...(t.statusHistory || [])].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                        const getVal = (terms: string[]) => {
                          const h = [...history].reverse().find(entry => terms.some(term => entry.status.toLowerCase().trim() === term.toLowerCase().trim()));
                          return h ? reportGenerator.formatFullDate(h.dateTime) : "";
                        };
                        const predTime = new Date(Date.now() + 45 * 60000);
                        const formatFullPrediction = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                        let baixaValue = t.status === 'Viagem concluída' ? getVal(['Viagem concluída']) : (t.status === 'Container sobre rodas' || t.status === 'Saiu da Volkswagen' ? `CONTAINER SOBRE RODAS | PREVISÃO BAIXA: ${formatFullPrediction(predTime)}` : "");
                        
                        return {
                          id: t.id,
                          motorista: t.driver.name.toUpperCase(),
                          container: (t.container || "A DEFINIR").toUpperCase(),
                          retiradaCragea: getVal(['Saiu do Cragea', 'Chegou no Cragea', 'Retirada do cheio']),
                          chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
                          saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
                          baixaCragea: baixaValue
                        };
                      });

                      const finished = trips.filter(t => 
                        t.status === 'Viagem concluída' || 
                        t.status === 'Container sobre rodas' ||
                        t.status === 'Saiu da Volkswagen'
                      ).map(t => {
                        const history = [...(t.statusHistory || [])].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                        const getVal = (terms: string[]) => {
                          const h = [...history].reverse().find(entry => terms.some(term => entry.status.toLowerCase().trim() === term.toLowerCase().trim()));
                          return h ? reportGenerator.formatFullDate(h.dateTime) : "";
                        };
                        const predTime = new Date(Date.now() + 45 * 60000);
                        const formatFullPrediction = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                        let baixaValue = t.status === 'Viagem concluída' ? getVal(['Viagem concluída']) : (t.status === 'Container sobre rodas' || t.status === 'Saiu da Volkswagen' ? `CONTAINER SOBRE RODAS | PREVISÃO BAIXA: ${formatFullPrediction(predTime)}` : "");
                        
                        return {
                          id: t.id,
                          motorista: t.driver.name.toUpperCase(),
                          container: (t.container || "A DEFINIR").toUpperCase(),
                          retiradaCragea: getVal(['Saiu do Cragea', 'Chegou no Cragea', 'Retirada do cheio']),
                          chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
                          saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
                          baixaCragea: baixaValue
                        };
                      });

                      const html = reportGenerator.generateFullReportHTML(active, finished);
                      const plain = reportGenerator.generatePlainText(active, finished);
                      const blobHtml = new Blob([html], { type: 'text/html' });
                      const blobPlain = new Blob([plain], { type: 'text/plain' });
                      navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })]);
                      alert('Relatório Volkswagen copiado com sucesso!');
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-5 hover:bg-white rounded-[1.5rem] transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#001e50] rounded-xl flex items-center justify-center p-2 shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" alt="VW" className="brightness-0 invert" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight">Relatório Volkswagen</h5>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Cópia e Cola Padrão da Operação</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Meus Modelos</span>
                  {templates.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleCopyTemplate(t)}
                      className="w-full text-left p-5 bg-slate-50 border border-slate-100 rounded-[2rem] transition-all hover:bg-slate-100/80 group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.config.headerColor }}></div>
                          <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{t.config.headerOrientation}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => handleEdit(e, t)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                          <button onClick={(e) => handleDelete(e, t.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                        </div>
                      </div>
                      <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{t.name}</h5>
                      <p className="text-[9px] text-slate-500 font-medium mt-1 leading-snug line-clamp-1">{t.subject}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-tighter">Colunas: <span className="text-slate-600">{t.config.columns.length}</span></span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-blue-500 uppercase">Clique para Copiar</span>
                          <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="3"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <EmailTemplateModal 
        isOpen={isTemplateModalOpen} 
        onClose={() => { setIsTemplateModalOpen(false); setSelectedTemplate(null); }} 
        onSuccess={loadTemplates}
        template={selectedTemplate}
        user={user}
      />
    </div>
  );
};

export default EmailCenter;

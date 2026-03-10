import React, { useState, useEffect } from 'react';
import { EmailTemplate, Trip, EmailTableConfig } from '../../../types';

interface EmailGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate;
  trips: Trip[];
}

const EmailGeneratorModal: React.FC<EmailGeneratorModalProps> = ({ isOpen, onClose, template, trips }) => {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [tableData, setTableData] = useState<{ [tableId: string]: Trip[] }>({});
  const [searchTerm, setSearchTerm] = useState<{ [tableId: string]: string }>({});

  // Ensure template has tables
  const tables: EmailTableConfig[] = template.config.tables || [{
    id: 'default',
    title: 'Tabela Principal',
    headerColor: template.config.headerColor || '#1e293b',
    headerOrientation: template.config.headerOrientation || 'horizontal',
    alternateRowColor: template.config.alternateRowColor || false,
    columns: template.config.columns || []
  }];

  useEffect(() => {
    if (isOpen) {
      setSubject(template.subject);
      setBody(template.body);
      setTableData({});
      setSearchTerm({});
    }
  }, [isOpen, template]);

  const replaceVars = (text: string) => {
    if (!text) return '';
    const now = new Date();
    const hour = now.getHours();
    let saudacao = 'Bom dia';
    if (hour >= 12 && hour < 18) saudacao = 'Boa tarde';
    else if (hour >= 18) saudacao = 'Boa noite';

    const dataAtual = now.toLocaleDateString('pt-BR');
    const horaAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return text
      .replace(/\{\{SAUDACAO\}\}/gi, saudacao)
      .replace(/\{\{DATA_ATUAL\}\}/gi, dataAtual)
      .replace(/\{\{HORA_ATUAL\}\}/gi, horaAtual);
  };

  const handleAddTrip = (tableId: string, trip: Trip) => {
    setTableData(prev => {
      const current = prev[tableId] || [];
      if (current.find(t => t.id === trip.id)) return prev;
      return { ...prev, [tableId]: [...current, trip] };
    });
    setSearchTerm(prev => ({ ...prev, [tableId]: '' }));
  };

  const handleRemoveTrip = (tableId: string, tripId: string) => {
    setTableData(prev => ({
      ...prev,
      [tableId]: (prev[tableId] || []).filter(t => t.id !== tripId)
    }));
  };

  const getCellValue = (col: string, trip: Trip) => {
    let value = '---';
    const c = col.toLowerCase();
    
    // Status com data e hora: "Status: [Nome do Status]"
    if (c.startsWith('status:')) {
      const targetStatus = col.substring(7).trim().toLowerCase();
      const historyEntry = trip.statusHistory?.find(h => h.status.toLowerCase() === targetStatus);
      if (historyEntry) {
        value = `${historyEntry.status} - ${new Date(historyEntry.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
      }
    } 
    // Previsão automática: "Previsão: [Nome do Status] + [X]h" ou "Previsão: [Nome do Status] + [X]m"
    else if (c.startsWith('previsão:') || c.startsWith('previsao:')) {
      const content = col.substring(9).trim();
      const plusIndex = content.lastIndexOf('+');
      if (plusIndex !== -1) {
        const targetStatus = content.substring(0, plusIndex).trim().toLowerCase();
        const addAmountStr = content.substring(plusIndex + 1).trim().toLowerCase();
        const historyEntry = trip.statusHistory?.find(h => h.status.toLowerCase() === targetStatus);
        if (historyEntry) {
          const baseDate = new Date(historyEntry.dateTime);
          let addMs = 0;
          if (addAmountStr.endsWith('h')) {
            addMs = parseFloat(addAmountStr.replace('h', '')) * 60 * 60 * 1000;
          } else if (addAmountStr.endsWith('m')) {
            addMs = parseFloat(addAmountStr.replace('m', '')) * 60 * 1000;
          }
          if (addMs > 0) {
            const predictedDate = new Date(baseDate.getTime() + addMs);
            value = predictedDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
          }
        }
      }
    }
    // Status Atual com data e hora
    else if (c === 'status atual') {
      const lastHistory = trip.statusHistory?.[trip.statusHistory.length - 1];
      if (lastHistory) {
        value = `${trip.status} - ${new Date(lastHistory.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
      } else {
        value = trip.status || '---';
      }
    }
    else if (c.includes('motorista')) value = trip.driver?.name || '---';
    else if (c.includes('placa')) value = trip.driver?.plateHorse || '---';
    else if (c.includes('container')) value = trip.container || '---';
    else if (c.includes('status') || c.includes('programação') || c.includes('programaçao') || c.includes('programacao')) value = trip.status || '---';
    else if (c.includes('data')) value = new Date(trip.dateTime).toLocaleDateString('pt-BR');
    else if (c.includes('os')) value = trip.os || '---';
    else if (c.includes('cliente')) value = trip.customer?.name || '---';
    else if (c.includes('booking') || c.includes('reserva')) value = trip.booking || '---';
    
    return value.toUpperCase();
  };

  const generateHtml = () => {
    const finalSubject = replaceVars(subject).toUpperCase();
    const finalBody = replaceVars(body);

    let tablesHtml = '';

    tables.forEach(table => {
      const data = tableData[table.id] || [];
      if (data.length === 0) return;

      const headerStyle = `background-color: ${table.headerColor}; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; text-transform: uppercase;`;
      const cellStyle = `background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;
      const altCellStyle = `background-color: #f8fafc; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;

      if (table.title) {
        tablesHtml += `<h3 style="font-family: Arial, sans-serif; color: #1e293b; margin-top: 25px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${table.title}</h3>`;
      }

      if (table.headerOrientation === 'horizontal') {
        tablesHtml += `
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <thead>
              <tr>
                ${table.columns.map(col => `<th style="${headerStyle}">${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map((trip, idx) => `
                <tr>
                  ${table.columns.map(col => {
                    const style = table.alternateRowColor && idx % 2 !== 0 ? altCellStyle : cellStyle;
                    const value = getCellValue(col, trip);
                    return `<td style="${style}">${value}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        tablesHtml += data.map(trip => `
          <table style="border-collapse: collapse; width: 400px; margin-bottom: 25px; table-layout: fixed;">
            ${table.columns.map((col, idx) => {
              const style = cellStyle;
              const value = getCellValue(col, trip);
              
              return `
                <tr>
                  <td style="${headerStyle}; width: 140px;">${col.toUpperCase()}</td>
                  <td style="${style}">${value}</td>
                </tr>
              `;
            }).join('')}
          </table>
        `).join('');
      }
    });

    return `
      <div style="font-family: Arial, sans-serif; color: #334155;">
        <p style="margin-bottom: 15px; font-weight: bold;">ASSUNTO: ${finalSubject}</p>
        <div style="white-space: pre-wrap; margin-bottom: 20px;">${finalBody}</div>
        ${tablesHtml}
        <p style="margin-top: 30px; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Relatório gerado via ALS TRANSPORTES - ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    `;
  };

  const handleCopy = async () => {
    try {
      const html = generateHtml();
      const plainText = `${replaceVars(subject).toUpperCase()}\n\n${replaceVars(body)}\n\n(Tabelas omitidas no modo texto)`;
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plainText], { type: 'text/plain' });
      
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })]);
      alert('E-mail copiado com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao copiar e-mail.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Gerar E-mail: {template.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Preencha os dados para gerar o e-mail</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Edit Content & Add Data */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assunto Final</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 outline-none"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Corpo do E-mail</label>
                  <textarea 
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:border-blue-500 outline-none resize-none"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                  />
                </div>
              </div>

              {tables.map((table, tIdx) => (
                <div key={table.id || tIdx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{table.title || 'Tabela'}</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">
                      {(tableData[table.id] || []).length} Registros
                    </span>
                  </div>
                  
                  <div className="space-y-2 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Adicionar Viagem (OS ou Container)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 outline-none"
                      placeholder="Digite a OS ou Container..."
                      value={searchTerm[table.id] || ''}
                      onChange={e => setSearchTerm(prev => ({ ...prev, [table.id]: e.target.value }))}
                    />
                    
                    {/* Search Results Dropdown */}
                    {(searchTerm[table.id] || '').length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10">
                        {trips.filter(t => 
                          t.os.toLowerCase().includes(searchTerm[table.id].toLowerCase()) || 
                          (t.container && t.container.toLowerCase().includes(searchTerm[table.id].toLowerCase()))
                        ).slice(0, 10).map(trip => (
                          <button
                            key={trip.id}
                            onClick={() => handleAddTrip(table.id, trip)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <div className="text-[10px] font-black text-slate-800 uppercase">{trip.os}</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase">{trip.container || 'SEM CONTAINER'} - {trip.status}</div>
                            </div>
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Trips */}
                  {(tableData[table.id] || []).length > 0 && (
                    <div className="space-y-2 mt-4">
                      {(tableData[table.id] || []).map(trip => (
                        <div key={trip.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] font-black text-slate-700 uppercase">{trip.os}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">{trip.status}</span>
                          </div>
                          <button onClick={() => handleRemoveTrip(table.id, trip.id)} className="text-slate-400 hover:text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Column: Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-900 border-b border-slate-800">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Pré-visualização do E-mail</h4>
              </div>
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div dangerouslySetInnerHTML={{ __html: generateHtml() }} />
              </div>
            </div>
          </div>
        </div>

        <footer className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleCopy}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar E-mail
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailGeneratorModal;

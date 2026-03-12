import React, { useState, useEffect, useRef } from 'react';
import { EmailTemplate, Trip, EmailTableConfig } from '../../../types';
import { showToast } from '../../shared/SimpleToast';

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // Ensure template has tables
  const tables: EmailTableConfig[] = template.config.tables || [{
    id: 'default',
    title: 'Tabela Principal',
    headerColor: template.config.headerColor || '#1e293b',
    headerOrientation: template.config.headerOrientation || 'horizontal',
    alternateRowColor: template.config.alternateRowColor || false,
    columns: template.config.columns || []
  }];

  const replaceVars = (text: string, trip?: Trip, rowIndex?: number, totalRows?: number) => {
    if (!text) return '';
    const now = new Date();
    const hour = now.getHours();
    let saudacao = 'Bom dia';
    if (hour >= 12 && hour < 18) saudacao = 'Boa tarde';
    else if (hour >= 18) saudacao = 'Boa noite';

    const dataAtual = now.toLocaleDateString('pt-BR');
    const horaAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let result = text
      .replace(/\{\{SAUDACAO\}\}/gi, saudacao)
      .replace(/\{\{DATA_ATUAL\}\}/gi, dataAtual)
      .replace(/\{\{HORA_ATUAL\}\}/gi, horaAtual);

    if (trip) {
      // 1. Processa todas as variáveis normais (que não são SE) primeiro
      result = result.replace(/\{\{(?!SE\()([^}]+)\}\}/gi, (match, p1) => {
        const val = getCellValue(p1.trim(), trip, rowIndex, totalRows);
        return val !== '---' ? val : '';
      });

      // 2. Processamento de condições SE aninhadas (de dentro para fora)
      // Suporta: {{SE(condicao) texto_se_sim SENAO SE(condicao2) texto2 SENAO texto_final}}
      let hasSe = true;
      let safetyCounter = 0;
      while (hasSe && safetyCounter < 50) {
        safetyCounter++;
        // Busca o SE mais interno (aquele que não contém outro {{SE( dentro de si)
        const innermostSeRegex = /\{\{SE\(([^)]+)\)((?:(?!\{\{SE\()[\s\S])*?)\}\}/i;
        const match = result.match(innermostSeRegex);
        
        if (!match) {
          hasSe = false;
          break;
        }

        const initialCondition = match[1].trim();
        const fullContent = match[2];
        
        // Divide o conteúdo em blocos por SENAO
        const blocks: { condition?: string, text: string }[] = [];
        let remaining = fullContent;
        let currentCond = initialCondition;
        
        while (true) {
          // Busca o próximo SENAO
          const senaoMatch = remaining.match(/SENAO\s+/i);
          if (!senaoMatch) {
            blocks.push({ condition: currentCond, text: remaining });
            break;
          }
          
          const senaoIndex = senaoMatch.index!;
          blocks.push({ condition: currentCond, text: remaining.substring(0, senaoIndex) });
          
          remaining = remaining.substring(senaoIndex + senaoMatch[0].length).trim();
          
          // Verifica se é um SENAO SE(...)
          if (remaining.toUpperCase().startsWith('SE(')) {
            const nextSeMatch = remaining.match(/^SE\(([^)]+)\)/i);
            if (nextSeMatch) {
              currentCond = nextSeMatch[1];
              remaining = remaining.substring(nextSeMatch[0].length).trim();
            } else {
              blocks.push({ text: remaining });
              break;
            }
          } else {
            // É o SENAO final
            blocks.push({ text: remaining });
            break;
          }
        }
        
        // Avalia qual bloco deve ser usado
        let replacement = '';
        for (const block of blocks) {
          if (!block.condition) {
            replacement = block.text;
            break;
          }
          
          // A condição pode já ter sido resolvida no passo 1, ou pode ser uma fórmula complexa
          // Resolvemos novamente caso tenha sobrado algo
          const resolvedCondition = block.condition.replace(/\{\{([^}]+)\}\}/g, (m, p1) => {
            return getCellValue(p1.trim(), trip, rowIndex, totalRows);
          });
          
          const condValue = getCellValue(resolvedCondition, trip, rowIndex, totalRows);
          if (condValue && condValue !== '---' && condValue.trim() !== '' && condValue.trim().toUpperCase() !== 'NAO') {
            replacement = block.text;
            break;
          }
        }
        
        // Substitui o bloco SE processado no resultado
        result = result.substring(0, match.index) + replacement + result.substring(match.index! + match[0].length);
      }
    }

    return result;
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

  const getCellValue = (col: string, trip: Trip, rowIndex?: number, totalRows?: number) => {
    const formulas = col.split(/\s+ou\s+|\|/i).map(s => s.trim());
    
    for (const formula of formulas) {
      const c = formula.toLowerCase();
      let value = '';

      // Status com data e hora: "Status: [Nome do Status]" ou "Status: [Nome] [Index]"
      if (c.startsWith('status:')) {
        let targetStatusFull = formula.substring(7).trim();
        
        // Remove colchetes se existirem: [Status] -> Status ou [Status] 2 -> Status 2
        targetStatusFull = targetStatusFull.replace(/\[|\]/g, '').trim();

        let index = 1;
        
        // Verifica se há um índice no final (ex: "Status: Chegou no cliente 2")
        const parts = targetStatusFull.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (parts.length > 1 && /^\d+$/.test(lastPart)) {
          index = parseInt(lastPart);
          targetStatusFull = parts.slice(0, -1).join(' ');
        }

        const targetStatus = targetStatusFull.toLowerCase();
        const matches = trip.statusHistory?.filter(h => h.status.toLowerCase() === targetStatus) || [];
        
        // Ordena por data (mais antigo primeiro) para respeitar a prioridade solicitada
        const sortedMatches = [...matches].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        
        const historyEntry = sortedMatches[index - 1];
        if (historyEntry) {
          value = `${historyEntry.status} - ${new Date(historyEntry.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
        }
      } 
      // Previsão automática: "Previsão: [Nome do Status] + [X]h" ou "Previsão: Status: [Nome] + [X]m"
      else if (c.startsWith('previsão:') || c.startsWith('previsao:')) {
        const content = formula.substring(9).trim();
        const plusIndex = content.lastIndexOf('+');
        
        let statusPart = content;
        let addAmountStr = '';

        if (plusIndex !== -1) {
          statusPart = content.substring(0, plusIndex).trim();
          addAmountStr = content.substring(plusIndex + 1).trim().toLowerCase();
        }
        
        // Remove colchetes e prefixo "Status:" se existirem
        statusPart = statusPart.replace(/\[|\]/g, '').trim();
        if (statusPart.toLowerCase().startsWith('status:')) {
          statusPart = statusPart.substring(7).trim();
        }

        let index = 1;
        const parts = statusPart.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (parts.length > 1 && /^\d+$/.test(lastPart)) {
          index = parseInt(lastPart);
          statusPart = parts.slice(0, -1).join(' ');
        }

        const targetStatus = statusPart.toLowerCase();
        const matches = trip.statusHistory?.filter(h => h.status.toLowerCase() === targetStatus) || [];
        const sortedMatches = [...matches].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        
        const historyEntry = sortedMatches[index - 1];
        if (historyEntry) {
          const baseDate = new Date(historyEntry.dateTime);
          let addMs = 0;
          if (addAmountStr.endsWith('h')) {
            addMs = parseFloat(addAmountStr.replace('h', '')) * 60 * 60 * 1000;
          } else if (addAmountStr.endsWith('m')) {
            addMs = parseFloat(addAmountStr.replace('m', '')) * 60 * 1000;
          }
          
          const finalDate = new Date(baseDate.getTime() + addMs);
          return finalDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
      }
      // Status Atual com data e hora
      else if (c === 'status atual') {
        const lastHistory = trip.statusHistory?.[trip.statusHistory.length - 1];
        if (lastHistory) {
          value = `${trip.status} - ${new Date(lastHistory.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
        } else {
          value = trip.status || '';
        }
      }
      else if (c.includes('cpf motorista') || c.includes('cpf')) value = trip.driver?.cpf || '';
      else if (c.includes('telefone') || c.includes('celular') || c.includes('contato')) value = trip.driver?.phone || '';
      else if (c.includes('placa cavalo') || c.includes('cavalo') || c === 'placa') value = trip.driver?.plateHorse || '';
      else if (c.includes('placa carreta') || c.includes('carreta')) value = trip.driver?.plateTrailer || '';
      else if (c.includes('motorista')) value = trip.driver?.name || '';
      else if (c.includes('container')) value = trip.container || '';
      else if (c.includes('status') || c.includes('programação') || c.includes('programaçao') || c.includes('programacao')) value = trip.status || '';
      else if (c.includes('data')) value = new Date(trip.dateTime).toLocaleDateString('pt-BR');
      else if (c === 'os' || c === 'o.s' || c === 'ordem de serviço' || c === 'ordem de servico') value = trip.os || '';
      else if (c.includes('cnpj cliente')) value = trip.customer?.cnpj || '';
      else if (c.includes('cliente')) value = trip.customer?.name || '';
      else if (c.includes('cnpj porto') || c.includes('cnpj prestacking') || c.includes('cnpj terminal')) value = trip.destination?.cnpj || trip.preStackingFormData?.cnpj || '';
      else if (c.includes('booking') || c.includes('reserva')) value = trip.booking || trip.ocFormData?.booking || trip.preStackingFormData?.booking || '';
      else if (c.includes('navio')) value = trip.ship || trip.ocFormData?.ship || trip.preStackingFormData?.ship || '';
      else if (c.includes('nf') || c.includes('nota')) value = trip.ocFormData?.nf || trip.preStackingFormData?.nf || '';
      else if (c.includes('tara')) value = trip.tara || trip.ocFormData?.tara || trip.preStackingFormData?.tara || '';
      else if (c.includes('lacre') || c.includes('seal')) value = trip.seal || trip.ocFormData?.seal || trip.preStackingFormData?.seal || '';
      else if (c.includes('tipo')) value = trip.containerType || trip.ocFormData?.tipo || trip.preStackingFormData?.tipo || '';
      else if (c.includes('destino') || c.includes('entrega')) value = trip.destination?.name || trip.scheduling?.location || '';
      else if (c.includes('origem') || c.includes('coleta')) value = trip.customer?.name || '';
      else if (c === 'quantidade linhas' || c === 'quantidade de linhas' || c === 'qtd linhas') value = totalRows !== undefined ? String(totalRows).padStart(2, '0') : '';
      else if (c === 'linha') value = rowIndex !== undefined ? String(rowIndex + 1).padStart(2, '0') : '';
      else if (c === 'viagem atual' || c === 'viagem atual count') {
        const driverTrips = trips.filter(t => t.driver?.id === trip.driver?.id && t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada')
                                 .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        const tripIndex = driverTrips.findIndex(t => t.id === trip.id);
        if (c === 'viagem atual') {
          value = tripIndex === 0 ? 'SIM' : '';
        } else {
          value = tripIndex >= 0 ? String(tripIndex + 1) : '';
        }
      }

      if (value && value !== '---') {
        return value.toUpperCase();
      }
    }
    
    return '---';
  };

  useEffect(() => {
    if (isOpen) {
      setSubject(template.subject);
      setBody(template.body);
      setSearchTerm({});
      setAttachments([]);

      const initialTableData: { [tableId: string]: Trip[] } = {};
      
      tables.forEach(table => {
        initialTableData[table.id] = [];
        
        if (table.autoFilter && table.autoFilter.trim() !== '') {
          const filterStr = table.autoFilter.trim();
          let operator = '';
          if (filterStr.includes('!=')) operator = '!=';
          else if (filterStr.includes('=')) operator = '=';
          else if (filterStr.toLowerCase().includes(' contém ')) operator = 'contém';
          else if (filterStr.toLowerCase().includes(' contem ')) operator = 'contem';
          else if (filterStr.toLowerCase().includes(' em ')) operator = 'em';

          if (operator) {
            const parts = filterStr.split(new RegExp(`\\s*(?:!=|=|contém|contem|em)\\s*`, 'i'));
            if (parts.length === 2) {
              const leftExpr = parts[0].trim();
              const rightValue = parts[1].trim().toLowerCase();

              trips.forEach(trip => {
                let leftValue = '';
                if (leftExpr.startsWith('{{') && leftExpr.endsWith('}}')) {
                  const varName = leftExpr.substring(2, leftExpr.length - 2);
                  leftValue = getCellValue(varName, trip).toLowerCase();
                } else {
                  leftValue = replaceVars(leftExpr, trip).toLowerCase();
                }

                let matches = false;
                if (operator === '=') matches = leftValue === rightValue;
                else if (operator === '!=') matches = leftValue !== rightValue;
                else if (operator === 'contém' || operator === 'contem') matches = leftValue.includes(rightValue);
                else if (operator === 'em') {
                  const options = rightValue.split(',').map(s => s.trim());
                  matches = options.includes(leftValue);
                }

                if (matches) {
                  initialTableData[table.id].push(trip);
                }
              });
            }
          }
        } else {
          // If no autoFilter, add all selected trips to this table
          initialTableData[table.id] = [...trips];
        }
      });

      setTableData(initialTableData);
    }
  }, [isOpen, template, trips]);

  const generateHtml = () => {
    const firstTrip = Object.values(tableData).flat()[0];
    const totalRows = Object.values(tableData).flat().length;
    let finalBody = replaceVars(body, firstTrip, undefined, totalRows);

    let tablesHtml = '';

    tables.forEach(table => {
      const data = tableData[table.id] || [];
      
      // If table has no data, remove its placeholder from the body and skip
      if (data.length === 0) {
        const placeholderRegex = new RegExp(`\\{\\{TABELA:\\s*${table.title}\\}\\}`, 'gi');
        finalBody = finalBody.replace(placeholderRegex, '');
        return;
      }

      const headerStyle = `background-color: ${table.headerColor}; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; text-transform: uppercase;`;
      const cellStyle = `background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;
      const altCellStyle = `background-color: #f8fafc; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;

      let tableHtml = '';

      if (table.title) {
        tableHtml += `<h3 style="font-family: Arial, sans-serif; color: #1e293b; margin-top: 25px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${table.title}</h3>`;
      }

      if (table.headerOrientation === 'horizontal') {
        tableHtml += `
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
                    const customCell = table.customCells?.[col];
                    const value = customCell 
                      ? (customCell.includes('{{') ? replaceVars(customCell, trip, idx, totalRows) : getCellValue(customCell, trip, idx, totalRows))
                      : getCellValue(col, trip, idx, totalRows);
                    return `<td style="${style}">${value}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        tableHtml += data.map((trip, idx) => `
          <table style="border-collapse: collapse; width: 400px; margin-bottom: 25px; table-layout: fixed;">
            ${table.columns.map((col) => {
              const style = cellStyle;
              const customCell = table.customCells?.[col];
              const value = customCell 
                ? (customCell.includes('{{') ? replaceVars(customCell, trip, idx, totalRows) : getCellValue(customCell, trip, idx, totalRows))
                : getCellValue(col, trip, idx, totalRows);
              
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

      // Check if there is a placeholder for this table in the body
      const placeholderRegex = new RegExp(`\\{\\{TABELA:\\s*${table.title}\\}\\}`, 'gi');
      if (placeholderRegex.test(finalBody)) {
        finalBody = finalBody.replace(placeholderRegex, tableHtml);
      } else {
        tablesHtml += tableHtml;
      }
    });

    return `
      <div style="font-family: Arial, sans-serif; color: #334155;">
        <div style="white-space: pre-wrap; margin-bottom: 20px;">${finalBody}</div>
        ${tablesHtml}
      </div>
    `;
  };

  const handleCopySubject = async () => {
    try {
      const firstTrip = Object.values(tableData).flat()[0];
      const totalRows = Object.values(tableData).flat().length;
      const finalSubject = replaceVars(subject, firstTrip, undefined, totalRows).toUpperCase();
      await navigator.clipboard.writeText(finalSubject);
      showToast('Assunto copiado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao copiar assunto.', 'error');
    }
  };

  const handleCopyBody = async () => {
    try {
      if (!previewRef.current) return;
      const html = previewRef.current.innerHTML;
      const plainText = previewRef.current.innerText;
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plainText], { type: 'text/plain' });
      
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })]);
      showToast('Corpo do e-mail copiado com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao copiar corpo do e-mail.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[85vw] max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
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
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assunto Final</label>
                    <button onClick={handleCopySubject} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">Copiar Assunto</button>
                  </div>
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
                
                {/* Attachments */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Anexos (Apenas visualização)</label>
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                          <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Adicionar Viagem (OS ou Container)</label>
                      <button 
                        onClick={() => {
                          const dummyTrip = { id: `dummy-${Date.now()}`, os: '', container: '', status: '', dateTime: new Date().toISOString() } as any;
                          handleAddTrip(table.id, dummyTrip);
                        }}
                        className="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                      >
                        + Linha Vazia
                      </button>
                    </div>
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
                            <span className="text-[10px] font-black text-slate-700 uppercase">{trip.os || 'LINHA VAZIA'}</span>
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
                <div 
                  ref={previewRef}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  className="outline-none"
                  dangerouslySetInnerHTML={{ __html: generateHtml() }} 
                />
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
            onClick={handleCopySubject}
            className="px-8 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar Assunto
          </button>
          <button 
            onClick={handleCopyBody}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar Corpo
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailGeneratorModal;

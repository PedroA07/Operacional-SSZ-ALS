import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EmailTemplate, Trip, EmailTableConfig } from '../../../types';
import { showToast } from '../../shared/SimpleToast';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import { AutocompleteItem } from '../../../utils/searchService';

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
  const [tableFilters, setTableFilters] = useState<{
    [tableId: string]: {
      date?: string;
      customer?: string;
      destination?: string;
      ship?: string;
      booking?: string;
    }
  }>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const uniqueCustomers = useMemo(() => {
    const customers = new Map();
    trips.forEach(t => {
      if (t.customer && t.customer.name) {
        customers.set(t.customer.name, t.customer.name);
      }
    });
    return Array.from(customers.values());
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    const dests = new Set<string>();
    trips.forEach(t => {
      if (t.destination?.name) dests.add(t.destination.name);
      if (t.scheduling?.location) dests.add(t.scheduling.location);
    });
    return Array.from(dests);
  }, [trips]);

  const uniqueShips = useMemo(() => {
    const ships = new Set<string>();
    trips.forEach(t => {
      if (t.ship) ships.add(t.ship);
      if (t.ocFormData?.ship) ships.add(t.ocFormData.ship);
      if (t.preStackingFormData?.ship) ships.add(t.preStackingFormData.ship);
    });
    return Array.from(ships);
  }, [trips]);

  const uniqueBookings = useMemo(() => {
    const bookings = new Set<string>();
    trips.forEach(t => {
      if (t.booking) bookings.add(t.booking);
      if (t.ocFormData?.booking) bookings.add(t.ocFormData.booking);
      if (t.preStackingFormData?.booking) bookings.add(t.preStackingFormData.booking);
    });
    return Array.from(bookings);
  }, [trips]);

  const mapStringItem = (item: string): AutocompleteItem => ({
    id: item,
    type: 'PORT', // Reusing PORT type as it has a simple layout
    mainText: item,
    originalData: item
  });

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
      // 1. Processa todas as variáveis normais (que não são SE, TABELA ou COLUNAS) primeiro
      result = result.replace(/\{\{(?!SE\(|TABELA:|COLUNAS:)([^}]+)\}\}/gi, (match, p1) => {
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

  const getCellValue = (col: string, trip: Trip, rowIndex?: number, totalRows?: number, fallback: string = '---') => {
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
    
    return fallback;
  };

  const evaluateCondition = (conditionStr: string, trip: Trip, rowIndex?: number, totalRows?: number): boolean => {
    if (!conditionStr || conditionStr.trim() === '') return true;
    
    // Suporte para múltiplas condições com ' ou ' (OR) ou '|' - Regex mais robusta
    const orRegex = /\s+ou\s+|\|/i;
    if (orRegex.test(conditionStr)) {
      const conditions = conditionStr.split(orRegex);
      return conditions.some(cond => {
        const trimmed = cond.trim();
        if (!trimmed) return false;
        return evaluateSingleCondition(trimmed, trip, rowIndex, totalRows);
      });
    }
    
    return evaluateSingleCondition(conditionStr, trip, rowIndex, totalRows);
  };

  const evaluateSingleCondition = (conditionStr: string, trip: Trip, rowIndex?: number, totalRows?: number): boolean => {
    const filterStr = conditionStr.trim();
    let operator = '';
    if (filterStr.includes('!=')) operator = '!=';
    else if (filterStr.includes('=')) operator = '=';
    else if (filterStr.toLowerCase().includes(' contém ')) operator = 'contém';
    else if (filterStr.toLowerCase().includes(' contem ')) operator = 'contem';
    else if (filterStr.toLowerCase().includes(' em ')) operator = 'em';

    if (!operator) return false;

    const parts = filterStr.split(new RegExp(`\\s*(?:!=|=|contém|contem|em)\\s*`, 'i'));
    if (parts.length !== 2) return false;

    const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const leftExpr = parts[0].trim();
    const rightValue = normalize(parts[1].trim());

    let leftValue = '';
    if (leftExpr.startsWith('{{') && leftExpr.endsWith('}}')) {
      const varName = leftExpr.substring(2, leftExpr.length - 2);
      leftValue = normalize(getCellValue(varName, trip, rowIndex, totalRows, ''));
    } else if (!leftExpr.includes('{{')) {
      // Se não tem chaves, assume que é o nome da variável diretamente
      leftValue = normalize(getCellValue(leftExpr, trip, rowIndex, totalRows, ''));
      // Se getCellValue retornar vazio (não encontrou), tenta replaceVars
      if (leftValue === '') {
        leftValue = normalize(replaceVars(leftExpr, trip, rowIndex, totalRows));
      }
    } else {
      leftValue = normalize(replaceVars(leftExpr, trip, rowIndex, totalRows));
    }

    if (operator === '=') return leftValue === rightValue;
    if (operator === '!=') return leftValue !== rightValue;
    if (operator === 'contém' || operator === 'contem') return leftValue.includes(rightValue);
    if (operator === 'em') {
      const options = rightValue.split(',').map(s => normalize(s.trim()));
      return options.includes(leftValue);
    }
    return false;
  };

  const handleApplyFilters = (tableId: string) => {
    const filters = tableFilters[tableId];
    if (!filters) return;

    let filteredTrips = [...trips];

    if (filters.date) {
      filteredTrips = filteredTrips.filter(t => {
        const tripDate = t.dateTime ? new Date(t.dateTime).toISOString().split('T')[0] : null;
        const scheduledDate = t.scheduledDateTime ? new Date(t.scheduledDateTime).toISOString().split('T')[0] : null;
        const schedulingDate = t.scheduling?.dateTime ? new Date(t.scheduling.dateTime).toISOString().split('T')[0] : null;
        
        return tripDate === filters.date || scheduledDate === filters.date || schedulingDate === filters.date;
      });
    }

    if (filters.customer) {
      filteredTrips = filteredTrips.filter(t => 
        t.customer?.name?.toLowerCase().includes(filters.customer!.toLowerCase())
      );
    }

    if (filters.destination) {
      filteredTrips = filteredTrips.filter(t => 
        t.destination?.name?.toLowerCase().includes(filters.destination!.toLowerCase()) ||
        t.scheduling?.location?.toLowerCase().includes(filters.destination!.toLowerCase())
      );
    }

    if (filters.ship) {
      filteredTrips = filteredTrips.filter(t => {
        const ship = t.ship || t.ocFormData?.ship || t.preStackingFormData?.ship || '';
        return ship.toLowerCase().includes(filters.ship!.toLowerCase());
      });
    }

    if (filters.booking) {
      filteredTrips = filteredTrips.filter(t => {
        const booking = t.booking || t.ocFormData?.booking || t.preStackingFormData?.booking || '';
        return booking.toLowerCase().includes(filters.booking!.toLowerCase());
      });
    }

    const table = tables.find(t => t.id === tableId);
    if (table?.autoFilter && table.autoFilter.trim() !== '') {
      filteredTrips = filteredTrips.filter(t => evaluateCondition(table.autoFilter!, t));
    }

    setTableData(prev => ({
      ...prev,
      [tableId]: filteredTrips
    }));
    
    showToast(`${filteredTrips.length} viagens encontradas e adicionadas à tabela.`, 'success');
  };

  useEffect(() => {
    if (isOpen) {
      setSubject(template.subject);
      setBody(template.body);
      setSearchTerm({});
      setAttachments([]);

      const initialTableData: { [tableId: string]: Trip[] } = {};
      const initialTableFilters: { [tableId: string]: any } = {};
      
      tables.forEach(table => {
        let filteredTrips = [...trips];
        
        if (table.defaultFilters && table.defaultFilters.enabled) {
          const filters = { ...table.defaultFilters };
          
          if (filters.useTodayDate) {
            filters.date = new Date().toISOString().split('T')[0];
          }
          
          initialTableFilters[table.id] = filters;

          if (filters.date) {
            filteredTrips = filteredTrips.filter(t => t.dateTime.startsWith(filters.date!));
          }

          if (filters.customer) {
            filteredTrips = filteredTrips.filter(t => 
              t.customer?.name?.toLowerCase().includes(filters.customer!.toLowerCase())
            );
          }

          if (filters.destination) {
            filteredTrips = filteredTrips.filter(t => 
              t.destination?.name?.toLowerCase().includes(filters.destination!.toLowerCase()) ||
              t.scheduling?.location?.toLowerCase().includes(filters.destination!.toLowerCase())
            );
          }

          if (filters.ship) {
            filteredTrips = filteredTrips.filter(t => {
              const ship = t.ship || t.ocFormData?.ship || t.preStackingFormData?.ship || '';
              return ship.toLowerCase().includes(filters.ship!.toLowerCase());
            });
          }

          if (filters.booking) {
            filteredTrips = filteredTrips.filter(t => {
              const booking = t.booking || t.ocFormData?.booking || t.preStackingFormData?.booking || '';
              return booking.toLowerCase().includes(filters.booking!.toLowerCase());
            });
          }
        }
        
        if (table.autoFilter && table.autoFilter.trim() !== '') {
          filteredTrips = filteredTrips.filter(trip => evaluateCondition(table.autoFilter!, trip));
        } else if (!table.defaultFilters?.enabled) {
          // Se não tem autoFilter nem defaultFilters habilitado, não preenche nada automaticamente
          filteredTrips = [];
        }

        initialTableData[table.id] = filteredTrips;
      });

      setTableFilters(initialTableFilters);
      setTableData(initialTableData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const generateHtml = () => {
    const firstTrip = Object.values(tableData).flat()[0];
    const totalRows = Object.values(tableData).flat().length;
    let finalBody = replaceVars(body, firstTrip, undefined, totalRows);

    const generatedTables: Record<string, string> = {};
    const usedTables = new Set<string>();

    tables.forEach(table => {
      const data = tableData[table.id] || [];
      
      if (data.length === 0) {
        generatedTables[table.title.toLowerCase()] = '';
        return;
      }

      const headerStyle = `background-color: ${table.headerColor}; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; text-transform: uppercase;`;
      const cellStyle = `background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;
      const altCellStyle = `background-color: #f8fafc; color: #000000; border: 1px solid #000000; padding: 8px 12px; text-align: center; font-size: ${template.config.fontSize || '12px'}; font-family: ${template.config.fontFamily || 'Arial, sans-serif'}; font-weight: bold; text-transform: uppercase;`;

      const renderSubTable = (subData: Trip[], subTitle?: string) => {
        let html = '';
        if (subTitle && !table.hideTitle) {
          html += `<h4 style="font-family: Arial, sans-serif; color: #1e293b; margin-top: 10px; margin-bottom: 10px; font-size: 13px; text-transform: uppercase; text-align: center;">${subTitle}</h4>`;
        }

        if (table.headerOrientation === 'horizontal') {
          html += `
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
              ${!table.hideHeaders ? `
              <thead>
                <tr>
                  ${table.columns.map(col => {
                    const label = table.columnLabels?.[col] || col;
                    return `<th style="${headerStyle}">${label}</th>`;
                  }).join('')}
                </tr>
              </thead>
              ` : ''}
              <tbody>
                ${subData.length > 0 ? subData.map((trip, idx) => `
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
                `).join('') : `
                  <tr>
                    <td colspan="${table.columns.length}" style="${cellStyle}">Nenhum registro encontrado</td>
                  </tr>
                `}
              </tbody>
            </table>
          `;
        } else {
          if (subData.length === 0) {
            html += `<p style="font-family: Arial, sans-serif; color: #64748b; font-size: 12px; text-align: center; margin-bottom: 20px;">Nenhum registro encontrado</p>`;
          } else {
            html += subData.map((trip, idx) => `
              <table style="border-collapse: collapse; width: 100%; max-width: 400px; margin-bottom: 25px; table-layout: fixed;">
                ${table.columns.map((col) => {
                  const style = cellStyle;
                  const customCell = table.customCells?.[col];
                  const label = table.columnLabels?.[col] || col;
                  const value = customCell 
                    ? (customCell.includes('{{') ? replaceVars(customCell, trip, idx, totalRows) : getCellValue(customCell, trip, idx, totalRows))
                    : getCellValue(col, trip, idx, totalRows);
                  
                  return `
                    <tr>
                      ${!table.hideHeaders ? `<td style="${headerStyle}; width: 140px;">${label.toUpperCase()}</td>` : ''}
                      <td style="${style}">${value}</td>
                    </tr>
                  `;
                }).join('')}
              </table>
            `).join('');
          }
        }
        return html;
      };

      let tableHtml = '';

      if (table.splitTable) {
        const leftData = data.filter(trip => evaluateCondition(table.splitLeftCondition || '', trip));
        const rightData = data.filter(trip => evaluateCondition(table.splitRightCondition || '', trip));

        const leftHtml = renderSubTable(leftData, table.splitLeftTitle);
        const rightHtml = renderSubTable(rightData, table.splitRightTitle);

        if (table.title && !table.hideTitle) {
          tableHtml += `<h3 style="font-family: Arial, sans-serif; color: #1e293b; margin-top: 25px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${table.title}</h3>`;
        }

        if (leftHtml && rightHtml) {
          tableHtml += `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 10px;">${leftHtml}</td>
                <td style="width: 50%; vertical-align: top; padding-left: 10px;">${rightHtml}</td>
              </tr>
            </table>
          `;
        } else {
          tableHtml += leftHtml || rightHtml;
        }
      } else {
        if (table.title && !table.hideTitle) {
          tableHtml += `<h3 style="font-family: Arial, sans-serif; color: #1e293b; margin-top: 25px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${table.title}</h3>`;
        }
        tableHtml += renderSubTable(data);
      }

      generatedTables[table.title.trim().toLowerCase()] = tableHtml;
    });

    // Process {{COLUNAS: Tabela 1 | Tabela 2}}
    finalBody = finalBody.replace(/\{\{COLUNAS:\s*([^}]+)\}\}/gi, (match, p1) => {
      const tableNames = p1.split('|').map((s: string) => s.trim());
      const validHtmls = tableNames.map((name: string) => {
        const lowerName = name.toLowerCase();
        usedTables.add(lowerName);
        return generatedTables[lowerName] || '';
      }).filter((html: string) => html !== '');

      if (validHtmls.length === 0) return '';
      if (validHtmls.length === 1) return validHtmls[0];

      const width = Math.floor(100 / validHtmls.length);
      
      let colsHtml = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"><tr>`;
      validHtmls.forEach((html: string, idx: number) => {
        const padding = idx === 0 ? 'padding-right: 10px;' : idx === validHtmls.length - 1 ? 'padding-left: 10px;' : 'padding: 0 10px;';
        colsHtml += `<td style="width: ${width}%; vertical-align: top; ${padding}">${html}</td>`;
      });
      colsHtml += `</tr></table>`;
      
      return colsHtml;
    });

    // Process {{TABELA: Nome}}
    finalBody = finalBody.replace(/\{\{TABELA:\s*([^}]+)\}\}/gi, (match, p1) => {
      const name = p1.trim().toLowerCase();
      usedTables.add(name);
      return generatedTables[name] || '';
    });

    // Append unused tables
    let leftoverTablesHtml = '';
    tables.forEach(table => {
      const name = table.title.toLowerCase();
      if (!usedTables.has(name) && generatedTables[name]) {
        leftoverTablesHtml += generatedTables[name];
      }
    });

    return `
      <div style="font-family: Arial, sans-serif; color: #334155;">
        <div style="white-space: pre-wrap; margin-bottom: 20px;">${finalBody}</div>
        ${leftoverTablesHtml}
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

                  {/* Filtros da Tabela */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Filtros da Tabela</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block">Data Programada</label>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <input type="date" className="w-full pl-12 pr-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-[12px] font-bold uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm placeholder:text-slate-300" 
                            value={tableFilters[table.id]?.date || ''}
                            onChange={e => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], date: e.target.value } }))}
                          />
                        </div>
                      </div>
                      <div>
                        <AutocompleteSearch 
                          label="Cliente" 
                          placeholder="Nome do cliente..." 
                          data={uniqueCustomers} 
                          onSelect={(c) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], customer: c } }))} 
                          onChange={(val) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], customer: val } }))}
                          mapToAutocomplete={mapStringItem} 
                          initialValue={tableFilters[table.id]?.customer || ''}
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                        />
                      </div>
                      <div>
                        <AutocompleteSearch 
                          label="Destino" 
                          placeholder="Destino..." 
                          data={uniqueDestinations} 
                          onSelect={(d) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], destination: d } }))} 
                          onChange={(val) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], destination: val } }))}
                          mapToAutocomplete={mapStringItem} 
                          initialValue={tableFilters[table.id]?.destination || ''}
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        />
                      </div>
                      <div>
                        <AutocompleteSearch 
                          label="Navio" 
                          placeholder="Nome do navio..." 
                          data={uniqueShips} 
                          onSelect={(s) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], ship: s } }))} 
                          onChange={(val) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], ship: val } }))}
                          mapToAutocomplete={mapStringItem} 
                          initialValue={tableFilters[table.id]?.ship || ''}
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v8l9-11h-7z" /></svg>}
                        />
                      </div>
                      <div className="col-span-2 flex gap-4">
                        <div className="flex-1">
                          <AutocompleteSearch 
                            label="Booking" 
                            placeholder="Número do booking..." 
                            data={uniqueBookings} 
                            onSelect={(b) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], booking: b } }))} 
                            onChange={(val) => setTableFilters(prev => ({ ...prev, [table.id]: { ...prev[table.id], booking: val } }))}
                            mapToAutocomplete={mapStringItem} 
                            initialValue={tableFilters[table.id]?.booking || ''}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <button 
                            onClick={() => handleApplyFilters(table.id)}
                            className="px-6 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 h-[56px] flex items-center justify-center"
                          >
                            Filtrar e Preencher
                          </button>
                        </div>
                      </div>
                    </div>
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
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">{trip.container || 'SEM CONTAINER'} - {trip.status}</span>
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

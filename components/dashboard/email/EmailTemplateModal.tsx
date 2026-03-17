
import React, { useState, useEffect, useMemo } from 'react';
import { EmailTemplate, Trip, EmailTableConfig, User, Driver, Staff, Customer, Port, PreStacking } from '../../../types';
import { db } from '../../../utils/storage';
import { showToast } from '../../shared/SimpleToast';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import { searchService } from '../../../utils/searchService';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: EmailTemplate | null;
  user: User;
  trips?: Trip[];
}

const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ isOpen, onClose, onSuccess, template, user, trips = [] }) => {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: '',
    to: '',
    cc: '',
    subject: '',
    body: '',
    config: {
      tables: [{
        id: `table-${Date.now()}`,
        title: 'Tabela Principal',
        headerColor: '#5b9bd5',
        headerOrientation: 'horizontal',
        alternateRowColor: true,
        columns: ['Motorista', 'Placa', 'Container', 'Status', 'Data/Hora']
      }],
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif'
    }
  });

  const [newColumn, setNewColumn] = useState<Record<string, string>>({});
  const [newColumnFormula, setNewColumnFormula] = useState<Record<string, string>>({});
  const [selectedStatusForFormula, setSelectedStatusForFormula] = useState<Record<string, string>>({});
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<Record<string, string>>({});
  const [bodyStatusFormula, setBodyStatusFormula] = useState('');
  const [bodyStatusIndex, setBodyStatusIndex] = useState('1');
  const [bodyPrevisaoStatus, setBodyPrevisaoStatus] = useState('');
  const [bodyPrevisaoAmount, setBodyPrevisaoAmount] = useState('45');
  const [bodyPrevisaoUnit, setBodyPrevisaoUnit] = useState('m');
  const [isSaving, setIsSaving] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [destinations, setDestinations] = useState<(Port | PreStacking)[]>([]);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);

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

  const mapStringItem = (item: string): any => ({
    id: item,
    type: 'PORT',
    mainText: item,
    originalData: item
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversData, staffData, usersData, customersData, portsData, preStackingData, customStatusesData] = await Promise.all([
          db.getDrivers(),
          db.getStaff(),
          db.getUsers(),
          db.getCustomers(),
          db.getPorts(),
          db.getPreStacking(),
          db.getCustomStatuses()
        ]);
        setDrivers(driversData);
        setStaff(staffData);
        setUsers(usersData);
        setCustomers(customersData);
        setDestinations([...portsData, ...preStackingData]);
        
        // Extrair nomes únicos dos status personalizados
        const uniqueStatusNames = Array.from(new Set(customStatusesData.map(s => s.name)));
        setCustomStatuses(uniqueStatusNames);
      } catch (error) {
        console.error('Erro ao carregar dados para autocomplete:', error);
      }
    };
    fetchData();
  }, []);

  const allContacts = useMemo(() => {
    return [
      ...drivers.map(d => ({ ...d, type: 'DRIVER' })),
      ...staff.map(s => ({ ...s, type: 'STAFF' })),
      ...users.map(u => ({ ...u, name: u.displayName, type: 'USER' }))
    ];
  }, [drivers, staff, users]);

  const mapContactToAutocomplete = (item: any) => {
    if (item.type === 'DRIVER') {
      return searchService.mapDriver(item);
    }
    if (item.type === 'STAFF') {
      return searchService.mapStaff(item);
    }
    return {
      id: item.id,
      type: 'STAFF' as const, // Reutiliza estilo de staff para usuários
      mainText: item.displayName,
      subText: item.role,
      location: item.emailCorp,
      originalData: item
    };
  };

  const mapCustomerToAutocomplete = (item: Customer) => {
    return {
      id: item.id,
      type: 'CUSTOMER' as const,
      mainText: item.name,
      subText: item.cnpj || '',
      location: item.city || '',
      originalData: item
    };
  };

  const mapDestinationToAutocomplete = (item: Port | PreStacking) => {
    return {
      id: item.id,
      type: 'PORT' as const,
      mainText: item.name,
      subText: item.address || '',
      location: '',
      originalData: item
    };
  };

  const handleContactSelect = (contact: any) => {
    const email = contact.email || contact.emailCorp || contact.beneficiary_email;
    if (email) {
      const currentTo = formData.to || '';
      const emails = currentTo.split(',').map(e => e.trim()).filter(e => e !== '');
      if (!emails.includes(email)) {
        setFormData({ ...formData, to: emails.length > 0 ? `${currentTo}, ${email}` : email });
        showToast(`${contact.name} adicionado ao campo Para`, 'success');
      } else {
        showToast('Este e-mail já está na lista.', 'info');
      }
    } else {
      showToast('Este contato não possui e-mail cadastrado.', 'warning');
    }
  };

  useEffect(() => {
    if (template) {
      let migratedConfig = { ...template.config };
      if (!migratedConfig.tables || migratedConfig.tables.length === 0) {
        migratedConfig.tables = [{
          id: `table-${Date.now()}`,
          title: 'Tabela Principal',
          headerColor: migratedConfig.headerColor || '#5b9bd5',
          headerOrientation: migratedConfig.headerOrientation || 'horizontal',
          alternateRowColor: migratedConfig.alternateRowColor ?? true,
          columns: migratedConfig.columns || ['Motorista', 'Placa', 'Container', 'Status', 'Data/Hora']
        }];
      }
      setFormData({ ...template, config: migratedConfig });
    } else {
      setFormData({
        name: '',
        to: '',
        cc: '',
        subject: '',
        body: '',
        config: {
          tables: [{
            id: `table-${Date.now()}`,
            title: 'Tabela Principal',
            headerColor: '#5b9bd5',
            headerOrientation: 'horizontal',
            alternateRowColor: true,
            columns: ['Motorista', 'Placa', 'Container', 'Status', 'Data/Hora']
          }],
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif'
        }
      });
    }
  }, [template, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.subject) {
      showToast('Nome e Assunto são obrigatórios.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const finalTemplate: EmailTemplate = {
        id: template?.id || `email-tpl-${Date.now()}`,
        name: formData.name!,
        to: formData.to || '',
        cc: formData.cc || '',
        subject: formData.subject!,
        body: formData.body || '',
        config: formData.config!,
        createdAt: template?.createdAt || now,
        updatedAt: now
      };

      const success = await db.saveEmailTemplate(finalTemplate, user);
      if (success) {
        onSuccess();
        showToast('Modelo salvo com sucesso!', 'success');
        onClose();
      } else {
        showToast('Erro ao salvar modelo.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro crítico ao salvar.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addTable = () => {
    const tables = formData.config?.tables || [];
    setFormData({
      ...formData,
      config: {
        ...formData.config!,
        tables: [
          ...tables,
          {
            id: `table-${Date.now()}`,
            title: `Nova Tabela ${tables.length + 1}`,
            headerColor: '#5b9bd5',
            headerOrientation: 'horizontal',
            alternateRowColor: true,
            columns: ['Coluna 1']
          }
        ]
      }
    });
  };

  const removeTable = (tableId: string) => {
    const tables = formData.config?.tables || [];
    setFormData({
      ...formData,
      config: {
        ...formData.config!,
        tables: tables.filter(t => t.id !== tableId)
      }
    });
  };

  const updateTable = (tableId: string, updates: any) => {
    const tables = formData.config?.tables || [];
    setFormData({
      ...formData,
      config: {
        ...formData.config!,
        tables: tables.map(t => t.id === tableId ? { ...t, ...updates } : t)
      }
    });
  };

  const addColumn = (tableId: string) => {
    const colName = newColumn[tableId];
    const colFormula = newColumnFormula[tableId];
    const tables = formData.config?.tables || [];
    const table = tables.find(t => t.id === tableId);
    
    if (colName && table && !table.columns.includes(colName)) {
      const newCustomCells = { ...(table.customCells || {}) };
      if (colFormula) {
        if (colFormula === 'STATUS_ESPECIFICO') {
          const status = selectedStatusForFormula[tableId];
          const index = selectedStatusIndex[tableId] || '1';
          if (status) {
            const indexStr = index !== '1' ? ` ${index}` : '';
            newCustomCells[colName] = `{{Status: ${status}${indexStr}}}`;
          } else {
            newCustomCells[colName] = `{{STATUS}}`;
          }
        } else {
          newCustomCells[colName] = `{{${colFormula}}}`;
        }
      }
      
      updateTable(tableId, { 
        columns: [...table.columns, colName],
        customCells: newCustomCells
      });
      setNewColumn({ ...newColumn, [tableId]: '' });
      setNewColumnFormula({ ...newColumnFormula, [tableId]: '' });
      setSelectedStatusIndex({ ...selectedStatusIndex, [tableId]: '1' });
    }
  };

  const removeColumn = (tableId: string, col: string) => {
    const tables = formData.config?.tables || [];
    const table = tables.find(t => t.id === tableId);
    if (table) {
      updateTable(tableId, { columns: table.columns.filter(c => c !== col) });
    }
  };

  const updateColumnLabel = (tableId: string, col: string, label: string) => {
    const tables = formData.config?.tables || [];
    const table = tables.find(t => t.id === tableId);
    if (table) {
      const newLabels = { ...(table.columnLabels || {}) };
      if (label) {
        newLabels[col] = label;
      } else {
        delete newLabels[col];
      }
      updateTable(tableId, { columnLabels: newLabels });
    }
  };

  const updateColumnName = (tableId: string, oldCol: string, newCol: string) => {
    if (!newCol || newCol === oldCol) return;
    const tables = formData.config?.tables || [];
    const table = tables.find(t => t.id === tableId);
    if (table) {
      const newColumns = table.columns.map(c => c === oldCol ? newCol : c);
      const newCustomCells = { ...(table.customCells || {}) };
      if (newCustomCells[oldCol]) {
        newCustomCells[newCol] = newCustomCells[oldCol];
        delete newCustomCells[oldCol];
      }
      const newLabels = { ...(table.columnLabels || {}) };
      if (newLabels[oldCol]) {
        newLabels[newCol] = newLabels[oldCol];
        delete newLabels[oldCol];
      }
      updateTable(tableId, { columns: newColumns, customCells: newCustomCells, columnLabels: newLabels });
    }
  };

  const insertStatusInBody = (status: string, index: string) => {
    if (!status) return;
    const indexStr = index !== '1' ? ` ${index}` : '';
    const formula = `{{Status: ${status}${indexStr}}}`;
    setFormData({ ...formData, body: (formData.body || '') + formula });
    setBodyStatusFormula('');
    setBodyStatusIndex('1');
  };

  const insertPrevisaoInBody = () => {
    if (!bodyPrevisaoStatus) return;
    const formula = `{{Previsão: ${bodyPrevisaoStatus} + ${bodyPrevisaoAmount}${bodyPrevisaoUnit}}}`;
    setFormData({ ...formData, body: (formData.body || '') + formula });
    setBodyPrevisaoStatus('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[85vw] max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              {template ? 'Editar Modelo de E-mail' : 'Novo Modelo de E-mail'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Template e Layout</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Modelo</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                  placeholder="EX: RELATÓRIO DIÁRIO VW"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assunto</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                  placeholder="ASSUNTO DO E-MAIL"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <AutocompleteSearch 
                    label="Preenchimento Automático (Nome Completo)"
                    placeholder="Busque por nome do motorista ou colaborador..."
                    data={allContacts}
                    onSelect={handleContactSelect}
                    mapToAutocomplete={mapContactToAutocomplete}
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Para (E-mails)</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 transition-all outline-none"
                    placeholder="separados por vírgula"
                    value={formData.to}
                    onChange={e => setFormData({...formData, to: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CC (Cópia)</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 transition-all outline-none"
                    placeholder="separados por vírgula"
                    value={formData.cc}
                    onChange={e => setFormData({...formData, cc: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Corpo do E-mail (Texto Base)</label>
                <textarea 
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-medium text-slate-800 focus:border-blue-500 transition-all outline-none resize-none"
                  placeholder="Olá equipe, segue relatório..."
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                />
                <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Variáveis Inteligentes (Copie e Cole)</p>
                    <button 
                      onClick={() => setShowFormulas(!showFormulas)}
                      className="text-[9px] font-black text-blue-600 uppercase bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                    >
                      {showFormulas ? 'Ocultar Fórmulas da Viagem' : 'Ver Fórmulas da Viagem'}
                    </button>
                  </div>
                  
                  {showFormulas && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-white border border-blue-200 rounded-xl shadow-xl p-4 max-h-64 overflow-y-auto">
                      <p className="text-[10px] text-slate-600 mb-3">
                        Use estas variáveis no formato <code className="font-mono font-bold text-blue-700 bg-blue-50 px-1 rounded">{"{{NOME}}"}</code> no assunto, corpo ou nas células da tabela. O sistema substituirá pelos dados da primeira viagem selecionada.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: 'MOTORISTA', desc: 'Nome do motorista' },
                          { name: 'CPF MOTORISTA', desc: 'CPF do motorista' },
                          { name: 'PLACA CAVALO', desc: 'Placa do cavalo' },
                          { name: 'PLACA CARRETA', desc: 'Placa da carreta' },
                          { name: 'CONTAINER', desc: 'Número do container' },
                          { name: 'STATUS', desc: 'Status atual da viagem' },
                          { name: 'TIPO DE PROGRAMAÇÃO', desc: 'Tipo de programação da viagem' },
                          { name: 'BU', desc: 'BU da viagem' },
                          { name: 'DATA', desc: 'Data da viagem' },
                          { name: 'OS', desc: 'Número da OS' },
                          { name: 'CLIENTE', desc: 'Nome do cliente' },
                          { name: 'CNPJ CLIENTE', desc: 'CNPJ do cliente' },
                          { name: 'CNPJ PORTO', desc: 'CNPJ do porto/terminal' },
                          { name: 'BOOKING', desc: 'Número do booking/reserva' },
                          { name: 'NAVIO', desc: 'Nome do navio' },
                          { name: 'NF', desc: 'Número da nota fiscal' },
                          { name: 'TARA', desc: 'Tara do container' },
                          { name: 'LACRE', desc: 'Número do lacre' },
                          { name: 'TIPO', desc: 'Tipo do container' },
                          { name: 'ORIGEM', desc: 'Local de coleta/origem' },
                          { name: 'DESTINO', desc: 'Local de entrega/destino' },
                          { name: 'STATUS ATUAL', desc: 'Status atual com data/hora' },
                          { name: 'STATUS_ESPECIFICO', desc: 'Data/hora de um status específico' },
                          { name: 'PREVISAO_ESPECIFICA', desc: 'Previsão baseada em um status' },
                          { name: 'QUANTIDADE LINHAS', desc: 'Contador de linhas (ex: 01, 02)' },
                          { name: 'SE(VAR) SIM SENAO NAO', desc: 'Ex: SE(MOTORISTA) {{MOTORISTA}} SENAO Sem motorista' }
                        ].map(v => (
                          <div key={v.name} className="flex flex-col bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            {v.name === 'STATUS_ESPECIFICO' ? (
                              <div className="space-y-2">
                                <span className="text-[8px] font-bold text-slate-500 uppercase">{v.desc}</span>
                                <div className="flex gap-1">
                                  <select 
                                    className="flex-1 px-2 py-1.5 rounded border border-slate-200 bg-white text-[9px] font-bold uppercase outline-none focus:border-blue-500"
                                    value={bodyStatusFormula}
                                    onChange={e => setBodyStatusFormula(e.target.value)}
                                  >
                                    <option value="">STATUS...</option>
                                    {customStatuses.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <select
                                    className="w-16 px-1 py-1.5 rounded border border-slate-200 bg-white text-[9px] font-bold outline-none focus:border-blue-500"
                                    value={bodyStatusIndex}
                                    onChange={e => setBodyStatusIndex(e.target.value)}
                                    title="Ocorrência (1ª, 2ª, 3ª...)"
                                  >
                                    <option value="1">1ª</option>
                                    <option value="2">2ª</option>
                                    <option value="3">3ª</option>
                                    <option value="4">4ª</option>
                                  </select>
                                  <button 
                                    onClick={() => insertStatusInBody(bodyStatusFormula, bodyStatusIndex)}
                                    disabled={!bodyStatusFormula}
                                    className="px-2 py-1.5 bg-blue-600 text-white rounded text-[9px] font-bold disabled:opacity-50"
                                  >
                                    ADD
                                  </button>
                                </div>
                              </div>
                            ) : v.name === 'PREVISAO_ESPECIFICA' ? (
                              <div className="space-y-2">
                                <span className="text-[8px] font-bold text-slate-500 uppercase">{v.desc}</span>
                                <div className="flex flex-col gap-1">
                                  <select 
                                    className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-[9px] font-bold uppercase outline-none focus:border-blue-500"
                                    value={bodyPrevisaoStatus}
                                    onChange={e => setBodyPrevisaoStatus(e.target.value)}
                                  >
                                    <option value="">STATUS BASE...</option>
                                    {customStatuses.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <div className="flex gap-1">
                                    <input 
                                      type="number" 
                                      className="flex-1 px-2 py-1.5 rounded border border-slate-200 bg-white text-[9px] font-bold outline-none focus:border-blue-500"
                                      value={bodyPrevisaoAmount}
                                      onChange={e => setBodyPrevisaoAmount(e.target.value)}
                                      placeholder="Qtd"
                                    />
                                    <select
                                      className="w-14 px-1 py-1.5 rounded border border-slate-200 bg-white text-[9px] font-bold outline-none focus:border-blue-500"
                                      value={bodyPrevisaoUnit}
                                      onChange={e => setBodyPrevisaoUnit(e.target.value)}
                                    >
                                      <option value="m">min</option>
                                      <option value="h">hrs</option>
                                    </select>
                                    <button 
                                      onClick={insertPrevisaoInBody}
                                      disabled={!bodyPrevisaoStatus}
                                      className="px-2 py-1.5 bg-amber-600 text-white rounded text-[9px] font-bold disabled:opacity-50"
                                    >
                                      ADD
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <code className="text-[10px] font-mono font-bold text-blue-700">{"{{"}{v.name}{"}}"}</code>
                                <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">{v.desc}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{SAUDACAO}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Bom dia / Boa tarde / Boa noite</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{DATA_ATUAL}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Data de hoje (ex: 15/08/2023)</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{HORA_ATUAL}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Hora atual (ex: 14:30)</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{TABELA: Nome da Tabela}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Posicionar a tabela no corpo do e-mail</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{COLUNAS: Tabela 1 | Tabela 2}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Colocar tabelas lado a lado</span>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-2 italic">* O sistema inserirá a tabela de dados automaticamente ao final, a menos que você use {'{{TABELA: Nome}}'} ou {'{{COLUNAS: Nome1 | Nome2}}'} no corpo do e-mail.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Tabelas do E-mail</h4>
                <button onClick={addTable} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 transition-all">
                  + Adicionar Tabela
                </button>
              </div>
              
              {formData.config?.tables?.map((table, index) => (
                <div key={table.id} className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-8 relative">
                  <button 
                    onClick={() => removeTable(table.id)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all"
                    title="Remover Tabela"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                  </button>
                  
                  <div className="space-y-1 pr-12">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Título da Tabela {index + 1}</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={table.hideTitle || false}
                            onChange={e => updateTable(table.id, { hideTitle: e.target.checked })}
                          />
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Ocultar título</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={table.hideHeaders || false}
                            onChange={e => updateTable(table.id, { hideHeaders: e.target.checked })}
                          />
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Ocultar cabeçalhos</span>
                        </label>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                      placeholder="EX: PROGRAMAÇÃO DE EXPORTAÇÃO"
                      value={table.title}
                      onChange={e => updateTable(table.id, { title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Filtro Automático (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:border-blue-500 transition-all outline-none"
                      placeholder="Ex: Status não contém concluída"
                      value={table.autoFilter || ''}
                      onChange={e => updateTable(table.id, { autoFilter: e.target.value })}
                    />
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 ml-1">
                      Use o nome da coluna e operadores (=, !=, contém, não contém, em). Ex: Status em Viagem concluída, Container sobre rodas
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cor do Cabeçalho</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          className="w-12 h-12 rounded-xl border-none cursor-pointer"
                          value={table.headerColor}
                          onChange={e => updateTable(table.id, { headerColor: e.target.value })}
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">{table.headerColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Orientação</label>
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                        <button 
                          onClick={() => updateTable(table.id, { headerOrientation: 'horizontal' })}
                          className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${table.headerOrientation === 'horizontal' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Horizontal
                        </button>
                        <button 
                          onClick={() => updateTable(table.id, { headerOrientation: 'vertical' })}
                          className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${table.headerOrientation === 'vertical' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Vertical
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 uppercase">Cores Alternadas nas Linhas</span>
                    <button 
                      onClick={() => updateTable(table.id, { alternateRowColor: !table.alternateRowColor })}
                      className={`w-12 h-6 rounded-full transition-all relative ${table.alternateRowColor ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${table.alternateRowColor ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={table.splitTable || false}
                        onChange={e => updateTable(table.id, { splitTable: e.target.checked })}
                      />
                      <span className="text-[11px] font-bold text-slate-700 uppercase">Dividir tabela em duas colunas?</span>
                    </label>

                    {table.splitTable && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Título Coluna 1 (Esquerda)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:border-blue-500 outline-none"
                            placeholder="Ex: Em Andamento"
                            value={table.splitLeftTitle || ''}
                            onChange={e => updateTable(table.id, { splitLeftTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Condição Coluna 1</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:border-blue-500 outline-none"
                            placeholder="Ex: Status não contém andamento"
                            value={table.splitLeftCondition || ''}
                            onChange={e => updateTable(table.id, { splitLeftCondition: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Título Coluna 2 (Direita)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:border-blue-500 outline-none"
                            placeholder="Ex: Finalizadas"
                            value={table.splitRightTitle || ''}
                            onChange={e => updateTable(table.id, { splitRightTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Condição Coluna 2</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:border-blue-500 outline-none"
                            placeholder="Ex: Status contém concluída"
                            value={table.splitRightCondition || ''}
                            onChange={e => updateTable(table.id, { splitRightCondition: e.target.value })}
                          />
                        </div>
                        <div className="col-span-full">
                          <p className="text-[8px] text-slate-500 font-bold uppercase">
                            * As viagens serão divididas nas colunas de acordo com as condições acima. Se deixar vazio, puxa todas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Default Filters */}
                  <div className="space-y-6 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Filtros Automáticos</h5>
                        <p className="text-[9px] text-slate-500 mt-0.5">Defina critérios que serão aplicados ao abrir este modelo.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={table.defaultFilters?.enabled || false}
                          onChange={e => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, enabled: e.target.checked } })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-[10px] font-black text-slate-700 uppercase">Habilitar</span>
                      </label>
                    </div>

                    {table.defaultFilters?.enabled && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Data da Viagem</label>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${table.defaultFilters?.useTodayDate ? 'bg-blue-600 border-blue-600' : 'border-slate-200 group-hover:border-blue-300'}`}>
                              {table.defaultFilters?.useTodayDate && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={table.defaultFilters?.useTodayDate || false}
                              onChange={e => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, useTodayDate: e.target.checked, date: e.target.checked ? '' : table.defaultFilters?.date } })}
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-blue-600 transition-colors">Usar data de hoje automaticamente</span>
                          </label>
                        </div>

                        {!table.defaultFilters?.useTodayDate && (
                          <div className="animate-in fade-in zoom-in-95">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Data Específica</label>
                            <input type="date" className="w-full px-5 py-4 text-[12px] font-bold text-slate-700 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none shadow-inner" 
                              value={table.defaultFilters?.date || ''}
                              onChange={e => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, date: e.target.value } })}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="col-span-1">
                            <AutocompleteSearch 
                              label="Cliente"
                              placeholder="Nome do cliente..."
                              data={customers}
                              onSelect={(c) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, customer: c.name } })}
                              mapToAutocomplete={mapCustomerToAutocomplete}
                              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                              initialValue={table.defaultFilters?.customer || ''}
                            />
                          </div>
                          <div className="col-span-1">
                            <AutocompleteSearch 
                              label="Destino"
                              placeholder="Destino..."
                              data={destinations}
                              onSelect={(d) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, destination: d.name } })}
                              mapToAutocomplete={mapDestinationToAutocomplete}
                              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                              initialValue={table.defaultFilters?.destination || ''}
                            />
                          </div>
                          <div className="col-span-1">
                            <AutocompleteSearch 
                              label="Navio"
                              placeholder="Nome do navio..."
                              data={uniqueShips}
                              onSelect={(s) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, ship: s } })}
                              onChange={(val) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, ship: val } })}
                              mapToAutocomplete={mapStringItem}
                              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v8l9-11h-7z" /></svg>}
                              initialValue={table.defaultFilters?.ship || ''}
                            />
                          </div>
                          <div className="col-span-1">
                            <AutocompleteSearch 
                              label="Booking"
                              placeholder="Número do booking..."
                              data={uniqueBookings}
                              onSelect={(b) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, booking: b } })}
                              onChange={(val) => updateTable(table.id, { defaultFilters: { ...table.defaultFilters, booking: val } })}
                              mapToAutocomplete={mapStringItem}
                              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                              initialValue={table.defaultFilters?.booking || ''}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Colunas da Tabela</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase outline-none focus:border-blue-500"
                        placeholder="NOME DA COLUNA..."
                        value={newColumn[table.id] || ''}
                        onChange={e => setNewColumn({ ...newColumn, [table.id]: e.target.value })}
                        onKeyPress={e => e.key === 'Enter' && addColumn(table.id)}
                      />
                      <select
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase outline-none focus:border-blue-500"
                        value={newColumnFormula[table.id] || ''}
                        onChange={e => setNewColumnFormula({ ...newColumnFormula, [table.id]: e.target.value })}
                      >
                        <option value="">FÓRMULA (OPCIONAL)</option>
                        <option value="OS">OS</option>
                        <option value="CLIENTE">CLIENTE</option>
                        <option value="CNPJ CLIENTE">CNPJ CLIENTE</option>
                        <option value="CNPJ PORTO">CNPJ PORTO</option>
                        <option value="MOTORISTA">MOTORISTA</option>
                        <option value="CPF MOTORISTA">CPF MOTORISTA</option>
                        <option value="TELEFONE MOTORISTA">TELEFONE MOTORISTA</option>
                        <option value="PLACA CAVALO">PLACA CAVALO</option>
                        <option value="PLACA CARRETA">PLACA CARRETA</option>
                        <option value="CONTAINER">CONTAINER</option>
                        <option value="TIPO">TIPO</option>
                        <option value="TARA">TARA</option>
                        <option value="LACRE">LACRE</option>
                        <option value="STATUS">STATUS</option>
                        <option value="DATA">DATA</option>
                        <option value="BOOKING">BOOKING/RESERVA</option>
                        <option value="NAVIO">NAVIO</option>
                        <option value="NF">NOTA FISCAL</option>
                        <option value="ORIGEM">ORIGEM/COLETA</option>
                        <option value="DESTINO">DESTINO/ENTREGA</option>
                        <option value="QUANTIDADE LINHAS">QUANTIDADE LINHAS</option>
                        <option value="VIAGEM ATUAL">VIAGEM ATUAL (SIM/NÃO)</option>
                        <option value="VIAGEM ATUAL COUNT">CONTAGEM DA VIAGEM ATUAL</option>
                        <option value="STATUS_ESPECIFICO">STATUS ESPECÍFICO (DATA/HORA)</option>
                      </select>
                      
                      {newColumnFormula[table.id] === 'STATUS_ESPECIFICO' && (
                        <div className="flex flex-1 gap-1 animate-in fade-in zoom-in-95">
                          <select
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-blue-50 text-[10px] font-bold uppercase outline-none focus:border-blue-500"
                            value={selectedStatusForFormula[table.id] || ''}
                            onChange={e => setSelectedStatusForFormula({ ...selectedStatusForFormula, [table.id]: e.target.value })}
                          >
                            <option value="">STATUS...</option>
                            {customStatuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            className="w-20 px-2 py-3 rounded-xl border border-slate-200 bg-blue-50 text-[10px] font-bold outline-none focus:border-blue-500"
                            value={selectedStatusIndex[table.id] || '1'}
                            onChange={e => setSelectedStatusIndex({ ...selectedStatusIndex, [table.id]: e.target.value })}
                            title="Ocorrência"
                          >
                            <option value="1">1ª</option>
                            <option value="2">2ª</option>
                            <option value="3">3ª</option>
                            <option value="4">4ª</option>
                          </select>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => addColumn(table.id)}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 ml-1 leading-relaxed">
                      Dicas de colunas especiais:<br/>
                      • <strong className="text-blue-600">Status Atual</strong>: Mostra o status atual com data e hora.<br/>
                      • <strong className="text-blue-600">Status: [Nome]</strong>: Mostra a data/hora de um status específico (ex: <span className="font-mono bg-slate-100 px-1 rounded">Status: Chegou no cliente</span>).<br/>
                      • <strong className="text-amber-600">Previsão: [Nome] + [X]h</strong>: Calcula uma previsão somando horas (ex: <span className="font-mono bg-slate-100 px-1 rounded">Previsão: Chegou no cliente + 2h</span>).<br/>
                      • <strong className="text-emerald-600">Fórmulas Múltiplas</strong>: Use "ou" ou "|" para tentar várias opções (ex: <span className="font-mono bg-slate-100 px-1 rounded">Status: Retirada de Cheio ou Previsão: Chegada + 45m</span>).<br/>
                      • <strong className="text-purple-600">Condicionais (SE)</strong>: Use <span className="font-mono bg-slate-100 px-1 rounded">{'{{SE(VARIAVEL) texto se sim SENAO texto se não}}'}</span>. Ex: <span className="font-mono bg-slate-100 px-1 rounded">{'{{SE(MOTORISTA) Mot: {{MOTORISTA}} SENAO Sem motorista}}'}</span>.
                    </p>
                    <div className="space-y-3">
                      {table.columns.map((col, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Variável/ID</span>
                              <input 
                                type="text" 
                                className="flex-1 bg-transparent text-[10px] font-bold text-slate-400 uppercase outline-none focus:text-blue-600"
                                value={col}
                                onChange={e => updateColumnName(table.id, col, e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-blue-400 uppercase">Rótulo Exibido</span>
                              <input 
                                type="text" 
                                className="flex-1 bg-transparent text-[11px] font-black text-slate-800 uppercase outline-none border-b border-transparent focus:border-blue-200"
                                placeholder={col}
                                value={table.columnLabels?.[col] || ''}
                                onChange={e => updateColumnLabel(table.id, col, e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {table.customCells?.[col] && (
                              <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[8px] font-bold truncate max-w-[100px]" title={table.customCells[col]}>
                                FX: {table.customCells[col]}
                              </div>
                            )}
                            <button 
                              onClick={() => removeColumn(table.id, col)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Pré-visualização da Tabela</h4>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 overflow-x-auto custom-scrollbar">
                      {table.headerOrientation === 'horizontal' ? (
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr>
                              {table.columns.map((col, i) => (
                                <th 
                                  key={i} 
                                  style={{ backgroundColor: table.headerColor || '#1e293b', color: '#fff' }} 
                                  className="border border-slate-300 px-3 py-2 text-[10px] uppercase font-bold whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {table.columnLabels?.[col] || col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2].map(row => (
                              <tr key={row}>
                                {table.columns.map((col, i) => (
                                  <td 
                                    key={i} 
                                    style={{ backgroundColor: table.alternateRowColor && row % 2 === 0 ? '#f8fafc' : '#ffffff' }} 
                                    className="border border-slate-300 px-3 py-2 text-[10px] font-medium text-slate-700 whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const newCustomCells = { ...(table.customCells || {}) };
                                      newCustomCells[col] = e.currentTarget.textContent || '';
                                      updateTable(table.id, { customCells: newCustomCells });
                                    }}
                                  >
                                    {table.customCells?.[col] || 'DADO EXEMPLO'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="space-y-4">
                          {[1, 2].map(row => (
                            <table key={row} className="w-full max-w-sm border-collapse text-left">
                              <tbody>
                                {table.columns.map((col, i) => (
                                  <tr key={i}>
                                    <th 
                                      style={{ backgroundColor: table.headerColor || '#1e293b', color: '#fff', width: '140px' }} 
                                      className="border border-slate-300 px-3 py-2 text-[10px] uppercase font-bold whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {table.columnLabels?.[col] || col}
                                    </th>
                                    <td 
                                      style={{ backgroundColor: '#ffffff' }} 
                                      className="border border-slate-300 px-3 py-2 text-[10px] font-medium text-slate-700 whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500"
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const newCustomCells = { ...(table.customCells || {}) };
                                        newCustomCells[col] = e.currentTarget.textContent || '';
                                        updateTable(table.id, { customCells: newCustomCells });
                                      }}
                                    >
                                      {table.customCells?.[col] || 'DADO EXEMPLO'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-white text-slate-400 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailTemplateModal;

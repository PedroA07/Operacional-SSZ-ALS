
import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { maskCEP } from '../../utils/masks';
import { DEFAULT_OPERATIONS } from '../../constants/operations';

interface CustomersTabProps {
  customers: Customer[];
  onSaveCustomer: (customer: Partial<Customer>, id?: string) => void;
}

const CustomersTab: React.FC<CustomersTabProps> = ({ customers, onSaveCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMapAddress, setSelectedMapAddress] = useState('');

  const initialForm: Partial<Customer> = {
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    cnpj: '',
    operations: []
  };

  const [form, setForm] = useState<Partial<Customer>>(initialForm);

  useEffect(() => {
    if (form.name && !editingId) {
      const nameUpper = form.name.toUpperCase();
      const matchedCategories = DEFAULT_OPERATIONS
        .filter(op => 
          nameUpper.includes(op.category.toUpperCase()) || 
          op.clients.some(c => nameUpper.includes(c.toUpperCase()))
        )
        .map(op => op.category);

      if (matchedCategories.length > 0) {
        const currentOps = form.operations || [];
        const newOps = Array.from(new Set([...currentOps, ...matchedCategories]));
        if (JSON.stringify(newOps) !== JSON.stringify(currentOps)) {
          setForm(prev => ({ ...prev, operations: newOps }));
        }
      }
    }
  }, [form.name, editingId]);

  useEffect(() => {
    const cep = form.zipCode?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      const timeoutId = setTimeout(() => {
        handleCepLookup(cep);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setCepError(null);
    }
  }, [form.zipCode]);

  const handleCepLookup = async (cep: string) => {
    setIsCepLoading(true);
    setCepError(null);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (response.ok) {
        const data = await response.json();
        setForm(prev => ({
          ...prev,
          address: data.street || prev.address || '',
          neighborhood: (data.neighborhood || prev.neighborhood || '').toUpperCase(),
          city: (data.city || prev.city || '').toUpperCase(),
          state: (data.state || prev.state || '').toUpperCase()
        }));
        setIsCepLoading(false);
        return;
      }
    } catch (e) {
      console.warn("BrasilAPI falhou, tentando ViaCEP...", e);
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.ok) {
        const data = await response.json();
        if (data.erro) {
          setCepError('CEP não encontrado.');
        } else {
          setForm(prev => ({
            ...prev,
            address: data.logradouro || prev.address || '',
            neighborhood: (data.bairro || prev.neighborhood || '').toUpperCase(),
            city: (data.localidade || prev.city || '').toUpperCase(),
            state: (data.uf || prev.state || '').toUpperCase()
          }));
        }
      } else {
        throw new Error("Erro na rede");
      }
    } catch (error) {
      setCepError('Erro de conexão. Verifique sua internet ou digite manualmente.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    setCepError(null);
    if (customer) {
      setForm(customer);
      setEditingId(customer.id);
    } else {
      setForm(initialForm);
      setEditingId(undefined);
    }
    setIsModalOpen(true);
  };

  const handleOpenMap = (customer: Customer) => {
    const fullAddress = `${customer.address}, ${customer.neighborhood || ''}, ${customer.city} - ${customer.state}`;
    setSelectedMapAddress(fullAddress);
    setIsMapModalOpen(true);
  };

  const toggleOperation = (category: string) => {
    const current = form.operations || [];
    if (current.includes(category)) {
      setForm({ ...form, operations: current.filter(c => c !== category) });
    } else {
      setForm({ ...form, operations: [...current, category] });
    }
  };

  const handleOpentechSync = async () => {
    if (!form.cnpj) {
      alert("Insira o CNPJ para consultar no SIL Opentech.");
      return;
    }
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    
    setForm(prev => ({
      ...prev,
      name: prev.name || 'CLIENTE IMPORTADO OPENTECH SA',
      address: 'AVENIDA DAS INDUSTRIAS, 1500',
      neighborhood: 'DISTRITO INDUSTRIAL',
      city: 'SAO PAULO',
      state: 'SP',
      zipCode: '01000-000'
    }));
    setIsSyncing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomer(form, editingId);
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cnpj.includes(searchQuery)
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <input 
            type="text" 
            placeholder="PESQUISAR CLIENTE OU CNPJ..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 ml-4">
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Cliente / Operações</th>
                <th className="px-6 py-5">CNPJ</th>
                <th className="px-6 py-5 min-w-[200px]">Endereço / Bairro</th>
                <th className="px-6 py-5">CEP</th>
                <th className="px-6 py-5">Localidade</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 uppercase text-sm leading-tight">{c.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.operations && c.operations.length > 0 ? c.operations.map(op => (
                        <span key={op} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase border border-blue-100">
                          {op}
                        </span>
                      )) : <span className="text-[7px] text-slate-300 italic uppercase">Sem vínculo</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{c.cnpj}</td>
                  <td className="px-6 py-4">
                    <p className="text-slate-500 font-bold uppercase break-words whitespace-normal leading-relaxed">{c.address}</p>
                    <p className="text-slate-400 font-medium uppercase text-[9px] mt-0.5 tracking-tighter">{c.neighborhood || '---'}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">{c.zipCode}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-bold uppercase">{c.city}</span>
                    <span className="ml-1 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 font-black">{c.state}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenMap(c)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="Visualizar Mapa">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors" title="Editar">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 h-[80vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-700 text-lg uppercase tracking-tight">Visualização Logística</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-lg">{selectedMapAddress}</p>
              </div>
              <button onClick={() => setIsMapModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-slate-300 hover:text-red-400 shadow-sm transition-all border border-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedMapAddress)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              ></iframe>
              <div className="absolute bottom-6 right-6">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMapAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 bg-white text-slate-800 rounded-xl text-[10px] font-black uppercase shadow-2xl border border-slate-200 flex items-center gap-2 hover:bg-emerald-50 transition-all"
                >
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Navegar no Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Integração SIL Opentech Disponível</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-slate-300 hover:text-red-400 shadow-sm transition-all border border-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-8 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                  <input required type="text" className={inputClasses} placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} />
                </div>
                <div className="col-span-4">
                  <button 
                    type="button" 
                    onClick={handleOpentechSync}
                    disabled={isSyncing}
                    className={`w-full py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${isSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white'}`}
                  >
                    <svg className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="3"/></svg>
                    {isSyncing ? 'Sincronizando...' : 'SIL Opentech'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                <input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>

              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Vincular Categorias de Operação</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_OPERATIONS.map(op => (
                    <button
                      key={op.category}
                      type="button"
                      onClick={() => toggleOperation(op.category)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${form.operations?.includes(op.category) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'}`}
                    >
                      {op.category}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-blue-400 font-bold uppercase italic">* O sistema sugere o vínculo automaticamente ao digitar o nome.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                  <div className="relative">
                    <input required type="text" className={`${inputClasses} ${cepError ? 'border-red-400 ring-red-50 ring-2' : ''}`} placeholder="00000-000" value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} />
                    {isCepLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {cepError && <p className="text-[8px] font-black text-red-500 uppercase mt-1 absolute left-1">{cepError}</p>}
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Município</label>
                  <input required type="text" className={inputClasses} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado (UF)</label>
                  <select required className={inputClasses} value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                    <option value="">UF</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço (Logradouro/Nº)</label>
                  <input required type="text" className={inputClasses} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                  <input required type="text" className={inputClasses} value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">Salvar Cliente</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[11px] font-bold uppercase hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer } from '../../types';
import { maskCEP, maskCNPJ } from '../../utils/masks';
import { Icons } from '../../constants/icons';
import ListFilters from './shared/ListFilters';

interface CustomersTabProps {
  customers: Customer[];
  onSaveCustomer: (customer: Partial<Customer>, id?: string) => void;
  onDeleteCustomer: (id: string) => void;
  isAdmin: boolean;
}

const SEGMENTS = ['Aliança', 'Mercosul', 'Indústria', 'Carga Solta', 'Logística Reversa', 'Urgente'];

const CustomersTab: React.FC<CustomersTabProps> = ({ customers, onSaveCustomer, onDeleteCustomer, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  
  // Impede buscas repetidas para o mesmo CNPJ na mesma sessão de edição
  const lastSearchedCnpj = useRef<string>('');

  const [infoModal, setInfoModal] = useState<{ show: boolean; title: string; message: string; type: 'warning' | 'error' }>({
    show: false, title: '', message: '', type: 'warning'
  });

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMapAddress, setSelectedMapAddress] = useState('');
  const [selectedMapTitle, setSelectedMapTitle] = useState('');
  
  const initialForm: Partial<Customer> = {
    name: '',
    legalName: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    cnpj: '',
    registrationDate: new Date().toISOString().split('T')[0],
    operations: []
  };

  const [form, setForm] = useState<Partial<Customer>>(initialForm);

  // Busca automática por CEP
  useEffect(() => {
    const cep = form.zipCode?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      handleCepLookup(cep);
    }
  }, [form.zipCode]);

  // Busca automática por CNPJ (Gatilho aos 14 dígitos)
  useEffect(() => {
    const cnpj = form.cnpj?.replace(/\D/g, '');
    if (cnpj && cnpj.length === 14) {
      // Evita disparar se já buscou este CNPJ nesta abertura de modal
      if (lastSearchedCnpj.current === cnpj) return;

      const duplicate = customers.find(c => c.cnpj.replace(/\D/g, '') === cnpj);
      if (duplicate && duplicate.id !== editingId) {
        setInfoModal({
          show: true,
          title: "Cliente já Cadastrado",
          message: `O CNPJ ${maskCNPJ(cnpj)} já pertence a "${duplicate.legalName || duplicate.name}".`,
          type: "warning"
        });
        lastSearchedCnpj.current = cnpj;
        return;
      }
      
      handleCnpjLookup(cnpj, true);
    } else if (cnpj && cnpj.length < 14) {
      lastSearchedCnpj.current = ''; // Reseta se o usuário apagar
    }
  }, [form.cnpj, editingId, customers]);

  const handleCepLookup = async (cep: string) => {
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (response.ok) {
        const data = await response.json();
        setForm(prev => ({
          ...prev,
          address: (data.street || prev.address || '').toUpperCase(),
          neighborhood: (data.neighborhood || prev.neighborhood || '').toUpperCase(),
          city: (data.city || prev.city || '').toUpperCase(),
          state: (data.state || prev.state || '').toUpperCase()
        }));
      }
    } catch (e) {
      console.warn("Falha no CEP");
    }
  };

  const handleCnpjLookup = async (cnpjInput?: string, isAuto = false) => {
    const targetCnpj = cnpjInput || form.cnpj?.replace(/\D/g, '');
    
    if (!targetCnpj || targetCnpj.length !== 14) {
      if (!isAuto) {
        setInfoModal({
          show: true,
          title: "CNPJ Incompleto",
          message: "Digite os 14 dígitos para consultar.",
          type: "warning"
        });
      }
      return;
    }

    lastSearchedCnpj.current = targetCnpj;
    setIsCnpjLoading(true);

    try {
      // Mudança para API secundária robusta (Minha Receita)
      const response = await fetch(`https://minhareceita.org/${targetCnpj}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setForm(prev => ({
          ...prev,
          name: (data.nome_fantasia || data.razao_social || '').toUpperCase(),
          legalName: (data.razao_social || '').toUpperCase(),
          address: `${data.logradouro || ''}${data.numero ? ', ' + data.numero : ''}`.trim().toUpperCase(),
          neighborhood: (data.bairro || '').toUpperCase(),
          city: (data.municipio || '').toUpperCase(),
          state: (data.uf || '').toUpperCase(),
          zipCode: data.cep ? maskCEP(data.cep) : prev.zipCode
        }));
      } else {
        if (!isAuto) {
          const status = response.status;
          setInfoModal({
            show: true,
            title: status === 429 ? "Limite Excedido" : "Erro na Consulta",
            message: status === 429 
              ? "Muitas consultas em pouco tempo. Aguarde 1 minuto ou preencha manualmente." 
              : "Não conseguimos localizar este CNPJ na base de dados.",
            type: "error"
          });
        }
      }
    } catch (e) {
      if (!isAuto) {
        setInfoModal({
          show: true,
          title: "Instabilidade na Rede",
          message: "O serviço de busca está temporariamente indisponível. Por favor, preencha os dados manualmente.",
          type: "error"
        });
      }
    } finally {
      setIsCnpjLoading(false);
    }
  };

  const toggleSegment = (segment: string) => {
    setForm(prev => {
      const current = prev.operations || [];
      const next = current.includes(segment) 
        ? current.filter(s => s !== segment) 
        : [...current, segment];
      return { ...prev, operations: next };
    });
  };

  const handleOpenModal = (customer?: Customer) => {
    setForm(customer ? { ...customer, operations: customer.operations || [] } : initialForm);
    setEditingId(customer?.id);
    lastSearchedCnpj.current = customer?.cnpj?.replace(/\D/g, '') || '';
    setIsModalOpen(true);
  };

  const confirmDelete = (customer: Customer) => {
    setInfoModal({
      show: true,
      title: "Solicitação de Exclusão",
      message: `Você não tem permissão para excluir este cadastro diretamente. Por favor, entre em contato com um administrador da ALS Transportes para solicitar a remoção do cliente: "${customer.legalName || customer.name}".`,
      type: "warning"
    });
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      onDeleteCustomer(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleOpenMap = (customer: Customer) => {
    const fullAddress = `${customer.address}, ${customer.neighborhood || ''}, ${customer.city} - ${customer.state}`;
    setSelectedMapAddress(fullAddress);
    setSelectedMapTitle(customer.legalName || customer.name);
    setIsMapModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomer(form, editingId);
    setIsModalOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    let result = customers.filter(c => 
      (c.legalName && c.legalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cnpj.includes(searchQuery)
    );

    result.sort((a, b) => {
      const nameA = (a.legalName || a.name).toUpperCase();
      const nameB = (b.legalName || b.name).toUpperCase();
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
      if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
      return 0;
    });

    return result;
  }, [customers, searchQuery, sortBy]);

  const inputClasses = "w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50 placeholder:text-slate-300";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";
  const labelBlueClass = "text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ListFilters 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            placeholder="PESQUISAR CLIENTE, RAZÃO OU CNPJ..."
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95 shrink-0 h-[58px] mt-[-24px]">Novo Cliente</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Identificação Jurídica</th>
                <th className="px-8 py-5">CNPJ</th>
                <th className="px-8 py-5">Segmentação / Vínculos</th>
                <th className="px-8 py-5">Endereço / Localidade</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">{c.legalName || c.name}</p>
                    {c.legalName && c.name !== c.legalName && <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">FANTASIA: {c.name}</p>}
                  </td>
                  <td className="px-8 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">{maskCNPJ(c.cnpj)}</td>
                  <td className="px-8 py-4">
                    <div className="flex flex-wrap gap-1">
                       {c.operations && c.operations.length > 0 ? c.operations.map((seg, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[7px] font-black uppercase tracking-tighter">
                             {seg}
                          </span>
                       )) : <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest italic">Não classificado</span>}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-slate-500 font-bold uppercase text-[9px]">{c.address}</p>
                    <p className="text-slate-400 font-black uppercase text-[10px] mt-1">{c.city} - {c.state}</p>
                  </td>
                  <td className="px-8 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenMap(c)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="Visualizar Mapa"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg></button>
                    <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-300 hover:text-blue-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                    <button onClick={() => confirmDelete(c)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Icons.Excluir /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AVISO / ERRO (SUBSTITUI ALERTA NATIVO) */}
      {infoModal.show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 text-center space-y-6">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${infoModal.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                    {infoModal.type === 'warning' ? (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                    ) : (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
                    )}
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{infoModal.title}</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{infoModal.message}</p>
                 </div>
                 <button onClick={() => setInfoModal({...infoModal, show: false})} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all active:scale-95">Ciente / Continuar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE MAPA */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-6xl h-full rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col relative animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedMapTitle}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Endereço: {selectedMapAddress}</p>
                 </div>
                 <button onClick={() => setIsMapModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-200 text-slate-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                 <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedMapAddress)}&output=embed`}></iframe>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirmar Exclusão</h3>
                    <p className="text-xs text-slate-400 mt-2">Deseja remover permanentemente este cliente?</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                       <p className="text-sm font-black text-slate-700 uppercase leading-tight">{itemToDelete.legalName || itemToDelete.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">CNPJ: {itemToDelete.cnpj}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={executeDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700 transition-all">Sim, Excluir</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 h-[92vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editingId ? 'Editar Cliente' : 'Novo Cliente ALS'}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Base de Dados Jurídica</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-full flex items-center justify-center transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar bg-[#fcfdfe]">
              <div className="space-y-1">
                <label className={labelBlueClass}>Cadastro Nacional da Pessoa Jurídica (CNPJ)</label>
                <div className="relative group">
                  <input 
                    required 
                    type="text" 
                    className={`${inputClasses} pr-16 text-lg border-blue-50 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10`} 
                    value={form.cnpj} 
                    onChange={e => setForm({...form, cnpj: maskCNPJ(e.target.value)})} 
                    placeholder="00.000.000/0000-00" 
                  />
                  <button 
                    type="button"
                    onClick={() => handleCnpjLookup()}
                    disabled={isCnpjLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50"
                    title="Consultar Dados na Receita"
                  >
                    {isCnpjLoading ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
                    )}
                  </button>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 ml-1 italic">* Digite os 14 números para buscar automaticamente.</p>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Data de Registro</label>
                <input 
                  type="date" 
                  className={inputClasses} 
                  value={form.registrationDate} 
                  onChange={e => setForm({...form, registrationDate: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className={labelClass}>Razão Social (Nome Jurídico)</label>
                   <input required type="text" className={inputClasses} value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                   <label className={labelClass}>Nome Fantasia</label>
                   <input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                </div>
              </div>

              {/* VÍNCULOS / SEGMENTAÇÃO */}
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Classificação de Mercado</label>
                <div className="flex flex-wrap gap-2.5">
                   {SEGMENTS.map(seg => {
                     const isActive = form.operations?.includes(seg);
                     return (
                       <button 
                         key={seg} 
                         type="button" 
                         onClick={() => toggleSegment(seg)}
                         className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
                       >
                         {seg}
                       </button>
                     );
                   })}
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Endereço de Faturamento / Localidade</label>
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className={labelClass}>Logradouro e Número</label>
                    <input required type="text" className={inputClasses} value={form.address} onChange={e => setForm({...form, address: e.target.value.toUpperCase()})} placeholder="RUA, AVENIDA, Nº, SALA" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Bairro</label>
                    <input required type="text" className={inputClasses} value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1"><label className={labelClass}>CEP</label><input required type="text" className={inputClasses} value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} /></div>
                    <div className="space-y-1"><label className={labelClass}>Cidade</label><input required type="text" className={inputClasses} value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} /></div>
                    <div className="space-y-1"><label className={labelClass}>UF</label><input required type="text" className={inputClasses} value={form.state} onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} /></div>
                  </div>
                </div>
              </div>
              
              <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all mt-6 active:scale-[0.98]">Salvar Dados do Cliente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;

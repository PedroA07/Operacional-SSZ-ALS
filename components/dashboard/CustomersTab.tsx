
import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { maskCEP, maskCNPJ } from '../../utils/masks';
import { Icons } from '../../constants/icons';

interface CustomersTabProps {
  customers: Customer[];
  onSaveCustomer: (customer: Partial<Customer>, id?: string) => void;
  onDeleteCustomer: (id: string) => void;
  isAdmin: boolean;
}

const CustomersTab: React.FC<CustomersTabProps> = ({ customers, onSaveCustomer, onDeleteCustomer, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMapAddress, setSelectedMapAddress] = useState('');
  
  const initialForm: Partial<Customer> = {
    name: '',
    legalName: '',
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
    const cep = form.zipCode?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      handleCepLookup(cep);
    }
  }, [form.zipCode]);

  useEffect(() => {
    const cnpj = form.cnpj?.replace(/\D/g, '');
    if (cnpj && cnpj.length === 14 && !editingId) {
      handleCnpjLookup(cnpj);
    }
  }, [form.cnpj, editingId]);

  const handleCepLookup = async (cep: string) => {
    setIsCepLoading(true);
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
      }
    } catch (e) {
      console.warn("Falha no CEP");
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleCnpjLookup = async (cnpj: string) => {
    setIsCnpjLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (response.ok) {
        const data = await response.json();
        setForm(prev => ({
          ...prev,
          name: (data.nome_fantasia || data.razao_social || '').toUpperCase(),
          legalName: (data.razao_social || '').toUpperCase(),
          address: data.logradouro ? `${data.logradouro}${data.numero ? ', ' + data.numero : ''}` : prev.address,
          neighborhood: (data.bairro || prev.neighborhood || '').toUpperCase(),
          city: (data.municipio || prev.city || '').toUpperCase(),
          state: (data.uf || prev.state || '').toUpperCase(),
          zipCode: data.cep ? maskCEP(data.cep) : prev.zipCode
        }));
      }
    } catch (e) {
      console.warn("Falha no CNPJ");
    } finally {
      setIsCnpjLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    setForm(customer || initialForm);
    setEditingId(customer?.id);
    setIsModalOpen(true);
  };

  const confirmDelete = (customer: Customer) => {
    setItemToDelete(customer);
    setIsDeleteModalOpen(true);
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
    setIsMapModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomer(form, editingId);
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(c => 
    (c.legalName && c.legalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cnpj.includes(searchQuery)
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="PESQUISAR CLIENTE, RAZÃO OU CNPJ..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none bg-slate-50/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Busca /></div>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-lg active:scale-95">Novo Cliente</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Identificação Jurídica</th>
                <th className="px-8 py-5">CNPJ</th>
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
                  <td className="px-8 py-4 font-mono font-bold text-slate-500">{maskCNPJ(c.cnpj)}</td>
                  <td className="px-8 py-4">
                    <p className="text-slate-500 font-bold uppercase text-[9px]">{c.address}</p>
                    <p className="text-slate-400 font-black uppercase text-[10px] mt-1">{c.city} - {c.state}</p>
                  </td>
                  <td className="px-8 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenMap(c)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg></button>
                    <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-300 hover:text-blue-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                    <button onClick={() => confirmDelete(c)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Icons.Excluir /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CNPJ</label><input required type="text" className={inputClasses} value={form.cnpj} onChange={e => setForm({...form, cnpj: maskCNPJ(e.target.value)})} placeholder="00.000.000/0000-00" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-blue-600 uppercase ml-1">Razão Social</label><input required type="text" className={inputClasses} value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Fantasia</label><input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CEP</label><input required type="text" className={inputClasses} value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cidade</label><input required type="text" className={inputClasses} value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">UF</label><input required type="text" className={inputClasses} value={form.state} onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} /></div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all mt-4">Salvar Cliente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;

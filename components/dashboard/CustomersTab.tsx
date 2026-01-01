
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
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  
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

  // Monitor de CEP para busca automática
  useEffect(() => {
    const cep = form.zipCode?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      handleCepLookup(cep);
    }
  }, [form.zipCode]);

  // Monitor de CNPJ para busca automática
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="PESQUISAR RAZÃO SOCIAL, FANTASIA OU CNPJ..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none bg-slate-50/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            <Icons.Busca />
          </div>
        </div>
        <button className="px-6 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all flex items-center gap-2">
          <Icons.Busca />
          Pesquisar
        </button>
        <button onClick={() => handleOpenModal()} className="px-6 py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-lg">
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 text-slate-600">Identificação Jurídica</th>
                <th className="px-6 py-5">CNPJ</th>
                <th className="px-6 py-5">Endereço</th>
                <th className="px-6 py-5">Localidade</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-800 uppercase text-xs leading-tight">
                      {c.legalName || c.name}
                    </p>
                    {c.legalName && c.name !== c.legalName && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 truncate max-w-[250px]">
                        FANTASIA: {c.name}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {c.operations?.map(op => <span key={op} className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[7px] font-black uppercase">{op}</span>)}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                    {maskCNPJ(c.cnpj)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-500 font-bold uppercase text-[9px] leading-relaxed">{c.address}</p>
                    <p className="text-slate-400 font-bold uppercase text-[8px]">{c.neighborhood}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 font-black uppercase text-[10px]">{c.city} - {c.state}</p>
                    <p className="text-slate-400 font-bold font-mono text-[9px] mt-1">{maskCEP(c.zipCode || '')}</p>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenModal(c)} className="p-2.5 text-slate-300 hover:text-blue-500 transition-all"><Icons.Equipe /></button>
                    {isAdmin && (
                      <button onClick={() => onDeleteCustomer(c.id)} className="p-2.5 text-slate-300 hover:text-red-500 transition-all"><Icons.Excluir /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className={inputClasses} 
                      value={form.cnpj} 
                      onChange={e => setForm(prev => ({...prev, cnpj: maskCNPJ(e.target.value)}))} 
                      placeholder="00.000.000/0000-00"
                    />
                    {isCnpjLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Razão Social</label>
                  <input required type="text" className={inputClasses} value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                  <input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                  <div className="relative">
                    <input required type="text" className={inputClasses} value={form.zipCode} onChange={e => setForm(prev => ({...prev, zipCode: maskCEP(e.target.value)}))} />
                    {isCepLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-3 w-3 text-blue-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label><input required type="text" className={inputClasses} value={form.city} onChange={e => setForm(prev => ({...prev, city: e.target.value.toUpperCase()}))} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">UF</label><input required type="text" className={inputClasses} value={form.state} onChange={e => setForm(prev => ({...prev, state: e.target.value.toUpperCase()}))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label><input required type="text" className={inputClasses} value={form.address} onChange={e => setForm(prev => ({...prev, address: e.target.value.toUpperCase()}))} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label><input required type="text" className={inputClasses} value={form.neighborhood} onChange={e => setForm(prev => ({...prev, neighborhood: e.target.value.toUpperCase()}))} /></div>
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

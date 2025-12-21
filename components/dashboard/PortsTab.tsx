
import React, { useState, useEffect } from 'react';
import { Port } from '../../types';
import { maskCEP } from '../../utils/masks';

interface PortsTabProps {
  ports: Port[];
  onSavePort: (port: Partial<Port>, id?: string) => void;
}

const PortsTab: React.FC<PortsTabProps> = ({ ports, onSavePort }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMapAddress, setSelectedMapAddress] = useState('');

  const initialForm: Partial<Port> = {
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    cnpj: ''
  };

  const [form, setForm] = useState<Partial<Port>>(initialForm);

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
      }
    } catch (e) {
      setCepError('Erro de conexão CEP.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleOpenModal = (port?: Port) => {
    setCepError(null);
    if (port) {
      setForm(port);
      setEditingId(port.id);
    } else {
      setForm(initialForm);
      setEditingId(undefined);
    }
    setIsModalOpen(true);
  };

  const handleOpenMap = (port: Port) => {
    const fullAddress = `${port.address}, ${port.neighborhood || ''}, ${port.city} - ${port.state}`;
    setSelectedMapAddress(fullAddress);
    setIsMapModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePort(form, editingId);
    setIsModalOpen(false);
  };

  const filteredPorts = ports.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.cnpj.includes(searchQuery)
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <input 
            type="text" 
            placeholder="PESQUISAR PORTO..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 ml-4">Novo Porto</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Nome do Porto</th>
                <th className="px-6 py-5">CNPJ</th>
                <th className="px-6 py-5 min-w-[200px]">Endereço / Bairro</th>
                <th className="px-6 py-5">CEP</th>
                <th className="px-6 py-5">Localidade</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPorts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 uppercase text-sm">{p.name}</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{p.cnpj}</td>
                  <td className="px-6 py-4">
                    <p className="text-slate-500 font-bold uppercase break-words whitespace-normal leading-relaxed">{p.address}</p>
                    <p className="text-slate-400 font-medium uppercase text-[9px] mt-0.5">{p.neighborhood || '---'}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">{p.zipCode}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-bold uppercase">{p.city}</span>
                    <span className="ml-1 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 font-black">{p.state}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenMap(p)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden h-[80vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-lg uppercase">Visualização Local</h3>
              <button onClick={() => setIsMapModalOpen(false)} className="text-slate-300 hover:text-red-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedMapAddress)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}></iframe>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-lg uppercase">{editingId ? 'Editar Porto' : 'Novo Porto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label><input required type="text" className={inputClasses} value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label><input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                  <input required type="text" className={inputClasses} value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} />
                  {isCepLoading && <div className="absolute right-3 top-9 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label><input required type="text" className={inputClasses} value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">UF</label>
                  <select required className={inputClasses} value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                    <option value="">UF</option>{['SP','RJ','MG','ES','PR','SC','RS','MS','MT','GO','DF','BA','SE','AL','PE','PB','RN','CE','PI','MA','TO','PA','AP','AM','RR','RO','AC'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label><input required type="text" className={inputClasses} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label><input required type="text" className={inputClasses} value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} /></div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">Salvar Porto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortsTab;

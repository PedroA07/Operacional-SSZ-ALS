
import React, { useState, useMemo } from 'react';
import { Driver, OperationDefinition, Customer } from '../../types';
import { maskPhone, maskCPF, maskRG } from '../../utils/masks';
import { Icons } from '../../constants/icons';
import ListFilters from './shared/ListFilters';
import DriverModal from './drivers/DriverModal';

interface DriversTabProps {
  drivers: Driver[];
  customers: Customer[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, customers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCnhModalOpen, setIsCnhModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [currentCnhUrl, setCurrentCnhUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('todos');

  const handleOpenModal = (d?: Driver) => {
    setEditingDriver(d || null);
    setIsModalOpen(true);
  };

  const filteredDrivers = useMemo(() => {
    let result = drivers.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.cpf.includes(searchQuery) ||
      d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.beneficiaryName && d.beneficiaryName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (statusFilter !== 'todos') result = result.filter(d => d.status === statusFilter);
    result.sort((a, b) => sortBy === 'name_asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [drivers, searchQuery, sortBy, statusFilter]);

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
          <ListFilters 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            placeholder="BUSCAR MOTORISTA, BENEFICIÁRIO, CPF OU PLACA..."
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl h-[68px] shrink-0">Novo Motorista</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1500px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Beneficiário</th>
                <th className="px-6 py-5">Contato Direto</th>
                <th className="px-6 py-5">Documentação Completa</th>
                <th className="px-6 py-5">Frota / Equipamento</th>
                <th className="px-6 py-5">Tipo / Portal de Acesso</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border overflow-hidden shrink-0 shadow-inner">
                        {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-[10px] text-slate-300">ALS</div>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase text-[11px] leading-none">{d.name}</p>
                        <div className="mt-2 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50">
                           <p className="text-[7px] font-black text-blue-400 uppercase tracking-tighter leading-none">Beneficiário:</p>
                           <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">{d.beneficiaryName || 'O PRÓPRIO'}</p>
                           <p className="text-[8px] font-mono text-blue-400">{d.beneficiaryCnpj || maskCPF(d.cpf)}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <a href={`https://wa.me/55${d.phone.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] hover:underline">
                        <Icons.Whatsapp />
                        {maskPhone(d.phone)}
                      </a>
                      <p className="text-[9px] text-slate-400 font-bold lowercase truncate max-w-[150px]">{d.email || 'sem_email@als.com'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">CPF: <span className="text-slate-800 font-mono">{maskCPF(d.cpf)}</span></p>
                      <p className="text-[9px] font-black text-slate-500 uppercase">RG: <span className="text-slate-800 font-mono">{d.rg ? maskRG(d.rg) : '---'}</span></p>
                      <div className="flex items-center gap-2 pt-1">
                         <span className="text-[9px] font-black text-slate-500 uppercase">CNH: <span className="text-slate-800">{d.cnh || '---'}</span></span>
                         {d.cnhPdfUrl && (
                           <button onClick={() => { setCurrentCnhUrl(d.cnhPdfUrl!); setIsCnhModalOpen(true); }} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[7px] font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all">PDF</button>
                         )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="grid grid-cols-1 gap-2">
                       <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-mono font-bold shadow-sm">{d.plateHorse}</span>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-slate-300 uppercase leading-none">Cavalo</span>
                             <span className="text-[9px] text-slate-500 font-bold">{d.yearHorse || '---'}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold">{d.plateTrailer}</span>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-slate-300 uppercase leading-none">Carreta</span>
                             <span className="text-[9px] text-slate-500 font-bold">{d.yearTrailer || '---'}</span>
                          </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase border border-blue-100">{d.driverType}</span>
                      <div className="p-2 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                         <div className="flex justify-between items-center gap-4">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Login (ID):</span>
                            <span className="text-[9px] font-mono font-black text-blue-400">{d.cpf.replace(/\D/g,'')}</span>
                         </div>
                         <div className="flex justify-between items-center gap-4">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Senha Pad.:</span>
                            <span className="text-[9px] font-mono font-black text-white">{d.generatedPassword || '---'}</span>
                         </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => { setItemToDelete(d); setIsDeleteModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icons.Excluir /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DriverModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveDriver}
        editingDriver={editingDriver}
        availableOps={availableOps}
      />

      {isCnhModalOpen && currentCnhUrl && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 flex flex-col p-8 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-black uppercase text-sm">Visualizar CNH Escaneada</h3>
            <button onClick={() => setIsCnhModalOpen(false)} className="text-white bg-red-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Fechar</button>
          </div>
          <iframe src={currentCnhUrl} className="flex-1 rounded-[2.5rem] bg-white border-4 border-white/10" />
        </div>
      )}

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Icons.Excluir />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Registro</h3>
                    <p className="text-xs text-slate-400 mt-2">Remover permanentemente {itemToDelete.name}?</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                    <button onClick={() => { onDeleteDriver(itemToDelete.id); setIsDeleteModalOpen(false); }} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Confirmar</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;

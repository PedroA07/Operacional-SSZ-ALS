
import React, { useState, useMemo, useEffect } from 'react';
import { Driver, OperationDefinition, Customer, User } from '../../types';
import { maskPhone, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { Icons } from '../../constants/icons';
import { db } from '../../utils/storage';
import ListFilters from './shared/ListFilters';
import DriverModal from './drivers/DriverModal';
import DriverDossierAction from './drivers/DriverDossierAction';
import DriverVinculosCell from './drivers/DriverVinculosCell';
import SmartOperationTable from './operations/SmartOperationTable';
import AuthorizedPersonsTab from './AuthorizedPersonsTab';

interface DriversTabProps {
  userId: string;
  drivers: Driver[];
  customers: Customer[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ userId, drivers, customers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [activeSubTab, setActiveSubTab] = useState<'motoristas' | 'autorizados'>('motoristas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCnhModalOpen, setIsCnhModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [currentCnhUrl, setCurrentCnhUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('todos');
  
  const [users, setUsers] = useState<User[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const fetchUsers = async () => {
    const data = await db.getUsers();
    setUsers(data);
  };

  // Busca users só na montagem e quando o modal fecha (não a cada sync de drivers)
  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (!isModalOpen) fetchUsers(); }, [isModalOpen]);

  // Mapa para lookup O(1) em vez de .find() por linha de tabela
  const usersMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach(u => {
      if (u.driverId) m.set(u.driverId, u);
      if (u.username) m.set(u.username, u);
    });
    return m;
  }, [users]);

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

  const columns = useMemo(() => [ // eslint-disable-next-line react-hooks/exhaustive-deps
    {
      key: 'identificacao',
      label: 'Identificação / Beneficiário',
      render: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border overflow-hidden shrink-0 shadow-inner">
            {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white"><img src="/logo.jpg" alt="ALS" className="w-6 h-6 object-contain" /></div>}
          </div>
          <div>
            <p className="font-black text-slate-800 uppercase text-[11px] leading-none">{d.name}</p>
            <div className="mt-2 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50">
               <p className="text-[7px] font-black text-blue-400 uppercase tracking-tighter leading-none">Beneficiário:</p>
               <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">{d.beneficiaryName || 'O PRÓPRIO'}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contato',
      label: 'Contato Direto',
      render: (d: Driver) => (
        <div className="space-y-1">
          <a href={`https://wa.me/55${(d.phone || '').replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] hover:underline">
            <Icons.Whatsapp />
            {maskPhone(d.phone)}
          </a>
          <p className="text-[9px] text-slate-400 font-bold lowercase truncate max-w-[150px]">{d.email || 'sem_email@als.com'}</p>
        </div>
      ),
    },
    {
      key: 'documentacao',
      label: 'Documentação',
      render: (d: Driver) => (
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase">CPF: <span className="text-slate-800 font-mono">{maskCPF(d.cpf)}</span></p>
          <div className="flex items-center gap-2 pt-1">
             <span className="text-[9px] font-black text-slate-500 uppercase">CNH: <span className="text-slate-800">{d.cnh || '---'}</span></span>
             {d.cnhPdfUrl && (
               <button onClick={() => { setCurrentCnhUrl(d.cnhPdfUrl!); setIsCnhModalOpen(true); }} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[7px] font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all">PDF</button>
             )}
          </div>
        </div>
      ),
    },
    {
      key: 'frota',
      label: 'Frota / Equipamento',
      render: (d: Driver) => (
        <div className="grid grid-cols-1 gap-3">
           <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-10">Cavalo:</span>
              <span className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-mono font-bold shadow-sm">{d.plateHorse}</span>
              <span className="text-[9px] text-slate-500 font-bold">{d.yearHorse || '---'}</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-10">Carreta:</span>
              <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold">{d.plateTrailer}</span>
              <span className="text-[9px] text-slate-500 font-bold">{d.yearTrailer || '---'}</span>
           </div>
        </div>
      ),
    },
    {
      key: 'vinculos',
      label: 'Vínculos Operacionais',
      render: (d: Driver) => <DriverVinculosCell driver={d} />,
    },
    {
      key: 'acesso',
      label: 'Acesso Portal',
      render: (d: Driver) => {
        const linkedUser = usersMap.get(d.id) || usersMap.get((d.cpf || '').replace(/\D/g,''));
        const passVisible = showPasswords[d.id];
        return (
          <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-2 min-w-[200px]">
             <div className="flex justify-between items-center">
                <span className="text-[7px] font-black text-slate-500 uppercase">Login</span>
                <span className="text-[10px] font-mono font-black text-blue-400">{(d.cpf || '').replace(/\D/g,'')}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[7px] font-black text-slate-500 uppercase">Senha</span>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-mono font-black text-white">{passVisible ? (linkedUser?.password || '---') : '••••••••'}</span>
                   <button onClick={() => setShowPasswords(prev => ({...prev, [d.id]: !prev[d.id]}))} className="text-slate-600 hover:text-white transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d={passVisible ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}/></svg>
                   </button>
                </div>
             </div>
             <div className="pt-1.5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[7px] font-black text-amber-500 uppercase">Chave Contrato</span>
                <span className="text-[10px] font-mono font-black text-amber-200">
                   {d.beneficiaryCnpj ? d.beneficiaryCnpj.replace(/\D/g,'').slice(-4) : (d.cpf || '').replace(/\D/g,'').slice(-4)}
                </span>
             </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (d: Driver) => (
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {d.status}
        </span>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (d: Driver) => (
        <div className="flex justify-end gap-1">
          <DriverDossierAction driver={d} />
          <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
          <button onClick={() => { setItemToDelete(d); setIsDeleteModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icons.Excluir /></button>
        </div>
      ),
    },
  ], [usersMap, showPasswords, handleOpenModal]);

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Sub-abas: Motoristas | Pessoas Autorizadas */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setActiveSubTab('motoristas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'motoristas' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
          Motoristas
        </button>
        <button
          onClick={() => setActiveSubTab('autorizados')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'autorizados' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Pessoas Autorizadas
        </button>
      </div>

      {activeSubTab === 'autorizados' ? (
        <AuthorizedPersonsTab />
      ) : (
      <>
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

      <SmartOperationTable
        userId={userId}
        componentId="drivers-list"
        columns={columns}
        data={filteredDrivers}
        title="Motoristas Cadastrados"
        hideInternalSearch
        noMaxHeight
      />
      </>
      )}

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

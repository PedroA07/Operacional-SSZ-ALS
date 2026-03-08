
import React, { useState, useEffect, forwardRef } from 'react';
import { Staff, User } from '../../types';
import { db } from '../../utils/storage';
import StaffModal from './staff/StaffModal';
import { maskPhone } from '../../utils/masks';
import PhotoViewerModal from '../shared/PhotoViewerModal';

interface StaffTabProps {
  staffList: Staff[];
  currentUser: User;
  onSaveStaff: (staff: Staff, password?: string) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  forceEditStaffId?: string | null;
  onCloseForceEdit?: () => void;
}

const StaffTab = forwardRef<HTMLDivElement, StaffTabProps>(({ 
  staffList, 
  currentUser, 
  onSaveStaff, 
  onDeleteStaff, 
  forceEditStaffId, 
  onCloseForceEdit 
}, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [viewerData, setViewerData] = useState<{url: string, name: string} | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showPasswordsList, setShowPasswordsList] = useState<Record<string, boolean>>({});

  const loadUsers = async () => {
    const u = await db.getUsers();
    setUsers(u);
  };

  useEffect(() => {
    loadUsers();
  }, [staffList, isModalOpen]);

  useEffect(() => {
    if (forceEditStaffId) {
      const staff = staffList.find(s => s.id === forceEditStaffId);
      if (staff) {
        handleEdit(staff);
        if (onCloseForceEdit) onCloseForceEdit();
      }
    }
  }, [forceEditStaffId, staffList]);

  const isAdmin = currentUser.role === 'admin';
  const canEdit = (staffId: string) => isAdmin || currentUser.staffId === staffId;

  const handleEdit = (s: Staff) => {
    setSelectedStaff(s);
    setIsModalOpen(true);
  };

  const confirmDelete = (s: Staff) => {
    setItemToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      setIsProcessing(true);
      await onDeleteStaff(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6" ref={ref}>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Contatos e Acessos</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { 
              setSelectedStaff(null);
              setIsModalOpen(true); 
            }} 
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
          >
            Novo Colaborador
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map(s => {
          const linkedUser = users.find(u => u.staffId === s.id);
          const isPassVisible = showPasswordsList[s.id];
          const hasEditRights = canEdit(s.id);
          
          return (
            <div key={s.id} className={`bg-white rounded-[2.5rem] p-8 border ${s.status === 'Inativo' ? 'border-red-100' : 'border-slate-200'} shadow-sm hover:shadow-xl transition-all flex flex-col`}>
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <button 
                      onClick={() => s.photo && setViewerData({ url: s.photo, name: s.name })}
                      className={`w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner transition-transform ${s.photo ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
                    >
                        {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <img src="@/public/logo.jfif" alt="ALS" className="w-6 h-6 object-contain" />}
                    </button>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.status === 'Ativo' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <h4 className="font-black text-slate-800 uppercase text-sm leading-tight break-words">{s.name}</h4>
                       {s.role === 'admin' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[6px] font-black uppercase shrink-0 shadow-sm shadow-blue-500/10">Admin</span>}
                    </div>
                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-1 tracking-tighter">{s.position}</p>
                 </div>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-slate-50 flex-1">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Usuário</span>
                    <span className="text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl lowercase font-bold border border-blue-100/50">{s.username}</span>
                 </div>

                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Data Admissão</span>
                    <span className="text-slate-700 font-bold">{new Date(s.registrationDate).toLocaleDateString('pt-BR')}</span>
                 </div>
                 
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 mt-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="3"/></svg>
                       </div>
                       <p className="text-[10px] font-bold text-slate-700 lowercase truncate">{s.emailCorp || '---'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="3"/></svg>
                       </div>
                       <p className="text-[10px] font-black text-slate-700">{s.phoneCorp ? maskPhone(s.phoneCorp) : '---'}</p>
                    </div>
                 </div>

                 {isAdmin && (
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest pt-2 px-1">
                      <span className="text-slate-400">Senha Sistema</span>
                      <div className="flex items-center gap-2">
                        {/* normal-case garante que a senha mostre minúsculas e maiúsculas como salvas */}
                        <span className="text-blue-600 font-mono text-[10px] font-black bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 normal-case">
                          {isPassVisible ? (linkedUser?.password || '---') : '••••••••'}
                        </span>
                        <button onClick={() => setShowPasswordsList(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isPassVisible ? (
                               <path strokeWidth="3" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                               <g strokeWidth="3">
                                 <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                 <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                               </g>
                            )}
                          </svg>
                        </button>
                      </div>
                   </div>
                 )}
              </div>

              {hasEditRights && (
                <div className="mt-6 flex gap-2">
                   <button onClick={() => handleEdit(s)} className="flex-1 py-3.5 bg-slate-900 text-white rounded-[1.4rem] text-[9px] font-black uppercase hover:bg-blue-600 transition-all shadow-md active:scale-95">Editar Cadastro</button>
                   {isAdmin && (
                     <button onClick={() => confirmDelete(s)} className="px-4.5 py-3.5 bg-red-50 text-red-500 rounded-[1.4rem] border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                     </button>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StaffModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedStaff(null); }}
        onSave={onSaveStaff}
        editingStaff={selectedStaff}
        currentUser={currentUser}
        allUsers={users}
      />

      <PhotoViewerModal 
        isOpen={!!viewerData}
        url={viewerData?.url || ''}
        title={viewerData?.name || ''}
        onClose={() => setViewerData(null)}
      />

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-100 animate-pulse">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Excluir Colaborador</h3>
                    <p className="text-sm text-slate-400 mt-2">Deseja remover permanentemente este cadastro e todos os seus privilégios de acesso?</p>
                    <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                       <p className="text-sm font-black text-slate-700 uppercase leading-tight">{itemToDelete.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cargo: {itemToDelete.position}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="py-4.5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
                    <button onClick={executeDelete} className="py-4.5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700 transition-all active:scale-95">Sim, Excluir</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
});

export default StaffTab;

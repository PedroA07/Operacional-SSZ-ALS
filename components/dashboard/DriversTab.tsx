
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Driver, OperationDefinition, User, Customer } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';
import { fileStorage } from '../../utils/fileStorage';
import { driverAuthService } from '../../utils/driverAuthService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DriverProfileTemplate from './forms/DriverProfileTemplate';
import { Icons } from '../../constants/icons';
import ListFilters from './shared/ListFilters';

interface DriversTabProps {
  drivers: Driver[];
  customers: Customer[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, customers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isCnhModalOpen, setIsCnhModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [currentCnhUrl, setCurrentCnhUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [deepSearchCPF, setDeepSearchCPF] = useState('');
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepSearchResult, setDeepSearchResult] = useState<Driver | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<Driver | null>(null);

  const [tempCategory, setTempCategory] = useState(availableOps[0]?.category || '');
  const [tempClient, setTempClient] = useState('Geral');
  
  const [visibility, setVisibility] = useState({
    driverInfo: true,
    contacts: true,
    equipment: true,
    type: true,
    beneficiary: true,
    whatsapp: true,
    operations: true,
    portal: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cnhFileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '',
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true, cnhPdfUrl: ''
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const loadUsers = async () => {
    const u = await db.getUsers();
    setUsers(u || []);
  };

  useEffect(() => { loadUsers(); }, [drivers, isModalOpen]);

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d, operations: d.operations || [] } : initialForm);
    setEditingId(d?.id);
    setDuplicateAlert(null);
    setTempCategory(availableOps[0]?.category || '');
    setTempClient('Geral');
    setIsModalOpen(true);
  };

  const handleOpenPreview = (d: Driver) => {
    setSelectedDriver(d);
    setIsPreviewModalOpen(true);
  };

  const handleViewCnh = (url: string) => {
    setCurrentCnhUrl(url);
    setIsCnhModalOpen(true);
  };

  const handleDeepSearch = async () => {
    if (deepSearchCPF.length < 11) return;
    setIsDeepSearching(true);
    setDeepSearchResult(null);
    try {
      const found = await db.getDriverByCPF(deepSearchCPF);
      if (found) setDeepSearchResult(found);
      else alert("Nenhum motorista encontrado.");
    } catch (e) {
      alert("Falha na consulta.");
    } finally {
      setIsDeepSearching(false);
    }
  };

  const checkCPFExistence = async (cpf: string) => {
    if (editingId) return;
    if (cpf.replace(/\D/g, '').length === 11) {
      const found = await db.getDriverByCPF(cpf);
      setDuplicateAlert(found || null);
    } else {
      setDuplicateAlert(null);
    }
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      onDeleteDriver(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCnhUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, cnhPdfUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addOperation = () => {
    if (!tempCategory || !tempClient) return;
    const exists = form.operations?.some(op => op.category === tempCategory && op.client === tempClient);
    if (exists) return;
    setForm(prev => ({
      ...prev,
      operations: [...(prev.operations || []), { category: tempCategory, client: tempClient }]
    }));
  };

  const removeOperation = (idx: number) => {
    setForm(prev => ({
      ...prev,
      operations: prev.operations?.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (duplicateAlert && !editingId) {
      alert("Este CPF já possui cadastro.");
      return;
    }
    
    setIsSaving(true);
    try {
      const drvId = editingId || `drv-${Date.now()}`;
      let finalPhoto = form.photo || '';
      let finalCnh = form.cnhPdfUrl || '';

      // UPLOAD PARA R2 SE FOR BASE64 (NOVO ARQUIVO)
      if (finalPhoto.startsWith('data:')) {
        finalPhoto = await fileStorage.uploadDriverProfile(finalPhoto, drvId);
      }
      if (finalCnh.startsWith('data:')) {
        finalCnh = await fileStorage.uploadDriverCNH(finalCnh, drvId);
      }

      const updatedForm = { ...form, photo: finalPhoto, cnhPdfUrl: finalCnh };
      const { password } = await driverAuthService.syncUserRecord(drvId, updatedForm, form.generatedPassword);
      
      await onSaveDriver({ 
        ...updatedForm, 
        id: drvId,
        generatedPassword: password
      }, editingId);
      
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    let result = drivers.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.cpf.includes(searchQuery) ||
      d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter !== 'todos') result = result.filter(d => d.status === statusFilter);
    result.sort((a, b) => sortBy === 'name_asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [drivers, searchQuery, sortBy, statusFilter]);

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

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
            placeholder="BUSCAR MOTORISTA, CPF OU PLACA..."
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl h-[68px] shrink-0">Novo Motorista</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1400px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Beneficiário</th>
                <th className="px-6 py-5">Documentação</th>
                <th className="px-6 py-5">Equipamento</th>
                <th className="px-6 py-5">Portal</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border overflow-hidden">
                        {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-[8px] text-slate-300">ALS</div>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase">{d.name}</p>
                        <p className="text-[8px] text-slate-400 uppercase">{d.beneficiaryName || 'Favorecido Próprio'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[9px] font-black text-slate-500">CPF: <span className="text-slate-800">{d.cpf}</span></p>
                    {d.cnhPdfUrl && (
                      <button onClick={() => handleViewCnh(d.cnhPdfUrl!)} className="mt-1 flex items-center gap-1.5 text-red-600 font-black text-[8px] uppercase">
                        <Icons.Formularios /> Ver CNH PDF
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-mono">{d.plateHorse}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-blue-50 px-2 py-1 rounded text-[9px] font-black text-blue-600">
                      ID: {d.cpf.replace(/\D/g,'')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenPreview(d)} className="p-2 text-slate-400 hover:text-blue-600"><Icons.Formularios /></button>
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-400 hover:text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => { setItemToDelete(d); setIsDeleteModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-500"><Icons.Excluir /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] animate-in zoom-in-95">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg uppercase">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)}><Icons.Excluir /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-3 space-y-6">
                  <div className="space-y-1">
                    <label className={labelClass}>Foto de Perfil</label>
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-3xl bg-slate-100 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden group">
                      {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <div className="text-center p-4"><p className="text-[8px] font-black text-slate-400 uppercase">Anexar Foto</p></div>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>CNH Digitalizada (PDF)</label>
                    <div onClick={() => cnhFileInputRef.current?.click()} className="py-4 rounded-2xl bg-red-50 border-2 border-dashed border-red-200 flex items-center justify-center cursor-pointer hover:bg-red-100 transition-all group">
                       <span className="text-[8px] font-black text-red-600 uppercase">{form.cnhPdfUrl ? 'PDF Carregado ✓' : 'Anexar CNH PDF'}</span>
                    </div>
                    <input type="file" ref={cnhFileInputRef} className="hidden" accept="application/pdf" onChange={handleCnhUpload} />
                  </div>
                </div>

                <div className="col-span-9 space-y-6">
                  <div className="space-y-1">
                    <label className={labelClass}>Nome Completo</label>
                    <input required className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>CPF</label>
                      <input required className={inputClasses} value={form.cpf} onChange={e => {
                        const val = maskCPF(e.target.value);
                        setForm({...form, cpf: val});
                        checkCPFExistence(val);
                      }} />
                    </div>
                    <div className="space-y-1"><label className={labelClass}>Registro CNH</label><input className={inputClasses} value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value.toUpperCase()})} /></div>
                    <div className="space-y-1"><label className={labelClass}>Celular</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className={labelClass}>Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                    <div className="space-y-1"><label className={labelClass}>Placa Carreta</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} /></div>
                  </div>
                  
                  <div className="p-6 bg-slate-900 rounded-3xl text-white">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase mb-4">Dados de Pagamento</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[8px] opacity-60">Beneficiário</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-xs" value={form.beneficiaryName} onChange={e => setForm({...form, beneficiaryName: e.target.value.toUpperCase()})} /></div>
                      <div className="space-y-1"><label className="text-[8px] opacity-60">CPF/CNPJ Chave</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-xs" value={form.beneficiaryCnpj} onChange={e => setForm({...form, beneficiaryCnpj: e.target.value})} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:opacity-50">
                {isSaving ? 'Enviando Arquivos e Gravando...' : 'Salvar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PDF CNH */}
      {isCnhModalOpen && currentCnhUrl && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 flex flex-col p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-black uppercase text-sm">Visualizar CNH</h3>
            <button onClick={() => setIsCnhModalOpen(false)} className="text-white bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black">Fechar</button>
          </div>
          <iframe src={currentCnhUrl} className="flex-1 rounded-3xl bg-white" />
        </div>
      )}
    </div>
  );
};

export default DriversTab;

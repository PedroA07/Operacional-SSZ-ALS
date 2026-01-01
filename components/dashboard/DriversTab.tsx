
import React, { useState, useRef, useEffect } from 'react';
import { Driver, OperationDefinition, User } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';
import { driverAuthService } from '../../utils/driverAuthService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DriverProfileTemplate from './forms/DriverProfileTemplate';

interface DriversTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  
  // Opções de visibilidade para o PDF
  const [visibility, setVisibility] = useState({
    beneficiary: false,
    contacts: false,
    operations: false,
    status: false,
    portal: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '', cnhPdfUrl: '',
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true,
    tripsCount: 0
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const loadData = async () => {
    try {
      const u = await db.getUsers();
      setUsers(u || []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [drivers, isModalOpen]);

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d } : initialForm);
    setEditingId(d?.id);
    setIsModalOpen(true);
  };

  const handleOpenPreview = (d: Driver) => {
    setSelectedDriver(d);
    // Reseta visibilidade para o padrão (mínimo solicitado pelo usuário)
    setVisibility({
      beneficiary: false,
      contacts: false,
      operations: false,
      status: false,
      portal: false
    });
    setIsPreviewModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, cnhPdfUrl: reader.result as string }));
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Por favor, selecione um arquivo no formato PDF ou Imagem.");
      e.target.value = '';
    }
  };

  const handleLinkChange = (link: string) => {
    let groupName = form.whatsappGroupName || '';
    if (link && !form.whatsappGroupName) {
      const parts = link.split('/');
      const code = parts[parts.length - 1];
      if (code) groupName = `GRUPO ${code.substring(0, 8).toUpperCase()}`;
    }
    setForm(prev => ({ ...prev, whatsappGroupLink: link, whatsappGroupName: groupName }));
  };

  const toggleOperation = (category: string, clientName: string) => {
    const currentOps = [...(form.operations || [])];
    const index = currentOps.findIndex(op => op.category === category && op.client === clientName);
    if (index >= 0) currentOps.splice(index, 1);
    else currentOps.push({ category, client: clientName });
    setForm(prev => ({ ...prev, operations: currentOps }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const drvId = editingId || `drv-${Date.now()}`;
      
      const finalForm = {
        ...form,
        beneficiaryName: form.beneficiaryName || form.name,
        beneficiaryPhone: form.beneficiaryPhone || form.phone,
        beneficiaryCnpj: form.beneficiaryCnpj || form.cpf,
        beneficiaryEmail: form.beneficiaryEmail || form.email,
        registrationDate: form.registrationDate || new Date().toISOString(),
        statusLastChangeDate: (!editingId || (editingId && drivers.find(d => d.id === editingId)?.status !== form.status)) 
          ? new Date().toISOString() 
          : form.statusLastChangeDate || new Date().toISOString()
      };

      const { password } = await driverAuthService.syncUserRecord(drvId, finalForm, form.generatedPassword);
      
      await onSaveDriver({ 
        ...finalForm, 
        id: drvId,
        generatedPassword: password 
      }, editingId);
      
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`FALHA AO SALVAR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (driverId: string) => {
    const newPass = prompt("Digite a nova senha para este motorista:");
    if (newPass && newPass.length >= 4) {
      await driverAuthService.updatePassword(driverId, newPass);
      await loadData();
      alert("Senha atualizada com sucesso!");
    }
  };

  const openPdf = (url?: string) => {
    if (!url) return;
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  const handleDownloadProfile = async () => {
    if (!selectedDriver) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // PÁGINA 1: DADOS
      const dataEl = document.getElementById(`driver-profile-card-${selectedDriver.id}`);
      if (dataEl) {
        const canvas1 = await html2canvas(dataEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);
      }

      // PÁGINA 2: CNH (SE HOUVER)
      if (selectedDriver.cnhPdfUrl) {
        pdf.addPage();
        const cnhEl = document.getElementById(`driver-cnh-attachment-${selectedDriver.id}`);
        if (cnhEl) {
          const canvas2 = await html2canvas(cnhEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
          const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);
        }
      }

      pdf.save(`FICHA_CADASTRAL_${selectedDriver.name.replace(/\s+/g, '_')}.pdf`);
      setIsPreviewModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <input 
            type="text" 
            placeholder="PESQUISAR MOTORISTA, CPF OU PLACA..." 
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:bg-white focus:border-blue-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl active:scale-95">Novo Cadastro</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">1. Identificação / Beneficiário</th>
                <th className="px-6 py-5 text-blue-600">2. Documentos</th>
                <th className="px-6 py-5">3. Contatos / Grupo</th>
                <th className="px-6 py-5">4. Equipamento</th>
                <th className="px-6 py-5">5. Vínculo</th>
                <th className="px-6 py-5">6. Status</th>
                <th className="px-6 py-5">7. Portal</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => {
                const linkedUser = users.find(u => u.driverId === d.id || (u.username === d.cpf.replace(/\D/g, '')));
                const isPassVisible = showPassMap[d.id];
                
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 align-top transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                         <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 ring-1 ring-slate-200">
                           {d.photo ? <img src={d.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[8px]">ALS</div>}
                         </div>
                         <div className="min-w-0">
                            <p className="font-black text-slate-800 uppercase text-[11px] leading-tight whitespace-normal max-w-[200px]">{d.name}</p>
                            <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                               <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest border-b border-blue-50 pb-1 mb-1">Dados de Pagamento</p>
                               <p className="text-[9px] font-black text-slate-700 uppercase whitespace-normal leading-tight">{d.beneficiaryName || d.name}</p>
                               <p className="text-[8px] font-mono font-bold text-slate-500">{d.beneficiaryCnpj || d.cpf}</p>
                               <p className="text-[8px] font-bold text-slate-500">{d.beneficiaryPhone || d.phone}</p>
                               <p className="text-[7px] font-medium text-slate-400 lowercase italic">{d.beneficiaryEmail || d.email}</p>
                               <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[6px] font-black text-slate-300 uppercase">Forma:</span>
                                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[7px] font-black text-blue-600">{d.paymentPreference || 'PIX'}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                         <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400">CPF:</span>
                            <span className="text-[9px] font-mono font-bold text-slate-700">{d.cpf}</span>
                         </div>
                         <div className="flex justify-between items-center px-2 py-1">
                            <span className="text-[8px] font-black text-slate-400">RG:</span>
                            <span className="text-[9px] font-mono font-bold text-slate-600">{d.rg || '---'}</span>
                         </div>
                         <div className="flex justify-between items-center px-2 py-1">
                            <span className="text-[8px] font-black text-slate-400">CNH:</span>
                            <span className="text-[9px] font-mono font-bold text-slate-600">{d.cnh || '---'}</span>
                         </div>
                         <button 
                            onClick={() => d.cnhPdfUrl && openPdf(d.cnhPdfUrl)}
                            disabled={!d.cnhPdfUrl}
                            className={`w-full flex items-center justify-center gap-1.5 mt-1 px-2 py-1 rounded-md text-[8px] font-black uppercase border transition-all ${d.cnhPdfUrl ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}`}
                         >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            {d.cnhPdfUrl ? 'Ver CNH (PDF)' : 'Sem PDF'}
                         </button>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-2">
                         <div className="space-y-0.5">
                            <p className="text-blue-600 font-black text-[10px] leading-none">{d.phone}</p>
                            <p className="text-slate-400 font-bold text-[8px] lowercase truncate max-w-[130px]">{d.email || 'sem e-mail'}</p>
                         </div>
                         {d.whatsappGroupLink ? (
                           <div className="space-y-1.5 pt-2 border-t border-slate-100">
                             <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{d.whatsappGroupName || 'Grupo'}</p>
                             <a 
                               href={d.whatsappGroupLink} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                             >
                               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                               Abrir Grupo
                             </a>
                           </div>
                         ) : (
                           <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1 opacity-30">
                              <p className="text-[7px] font-black text-slate-300 uppercase">Sem Grupo</p>
                           </div>
                         )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                       <div className="space-y-2">
                          <div className="bg-slate-900 px-3 py-2 rounded-xl text-white">
                             <p className="text-[7px] font-black text-blue-400 uppercase mb-0.5">Cavalo:</p>
                             <div className="flex justify-between items-baseline">
                               <span className="text-[10px] font-black font-mono">{d.plateHorse}</span>
                               <span className="text-[8px] font-bold text-slate-400">{d.yearHorse || '---'}</span>
                             </div>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                             <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Carreta:</p>
                             <div className="flex justify-between items-baseline">
                               <span className="text-[10px] font-black font-mono text-slate-700">{d.plateTrailer}</span>
                               <span className="text-[8px] font-bold text-slate-400">{d.yearTrailer || '---'}</span>
                             </div>
                          </div>
                       </div>
                    </td>

                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {(d.operations || []).length > 0 ? d.operations.map((op, idx) => (
                             <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[7px] font-black uppercase">
                                {op.client === 'GERAL' ? op.category : op.client}
                             </span>
                          )) : <span className="text-[8px] font-bold text-slate-300 uppercase italic underline decoration-red-200">Sem Vínculo</span>}
                       </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border w-fit ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {d.status}
                        </span>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Desde:</p>
                          <p className="text-[9px] font-bold text-slate-600 mt-1">
                            {d.statusLastChangeDate ? new Date(d.statusLastChangeDate).toLocaleDateString('pt-BR') : '---'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1.5 min-w-[140px]">
                         <div className="flex justify-between items-center text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                            <span>Login:</span>
                            <span className="text-slate-700 font-mono font-black">{linkedUser?.username || d.cpf.replace(/\D/g, '')}</span>
                         </div>
                         <div className="flex justify-between items-center text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                            <span>Senha:</span>
                            <div className="flex items-center gap-2">
                               <span className="text-slate-700 font-mono bg-white px-1.5 py-0.5 rounded border border-blue-100 font-black min-w-[80px] text-center">
                                 {isPassVisible ? (linkedUser?.password || 'als-2025') : '••••••••'}
                               </span>
                               <button onClick={() => setShowPassMap(p => ({...p, [d.id]: !p[d.id]}))} className="text-blue-500 hover:text-blue-700 active:scale-90 transition-transform">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     {isPassVisible ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                     ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                     )}
                                  </svg>
                               </button>
                            </div>
                         </div>
                         <button onClick={() => handleUpdatePassword(d.id)} className="w-full mt-2 py-1 bg-white text-blue-600 rounded-lg border border-blue-200 text-[7px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Alterar Senha</button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <button 
                        onClick={() => handleOpenPreview(d)} 
                        className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Personalizar e Baixar Ficha (PDF)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 11l3 3L15 11" /></svg>
                      </button>
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => onDeleteDriver(d.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DINÂMICA */}
      {isPreviewModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-slate-50 w-full max-w-7xl h-full rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex animate-in zoom-in-95">
              
              {/* LADO ESQUERDO: CONTROLES */}
              <div className="w-96 bg-white border-r border-slate-200 p-10 flex flex-col">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">ALS</div>
                    <div>
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Exportador Pro</h3>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Privacidade de Dados</p>
                    </div>
                 </div>

                 <div className="flex-1 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Configurar Documento</p>
                    
                    {[
                      { id: 'beneficiary', label: 'Dados de Pagamento', sub: 'Exibe Beneficiário e Chaves PIX', icon: '💰' },
                      { id: 'contacts', label: 'Contatos e Grupos', sub: 'Exibe Telefone e Link de WhatsApp', icon: '📱' },
                      { id: 'operations', label: 'Vínculo Operacional', sub: 'Exibe Clientes Vinculados', icon: '🚛' },
                      { id: 'status', label: 'Status e Histórico', sub: 'Exibe Data de Registro e Status', icon: '🕒' },
                      { id: 'portal', label: 'Credenciais Portal', sub: 'Exibe Login e Senha Gerada', icon: '🔐' },
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => setVisibility(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof typeof visibility] }))}
                        className={`w-full p-5 rounded-3xl border-2 text-left transition-all group flex items-center gap-4 ${visibility[opt.id as keyof typeof visibility] ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${visibility[opt.id as keyof typeof visibility] ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                            {opt.icon}
                         </div>
                         <div className="flex-1">
                            <p className={`text-[10px] font-black uppercase tracking-tight ${visibility[opt.id as keyof typeof visibility] ? 'text-blue-700' : 'text-slate-500'}`}>{opt.label}</p>
                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{opt.sub}</p>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-4 transition-all flex items-center justify-center ${visibility[opt.id as keyof typeof visibility] ? 'border-blue-600' : 'border-slate-100'}`}>
                            {visibility[opt.id as keyof typeof visibility] && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                         </div>
                      </button>
                    ))}
                 </div>

                 <div className="pt-8 space-y-3">
                    <button 
                       disabled={isExporting}
                       onClick={handleDownloadProfile} 
                       className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-400"
                    >
                       {isExporting ? (
                         <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       ) : 'Gerar Documento PDF'}
                    </button>
                    <button onClick={() => setIsPreviewModalOpen(false)} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase hover:text-red-500 transition-all">Cancelar</button>
                 </div>
              </div>

              {/* LADO DIREITO: PREVIEW EM TEMPO REAL */}
              <div className="flex-1 bg-slate-200 p-12 overflow-y-auto flex flex-col items-center custom-scrollbar">
                 <div className="mb-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preview do Documento Final</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase italic">* A escala abaixo é reduzida apenas para visualização</p>
                 </div>
                 <div className="origin-top transform scale-[0.65] xl:scale-[0.8] shadow-[0_30px_100px_rgba(0,0,0,0.2)]">
                    <DriverProfileTemplate driver={selectedDriver} visibility={visibility} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* RESTANTE DOS MODAIS EXISTENTES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 h-[95vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-12 gap-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="col-span-8 space-y-8">
                <div className="flex gap-8 items-start">
                  <div className="relative group flex-shrink-0">
                    <div className="w-32 aspect-[3/4] rounded-[1.5rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-all shadow-inner" onClick={() => fileInputRef.current?.click()}>
                      {form.photo ? <img src={form.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2">Anexar<br/>Foto 3x4</span>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-xl focus:border-blue-500 outline-none shadow-sm transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm(prev => ({...prev, cpf: maskCPF(e.target.value)}))} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label><input className={inputClasses} value={form.rg} onChange={e => setForm(prev => ({...prev, rg: maskRG(e.target.value)}))} /></div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nº CNH</label>
                        <input className={inputClasses} value={form.cnh} onChange={e => setForm(prev => ({...prev, cnh: e.target.value}))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-blue-600 uppercase ml-1 tracking-widest">Documento CNH (Anexo PDF ou Imagem)</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => pdfInputRef.current?.click()} 
                          className={`flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border-2 border-dashed transition-all ${form.cnhPdfUrl ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          <span className="text-[10px] font-black uppercase tracking-tight">{form.cnhPdfUrl ? 'Documento Anexado ✓' : 'Clique para anexar CNH'}</span>
                        </button>
                        {form.cnhPdfUrl && (
                          <>
                            <button type="button" onClick={() => openPdf(form.cnhPdfUrl)} className="px-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                            <button type="button" onClick={() => setForm(prev => ({...prev, cnhPdfUrl: ''}))} className="px-4 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </>
                        )}
                      </div>
                      <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf,image/*" onChange={handlePdfUpload} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">Telefone Principal</label><input required className={inputClasses} value={form.phone} onChange={e => setForm(prev => ({...prev, phone: maskPhone(e.target.value)}))} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail Operacional (Opcional)</label><input className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm(prev => ({...prev, email: e.target.value}))} /></div>
                </div>

                <div className="bg-emerald-50/40 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6">
                   <div className="flex items-center justify-between">
                     <div>
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">Dados do Beneficiário</h4>
                        <p className="text-[7px] text-emerald-400 font-bold uppercase mt-1">* Se deixado em branco, o sistema usará os dados do motorista acima.</p>
                     </div>
                     <div className="flex bg-white/60 p-1 rounded-xl border border-emerald-200">
                        {['PIX', 'TED'].map(pref => (
                          <button key={pref} type="button" onClick={() => setForm(prev => ({...prev, paymentPreference: pref as any}))} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${form.paymentPreference === pref ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-emerald-600'}`}>
                            {pref}
                          </button>
                        ))}
                     </div>
                   </div>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Nome Completo</label><input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm(prev => ({...prev, beneficiaryName: e.target.value.toUpperCase()}))} placeholder={form.name || "NOME DO MOTORISTA"} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">CNPJ / CPF</label><input className={inputClasses} value={form.beneficiaryCnpj} onChange={e => setForm(prev => ({...prev, beneficiaryCnpj: e.target.value.includes('/') ? maskCNPJ(e.target.value) : maskCPF(e.target.value)}))} placeholder={form.cpf || "CPF DO MOTORISTA"} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Telefone</label><input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm(prev => ({...prev, beneficiaryPhone: maskPhone(e.target.value)}))} placeholder={form.phone || "(13) 00000-0000"} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">E-mail</label><input className={`${inputClasses} lowercase`} value={form.beneficiaryEmail} onChange={e => setForm(prev => ({...prev, beneficiaryEmail: e.target.value}))} placeholder={form.email || "motorista@email.com"} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-indigo-50/40 p-8 rounded-[2.5rem] border border-indigo-100 space-y-5">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">WhatsApp do Grupo</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Link do Grupo</label>
                        <input className={inputClasses} value={form.whatsappGroupLink} onChange={e => handleLinkChange(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Nome do Grupo (Auto)</label>
                        <input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm(prev => ({...prev, whatsappGroupName: e.target.value.toUpperCase()}))} placeholder="EX: FROTA ALS 01" />
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-5">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Vínculo de Operações</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {availableOps.map(op => (
                        <div key={op.id} className="space-y-3 bg-white/50 p-4 rounded-3xl border border-slate-100">
                           <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                              <p className="text-[10px] font-black text-slate-800 uppercase">{op.category}</p>
                              <button
                                type="button"
                                onClick={() => toggleOperation(op.category, 'GERAL')}
                                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border-2 ${
                                  (form.operations || []).some(o => o.category === op.category && o.client === 'GERAL') 
                                  ? 'bg-slate-800 text-white border-slate-800' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-800 hover:text-slate-800'
                                }`}
                              >
                                { (form.operations || []).some(o => o.category === op.category && o.client === 'GERAL') ? '✓ ATIVO' : '+ GERAL' }
                              </button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {op.clients.map(client => {
                                const isSelected = (form.operations || []).some(o => o.category === op.category && o.client === client.name);
                                return (
                                  <button
                                    key={client.name}
                                    type="button"
                                    onClick={() => toggleOperation(op.category, client.name)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                  >
                                    {client.name}
                                  </button>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl">
                   <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Credenciais do Portal</h4>
                   <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/30 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-300 uppercase">Usuário (CPF)</label>
                        <div className="px-4 py-3 bg-white/5 rounded-xl text-[11px] font-mono text-white/60 select-all">{form.cpf?.replace(/\D/g, '') || 'Preencha o CPF...'}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-300 uppercase">Senha Personalizada (Opcional)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-white/5 rounded-xl text-[11px] font-mono text-white outline-none focus:bg-white/10 border border-white/10" 
                          placeholder="Senha padrão automática"
                          value={form.generatedPassword || ''}
                          onChange={e => setForm({...form, generatedPassword: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-700 uppercase">Equipamento</h4>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Ano Cav.</label><input className={inputClasses} value={form.yearHorse} onChange={e => setForm(prev => ({...prev, yearHorse: e.target.value}))} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Placa Carr.</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm(prev => ({...prev, plateTrailer: maskPlate(e.target.value)}))} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Ano Carr.</label><input className={inputClasses} value={form.yearTrailer} onChange={e => setForm(prev => ({...prev, yearTrailer: e.target.value}))} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-blue-50/40 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase">Parâmetros</h4>
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Tipo</label><select className={inputClasses} value={form.driverType} onChange={e => setForm(prev => ({...prev, driverType: e.target.value as any}))}><option value="Externo">Externo (Terceiro)</option><option value="Frota">Frota ALS</option><option value="Motoboy">Motoboy</option></select></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Status</label><select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
                   </div>
                </div>

                <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:bg-slate-400">
                  {isSaving ? 'Salvando...' : 'Finalizar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;

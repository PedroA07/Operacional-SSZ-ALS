import React, { useState } from 'react';
import { CustomColumn, StaySession } from '../../../types';
import CustomSelect from '../../shared/CustomSelect';

interface CustomColumnsManagerProps {
  session: StaySession;
  onUpdate: (updatedSession: StaySession) => void;
  onClose: () => void;
}

const CustomColumnsManager: React.FC<CustomColumnsManagerProps> = ({ session, onUpdate, onClose }) => {
  const [columns, setColumns] = useState<CustomColumn[]>(session.customColumns || []);
  const [newCol, setNewCol] = useState<Partial<CustomColumn>>({ label: '', type: 'text', formula: '' });

  const handleAddColumn = () => {
    if (!newCol.label) return;
    const col: CustomColumn = {
      id: `col-${Date.now()}`,
      label: newCol.label,
      type: newCol.type as any,
      formula: newCol.formula
    };
    const updated = [...columns, col];
    setColumns(updated);
    setNewCol({ label: '', type: 'text', formula: '' });
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const handleSave = () => {
    onUpdate({
      ...session,
      customColumns: columns,
      useCustomColumns: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Colunas Personalizadas</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerencie campos extras e fórmulas</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Nova Coluna */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Nova Coluna</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Nome da Coluna</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-[11px]" 
                  placeholder="Ex: Custo Extra"
                  value={newCol.label}
                  onChange={e => setNewCol({ ...newCol, label: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo</label>
                <CustomSelect
                  value={newCol.type || ''}
                  onChange={v => setNewCol({ ...newCol, type: v as any })}
                  options={[
                    { value: 'text', label: 'TEXTO' },
                    { value: 'number', label: 'NÚMERO' },
                    { value: 'formula', label: 'FÓRMULA' },
                    { value: 'date', label: 'DATA' },
                    { value: 'time', label: 'HORA' },
                    { value: 'datetime', label: 'DATA E HORA' },
                    { value: 'currency', label: 'MOEDA' },
                  ]}
                  inputClassName="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-[11px]"
                />
              </div>
              {newCol.type === 'formula' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Fórmula</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-mono text-[10px]" 
                    placeholder="Ex: {H} * 50"
                    value={newCol.formula}
                    onChange={e => setNewCol({ ...newCol, formula: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleAddColumn}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Colunas */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colunas Ativas</h4>
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {columns.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase italic">Nenhuma coluna personalizada definida.</p>
              ) : (
                columns.map(col => (
                  <div key={col.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-[10px] font-black">
                          {col.type === 'datetime' ? 'DT' : 
                           col.type === 'currency' ? '$' : 
                           col.type[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase">{col.label}</p>
                        {col.type === 'formula' && <p className="text-[9px] font-mono text-slate-400">{col.formula}</p>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveColumn(col.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dicas de Fórmulas */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Variáveis e Funções:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">{'{H}'}</span> - Horas Excedentes</div>
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">{'{V}'}</span> - Valor da Hora</div>
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">{'{T}'}</span> - Valor Total Estadia</div>
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">{'{NOME_COLUNA}'}</span> - Valor de outra coluna</div>
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">Math.round()</span> - Arredondar</div>
              <div className="text-[8px] font-bold text-slate-500 uppercase"><span className="text-blue-600 font-black">Math.max(a, b)</span> - Maior valor</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onClose}
              className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomColumnsManager;

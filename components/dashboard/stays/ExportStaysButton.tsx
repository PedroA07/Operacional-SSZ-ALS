import React from 'react';
import * as XLSX from 'xlsx';
import { StayRecord, StaySession } from '../../../types';

interface ExportStaysButtonProps {
  records: StayRecord[];
  session: StaySession;
  categoryName: string;
}

const ExportStaysButton: React.FC<ExportStaysButtonProps> = ({ records, session, categoryName }) => {
  
  const formatFullDateTime = (iso: string) => {
    if (!iso || iso.length < 10) return '';
    try {
      const [datePart, timePart] = iso.split('T');
      const [y, m, d] = datePart.split('-');
      const time = timePart ? timePart.substring(0, 5) : '00:00';
      return `${d}/${m}/${y} ${time}`;
    } catch (e) { return ''; }
  };

  const handleExport = () => {
    const headers = [
      'PROVEDOR',
      'NUMERO DA OS',
      'CLIENTE',
      'MOTORISTAS',
      'NAVIO/VIAGEM',
      'CONTAINER',
      'HORARIO PROGRAMADO',
      'CHEGADA',
      'SAIDA',
      'ATENDEU AGENDA',
      'FREE-TIME',
      'HORAS EXCEDENTES',
      'CUSTO POR HORA OU FRACAO',
      'CUSTO TOTAL',
      'OS AVULSA',
      'ANÁLISE'
    ];

    // Matriz de dados (Array of Arrays) para ter controle total sobre células e fórmulas
    const dataRows = records.map((r, index) => {
      const rowIndex = index + 2; // +1 pelo header, +1 pois o Excel começa em 1
      
      // Lógica Atendeu Agenda
      let atendeuAgenda = 'NAO';
      if (r.scheduledStart && r.arrivalTime) {
        const sched = new Date(r.scheduledStart).getTime();
        const arriv = new Date(r.arrivalTime).getTime();
        if (arriv <= sched) atendeuAgenda = 'SIM';
      }

      // Extrair apenas o número da hora excedente para o Excel
      // r.exceededHours vem como "5h 00m" ou "---"
      const exceededNum = r.exceededHours === '---' ? 0 : parseInt(r.exceededHours.split('h')[0]);

      return [
        'LUARA MEL VIEIRA', // PROVEDOR
        (r.os || '').toUpperCase(), // NUMERO DA OS
        categoryName.toUpperCase(), // CLIENTE (Nome da pasta/categoria no contexto operacional)
        (r.driverName || '').toUpperCase(), // MOTORISTAS
        (r.ship || '').toUpperCase(), // NAVIO/VIAGEM
        (r.container || '').toUpperCase(), // CONTAINER
        formatFullDateTime(r.scheduledStart), // HORARIO PROGRAMADO
        formatFullDateTime(r.arrivalTime), // CHEGADA
        formatFullDateTime(r.departureTime), // SAIDA
        atendeuAgenda, // ATENDEU AGENDA
        `${session.gracePeriodHours || 0}H`, // FREE-TIME
        exceededNum, // HORAS EXCEDENTES (Número para cálculo)
        session.costPerHour || 0, // CUSTO POR HORA
        { f: `L${rowIndex}*M${rowIndex}` }, // CUSTO TOTAL (Fórmula)
        '', // OS AVULSA
        ''  // ANÁLISE
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Configuração de Largura das Colunas
    const wscols = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, 
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, 
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    worksheet['!cols'] = wscols;

    // Ativar Filtros
    if (dataRows.length > 0) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ESTADIAS');

    const fileName = `PLANILHA_ESTADIAS_${categoryName.replace(/\|/g, '_')}_${new Date().getTime()}.xlsx`.toUpperCase();
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <button 
      onClick={handleExport}
      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Exportar Planilha
    </button>
  );
};

export default ExportStaysButton;
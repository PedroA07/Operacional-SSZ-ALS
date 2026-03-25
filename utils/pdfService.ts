
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const exportElementToPDF = async (element: HTMLElement, filename: string) => {
  if (!element) return;

  // Ocultar elementos com a classe 'hide-in-pdf' antes da captura
  const elementsToHide = element.querySelectorAll('.hide-in-pdf');
  elementsToHide.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      imageTimeout: 0,
      removeContainer: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save(filename);
  } catch (error) {
    console.error("Erro na geração do PDF:", error);
    throw error;
  } finally {
    // Restaurar visibilidade dos elementos
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
  }
};

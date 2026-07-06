
// Une vários PDFs em um só, renderizando cada página em canvas (pdfjs)
// e reconstruindo com jsPDF — mesmo padrão do compressPDFForStorage.

const RENDER_SCALE = 2;
const JPEG_QUALITY = 0.85;

async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

export async function mergePdfBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) throw new Error('Nenhum PDF para unir.');

  const pdfjsLib = await getPdfjsLib();
  const { jsPDF } = await import('jspdf');

  let doc: InstanceType<typeof jsPDF> | null = null;

  for (const blob of blobs) {
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgData = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const wMM = (viewport.width / RENDER_SCALE) * (25.4 / 72);
      const hMM = (viewport.height / RENDER_SCALE) * (25.4 / 72);
      const orientation = wMM > hMM ? 'l' : 'p';

      if (!doc) {
        doc = new jsPDF({ orientation, unit: 'mm', format: [wMM, hMM] });
      } else {
        doc.addPage([wMM, hMM], orientation);
      }
      doc.addImage(imgData, 'JPEG', 0, 0, wMM, hMM);
    }
  }

  if (!doc) throw new Error('Nenhuma página encontrada nos PDFs.');
  return doc.output('blob');
}

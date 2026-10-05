import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function snap(node, options = {}) {
  return html2canvas(node, {
    scale: options.scale ?? 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: options.width,
    height: options.height,
    windowWidth: options.width,
    windowHeight: options.height,
  });
}

/**
 * Exporta el nodo a PNG en formato 1080x1920 (vertical 9:16, estilo Story).
 * Aplica temporalmente la clase `invoice-doc--story` al nodo para forzar el layout vertical,
 * captura a tamaño exacto y revierte.
 */
export async function exportNodeToPng(node, filename = 'documento.png') {
  const TARGET_W = 1080;
  const TARGET_H = 1920;

  const hadStoryClass = node.classList.contains('invoice-doc--story');
  if (!hadStoryClass) node.classList.add('invoice-doc--story');

  // Forzar dimensiones exactas
  const prevWidth = node.style.width;
  const prevHeight = node.style.height;
  node.style.width = TARGET_W + 'px';
  node.style.height = TARGET_H + 'px';

  try {
    const canvas = await snap(node, { width: TARGET_W, height: TARGET_H, scale: 1 });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    node.style.width = prevWidth;
    node.style.height = prevHeight;
    if (!hadStoryClass) node.classList.remove('invoice-doc--story');
  }
}

export async function exportNodeToPdf(node, filename = 'documento.pdf') {
  // PDF queda en A4 vertical clásico — no aplica formato 9:16
  const canvas = await snap(node);
  const imgData = canvas.toDataURL('image/png');
  // A4: 210 x 297 mm
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
  } else {
    // multi-page if too tall
    let heightLeft = imgH;
    let position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
    heightLeft -= pageH - margin * 2;
    while (heightLeft > 0) {
      position = margin - (imgH - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
      heightLeft -= pageH - margin * 2;
    }
  }
  pdf.save(filename);
}

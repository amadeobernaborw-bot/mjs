import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function snap(node) {
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

export async function exportNodeToPng(node, filename = 'documento.png') {
  const canvas = await snap(node);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportNodeToPdf(node, filename = 'documento.pdf') {
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

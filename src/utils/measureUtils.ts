import { JudicialMeasure, DriveFile } from '../types';
import { generateJudicialMeasurePdfBlob } from './pdfGenerator';

/**
 * Converts a File or Blob into a Base64 string for persistence
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a Base64 string back into a standard binary Blob
 */
export function base64ToBlob(base64Data: string, contentType = 'application/pdf'): Blob {
  try {
    const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(base64Clean);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  } catch (err) {
    console.error('Error converting base64 to Blob:', err);
    return new Blob([], { type: contentType });
  }
}

/**
 * Converts a JudicialMeasure into a DriveFile compatible with the viewer and files index
 */
export function measureToDriveFile(m: JudicialMeasure): DriveFile {
  let blobUrl: string | undefined;
  let fileSize = m.pdfFileSize || 102400;

  // 1. If measure has a custom uploaded PDF stored in base64, restore its local Blob URL with priority #1
  // This guarantees 100% offline access, eliminates network latency, and avoids server rewrite/CORS issues
  if (m.hasCustomPdf && m.pdfBase64) {
    try {
      const customBlob = base64ToBlob(m.pdfBase64);
      blobUrl = URL.createObjectURL(customBlob);
      fileSize = customBlob.size;
    } catch (e) {
      console.warn('Could not restore Blob from base64:', e);
    }
  }

  // 2. If no base64, check for existing server-stored PDF URL or pre-existing blob URL
  if (!blobUrl && (m.serverPdfUrl || m.pdfBlobUrl)) {
    blobUrl = m.serverPdfUrl || m.pdfBlobUrl;
  }

  // 3. Fallback to generated PDF template if no custom PDF or blob URL exists
  if (!blobUrl) {
    const pdfBlob = generateJudicialMeasurePdfBlob(m);
    blobUrl = URL.createObjectURL(pdfBlob);
    fileSize = pdfBlob.size;
  }

  const safeOficio = (m.nroOficio || 'SN').replace(/[^a-zA-Z0-9]/g, '_');
  const safeVictima = (m.victima || 'Victima').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = m.pdfFileName || `Oficio_${safeOficio}_${safeVictima}.pdf`;

  const tags = [
    m.provenienteDe,
    m.medidaReciproca === 'Si' ? 'Medida Recíproca' : 'No Recíproca',
    `Oficio ${m.nroOficio}`,
    m.driveFolder ? `Carpeta: ${m.driveFolder}` : 'Carpeta: Medidas Judiciales',
    m.hasCustomPdf ? 'PDF Oficial Adjunto' : 'Acta Generada'
  ];

  return {
    id: m.driveFileId || m.id,
    name: fileName,
    mimeType: 'application/pdf',
    size: fileSize,
    createdTime: m.timestamp,
    modifiedTime: m.lastUpdated || m.timestamp,
    category: m.tipoMedida,
    tags,
    isHostedLocal: !m.driveFileId,
    serverPdfUrl: m.serverPdfUrl,
    localBlobUrl: blobUrl,
    pdfBase64: m.pdfBase64,
    description: `Oficio Judicial N° ${m.nroOficio}. Beneficiario/a: ${m.victima}. Denunciado/a: ${m.victimario}. Vigente: ${m.fechaDesde} hasta ${m.fechaHasta || 'Duración de la causa'}. Organismo emisor: ${m.provenienteDe}.${m.driveFolder ? ` [Google Drive: ${m.driveFolder}]` : ''}`,
    uploadedBy: m.updatedBy || 'Poder Judicial / Registro Central',
    folderPath: m.driveFolder || 'Medidas Judiciales',
    driveId: m.driveFileId,
    measureData: m,
  };
}

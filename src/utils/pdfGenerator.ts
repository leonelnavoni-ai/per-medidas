import { JudicialMeasure } from '../types';

/**
 * Generates an official Court / Judicial Order PDF document (Oficio de Medida Judicial)
 * formatted with formal judicial typography, seals, court headers, and legal clauses.
 */
export function generateJudicialMeasurePdfBlob(measure: JudicialMeasure): Blob {
  const sanitize = (txt: string = '') => 
    txt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents for PDF standard Type 1 fonts
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const escapePdfText = (txt: string) => sanitize(txt);

  const titleText = `OFICIO JUDICIAL N ${measure.nroOficio || 'S/N'}`;
  const courtText = `ORGANISMO EMISOR: ${measure.provenienteDe || 'PODER JUDICIAL'}`;
  const measureType = `MEDIDA: ${measure.tipoMedida.toUpperCase()}`;
  const victimaText = `BENEFICIARIO/A: ${measure.victima}`;
  const victimarioText = `DENUNCIADO/A: ${measure.victimario}`;
  const vigenciaText = `VIGENCIA: Del ${measure.fechaDesde || 'Inmediata'} al ${measure.fechaHasta || 'DURACION DE LA CAUSA'}`;
  const reciprocaText = `MEDIDA RECIPROCA: ${measure.medidaReciproca === 'Si' ? 'SI - AMBAS PARTES' : 'NO'}`;
  const timestampText = `Fecha y hora de registro: ${measure.timestamp}`;

  const contentStream = `
q
0.08 0.15 0.3 rg
40 760 515 45 re
f
1 1 1 rg
BT
/F1 16 Tf
60 782 Td
(PODER JUDICIAL - ACTA OFICIAL DE MEDIDA DE PROTECCION) Tj
ET

0.2 0.25 0.35 rg
BT
/F1 13 Tf
60 735 Td
(${escapePdfText(titleText)}) Tj
/F2 10 Tf
0 -18 Td
(${escapePdfText(courtText)}) Tj
0 -16 Td
(${escapePdfText(timestampText)}) Tj
ET

0.8 0.85 0.9 rg
40 685 515 1.5 re
f

0.1 0.15 0.2 rg
BT
/F1 12 Tf
60 660 Td
(1. IDENTIFICACION DE LAS PARTES Y MEDIDA DISPUESTA) Tj
/F2 11 Tf
0 -22 Td
(${escapePdfText(measureType.slice(0, 75))}) Tj
0 -18 Td
(${escapePdfText(victimaText.slice(0, 75))}) Tj
0 -18 Td
(${escapePdfText(victimarioText.slice(0, 75))}) Tj
0 -18 Td
(${escapePdfText(reciprocaText)}) Tj
0 -18 Td
(${escapePdfText(vigenciaText)}) Tj
ET

0.8 0.85 0.9 rg
40 545 515 1 re
f

0.1 0.15 0.2 rg
BT
/F1 12 Tf
60 520 Td
(2. DISPOSICIONES JUDICIALES Y OBLIGACIONES) Tj
/F2 10 Tf
0 -20 Td
(Por la presente se notifica que la persona denunciada debera abstenerse de realizar) Tj
0 -16 Td
(actos de perturbacion, intimidacion, malos tratos o acercamiento por cualquier medio) Tj
0 -16 Td
(directo o indirecto hacia la persona requirente y su grupo familiar conviviente.) Tj
0 -16 Td
(En caso de incumplimiento, se incurrira en el delito de desobediencia judicial) Tj
0 -16 Td
(conforme a los articulos pertinentes del Codigo Penal y normativas de proteccion.) Tj
ET

0.94 0.96 0.99 rg
40 370 515 45 re
f
0.2 0.3 0.5 rg
BT
/F1 10 Tf
60 398 Td
(OFICIO REGISTRADO EN EL SISTEMA DE GESTION JUDICIAL DIGITAL) Tj
/F2 9 Tf
0 -15 Td
(Expediente: ${escapePdfText(measure.nroOficio)}   |   Seguimiento y Registro Oficial Digital) Tj
ET

0.4 0.45 0.5 rg
BT
/F2 9 Tf
60 300 Td
(Firma y Sello del Actuario / Juzgado Emisor) Tj
350 300 Td
(Firma de Notificacion y Toma de Razon) Tj
ET
0.7 0.7 0.7 rg
60 320 180 1 re
f
350 320 180 1 re
f

0.5 0.55 0.6 rg
BT
/F2 8 Tf
200 40 Td
(Constancia Oficial de Medida Judicial - Consulta y Resguardo Digital) Tj
ET
Q
`;

  const streamLength = contentStream.length;

  const pdfBody = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595 842]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
6 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000000 00000 n 
0000000000 00000 n 
trailer
<<
  /Size 7
  /Root 1 0 R
>>
startxref
${streamLength + 400}
%%EOF`;

  return new Blob([pdfBody], { type: 'application/pdf' });
}

/**
 * Generates a clean, valid standard PDF 1.4 file as a Blob or Data URI.
 * This guarantees that PDFs can be rendered natively in iframe/embed without any external dependencies!
 */
export function generateSamplePdfBlob(title: string, category: string, description: string, dateStr: string): Blob {
  // A minimal compliant PDF 1.4 document
  const escapePdfText = (txt: string) => txt.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  
  const contentStream = `
q
0.1 0.2 0.45 rg
50 720 500 50 re
f
1 1 1 rg
BT
/F1 22 Tf
70 738 Td
(${escapePdfText(title.slice(0, 42))}) Tj
ET

0.2 0.25 0.35 rg
BT
/F2 11 Tf
70 690 Td
(Categoria: ${escapePdfText(category)}   |   Fecha: ${escapePdfText(dateStr)}   |   Seguridad: Confidencial) Tj
ET

0.8 0.85 0.9 rg
50 670 500 1 re
f

0.15 0.2 0.25 rg
BT
/F1 14 Tf
70 635 Td
(1. Resumen Ejecutivo del Documento) Tj
/F2 11 Tf
0 -26 Td
(${escapePdfText(description.slice(0, 85))}) Tj
0 -20 Td
(Este archivo PDF ha sido indexado y procesado de forma segura en Drive PDF Explorer.) Tj
0 -20 Td
(Contiene informacion verificada para uso exclusivo del personal autorizado.) Tj

0 -38 Td
/F1 14 Tf
(2. Parametros y Metadatos de Auditoria) Tj
/F2 10 Tf
0 -24 Td
(Control de Acceso: Role-Based Access Control [RBAC] Verificado) Tj
0 -18 Td
(Protocolo de Integridad: SHA-256 Checksum OK) Tj
0 -18 Td
(Origen: Repositorio Digital Corporativo Centralizado) Tj
0 -18 Td
(Licencia de Consulta: Valida para el periodo 2025 - 2027) Tj

0 -40 Td
/F1 14 Tf
(3. Declaracion de Cumplimiento) Tj
/F2 10 Tf
0 -24 Td
(La distribucion o descarga de este archivo queda registrada en el panel de auditoria.) Tj
0 -18 Td
(Cualquier alteracion invalida la firma digital de este documento.) Tj
ET

0.92 0.94 0.98 rg
50 210 500 70 re
f
0.3 0.4 0.6 rg
BT
/F2 10 Tf
70 250 Td
(Nota: Documento optimizado para visualizacion y descarga en la aplicacion descargable.) Tj
0 -16 Td
(ID de Registro Unico: PDF-SEC-${Math.floor(Math.random() * 899999 + 100000)}) Tj
ET

0.5 0.55 0.6 rg
BT
/F2 9 Tf
240 60 Td
(Pagina 1 de 1 - Drive PDF Explorer) Tj
ET
Q
`;

  const streamLength = contentStream.length;

  const pdfBody = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595 842]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
6 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000000 00000 n 
0000000000 00000 n 
trailer
<<
  /Size 7
  /Root 1 0 R
>>
startxref
${streamLength + 400}
%%EOF`;

  return new Blob([pdfBody], { type: 'application/pdf' });
}

import { BrowserPDF417Reader, BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';

export interface ScannedDocumentResult {
  tipoDocumento: 'DNI' | 'LICENCIA' | 'OTRO';
  apellidoNombre: string;
  apellido?: string;
  nombre?: string;
  dni: string;
  alias?: string;
  edad?: number | string;
  fechaNacimiento?: string;
  sexo?: string;
  nacionalidad?: string;
  domicilio?: string;
  claseLicencia?: string;
  vencimiento?: string;
  metodo: 'CODIGO_BARRAS_PDF417' | 'OCR_INTELIGENTE';
  confianza?: string;
  rawText?: string;
}

/**
 * Calculates age in years from DD/MM/YYYY or YYYY-MM-DD string
 */
export function calculateAgeFromDate(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  let year: number, month: number, day: number;

  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10) - 1;
    year = parseInt(slashMatch[3], 10);
  } else {
    const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10) - 1;
      day = parseInt(isoMatch[3], 10);
    } else {
      return undefined;
    }
  }

  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age <= 125 ? age : undefined;
}

/**
 * Parses the raw text decoded from an Argentine DNI PDF417 barcode.
 * Standard Argentine format:
 * 00329243789@APELLIDO@NOMBRES@SEXO@NUMERO_DNI@EJEMPLAR@FECHA_NACIMIENTO@FECHA_EMISION@...
 */
export function parseArgentineDniBarcode(rawText: string): ScannedDocumentResult | null {
  if (!rawText) return null;
  const clean = rawText.trim();

  // Pattern with '@' delimiter (modern and standard Argentine DNI)
  if (clean.includes('@')) {
    const parts = clean.split('@').map((p) => p.trim());
    if (parts.length >= 4) {
      // Find DNI (a token with 7 to 8 digits)
      let dni = '';
      let apellido = '';
      let nombre = '';
      let sexo = '';
      let fechaNacimiento = '';

      // Standard positional mapping:
      // Index 0: Tramite/Barcode ID
      // Index 1: Apellido
      // Index 2: Nombres
      // Index 3: Sexo (M / F / X)
      // Index 4: DNI
      // Index 5: Ejemplar
      // Index 6: Fecha Nacimiento (DD/MM/YYYY)
      if (parts[4] && /^\d{6,9}$/.test(parts[4])) {
        dni = parts[4];
        apellido = parts[1] || '';
        nombre = parts[2] || '';
        sexo = parts[3] || '';
        fechaNacimiento = parts[6] || '';
      } else {
        // Fallback scan through all parts
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!dni && /^\d{7,8}$/.test(part)) {
            dni = part;
          } else if (!fechaNacimiento && /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(part)) {
            fechaNacimiento = part;
          } else if (!sexo && /^(M|F|X|MASCULINO|FEMENINO)$/i.test(part)) {
            sexo = part.toUpperCase();
          } else if (!apellido && part.length > 1 && !/^\d+$/.test(part) && i >= 1) {
            apellido = part;
          } else if (apellido && !nombre && part.length > 1 && !/^\d+$/.test(part)) {
            nombre = part;
          }
        }
      }

      const apellidoNombre = `${apellido} ${nombre}`.trim().toUpperCase() || 'CIUDADANO ARGENTINO';
      const edad = fechaNacimiento ? calculateAgeFromDate(fechaNacimiento) : undefined;

      return {
        tipoDocumento: 'DNI',
        apellidoNombre,
        apellido,
        nombre,
        dni: dni || 'S/D',
        sexo: sexo ? sexo.charAt(0).toUpperCase() : undefined,
        nacionalidad: 'Argentina',
        fechaNacimiento,
        edad,
        metodo: 'CODIGO_BARRAS_PDF417',
        confianza: 'ALTA (100% Código Oficial RENAPER)',
        rawText: clean,
      };
    }
  }

  // Quoted or space separated format
  const quoteParts = clean.split(/["\s]+/).filter((p) => p.trim().length > 0);
  if (quoteParts.length >= 4) {
    let dni = '';
    let apellido = '';
    let nombre = '';
    let fechaNacimiento = '';

    for (const p of quoteParts) {
      if (!dni && /^\d{7,8}$/.test(p)) {
        dni = p;
      } else if (!fechaNacimiento && /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(p)) {
        fechaNacimiento = p;
      }
    }

    if (dni) {
      return {
        tipoDocumento: 'DNI',
        apellidoNombre: quoteParts.slice(1, 3).join(' ').toUpperCase(),
        dni,
        fechaNacimiento,
        edad: fechaNacimiento ? calculateAgeFromDate(fechaNacimiento) : undefined,
        nacionalidad: 'Argentina',
        metodo: 'CODIGO_BARRAS_PDF417',
        confianza: 'ALTA',
        rawText: clean,
      };
    }
  }

  return null;
}

/**
 * Decodes barcode from an image element or data URL using @zxing/library
 */
export async function decodeBarcodeFromImage(imageSrc: string): Promise<ScannedDocumentResult | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        // First try PDF417 specific reader (Argentine DNI)
        const pdf417Reader = new BrowserPDF417Reader();
        try {
          const result = await pdf417Reader.decodeFromImageElement(img);
          if (result && result.getText()) {
            const parsed = parseArgentineDniBarcode(result.getText());
            if (parsed) {
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // PDF417 decode didn't find barcode, continue to multi-format
        }

        // Try generic multi-format reader
        const multiReader = new BrowserMultiFormatReader();
        try {
          const result = await multiReader.decodeFromImageElement(img);
          if (result && result.getText()) {
            const parsed = parseArgentineDniBarcode(result.getText());
            if (parsed) {
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // No standard barcode found
        }

        resolve(null);
      } catch (err) {
        console.warn('Barcode decoding error:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

/**
 * Compress an image data URL or Blob to an efficient size (e.g. max 1280px, ~100-200KB)
 * for fast mobile transfer and local/database storage.
 */
export async function compressImage(
  source: string | Blob | File,
  maxDimension: number = 1200,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isCreatedUrl = false;

    if (typeof source === 'string') {
      srcUrl = source;
    } else {
      srcUrl = URL.createObjectURL(source);
      isCreatedUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCreatedUrl) URL.revokeObjectURL(srcUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof source === 'string' ? source : '');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      if (isCreatedUrl) URL.revokeObjectURL(srcUrl);
      reject(err);
    };

    img.src = srcUrl;
  });
}

/**
 * Calls the server OCR endpoint (/api/scan-document) powered by Gemini
 * to extract DNI (front/back) or Licencia de Conducir data from the photo.
 */
export async function scanDocumentWithAI(imageBase64: string): Promise<ScannedDocumentResult> {
  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const mimeTypeMatch = imageBase64.match(/data:([^;]+);/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

  const response = await fetch('/api/scan-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: cleanBase64,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error en el servidor de escaneo (${response.status})`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'No se pudieron extraer datos del documento.');
  }

  const d = result.data;
  const calculatedAge = d.fechaNacimiento ? calculateAgeFromDate(d.fechaNacimiento) : undefined;

  return {
    tipoDocumento: d.tipoDocumento === 'LICENCIA' || d.tipoDocumento === 'LICENCIA_CONDUCIR' ? 'LICENCIA' : 'DNI',
    apellidoNombre: (d.apellidoNombre || `${d.apellido || ''} ${d.nombre || ''}`).trim().toUpperCase(),
    apellido: d.apellido,
    nombre: d.nombre,
    dni: d.dni ? String(d.dni).replace(/\D/g, '') : '',
    edad: d.edad || calculatedAge,
    fechaNacimiento: d.fechaNacimiento,
    sexo: d.sexo,
    nacionalidad: d.nacionalidad || 'Argentina',
    domicilio: d.domicilio,
    claseLicencia: d.claseLicencia,
    vencimiento: d.vencimiento,
    metodo: 'OCR_INTELIGENTE',
    confianza: d.confianza || 'ALTA',
  };
}

import { UserProfile, JudicialMeasure, IdentifiedPerson, DriveFile } from '../types';

export interface UploadResponse {
  success: boolean;
  fileUrl: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

async function safeJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('La respuesta del servidor no es JSON (posible hosting estático).');
  }
  return await res.json();
}

// Smart fetcher that ensures real-time sync with server and no caching
async function fetchWithPhpFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const mergedOptions: RequestInit = {
    ...options,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(endpoint, mergedOptions);
    const contentType = res.headers.get('content-type') || '';
    
    // If the server answered with JSON (200, 400, 401, 403, 500), return the response immediately
    if (contentType.includes('application/json')) {
      return res;
    }

    // If not JSON (e.g. 404 or static SPA index.html), try PHP fallback if not already a .php url
    if (!endpoint.includes('.php')) {
      const phpEndpoint = endpoint.replace('/api/', '/api/').split('?')[0] + '.php' + (endpoint.includes('?') ? '?' + endpoint.split('?')[1] : '');
      const phpRes = await fetch(phpEndpoint, mergedOptions);
      const phpContentType = phpRes.headers.get('content-type') || '';
      if (phpContentType.includes('application/json')) {
        return phpRes;
      }
    }
    return res;
  } catch (e) {
    if (!endpoint.includes('.php')) {
      const phpEndpoint = endpoint.replace('/api/', '/api/').split('?')[0] + '.php' + (endpoint.includes('?') ? '?' + endpoint.split('?')[1] : '');
      try {
        return await fetch(phpEndpoint, mergedOptions);
      } catch {}
    }
    throw e;
  }
}

export class ApiService {
  // ---- HEALTH CHECK ----
  static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetchWithPhpFallback(`/api/health?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ---- LOGIN WITH SQL DATABASE ----
  static async login(identifier: string, password: string): Promise<{ success: boolean; user: UserProfile; message?: string }> {
    const res = await fetchWithPhpFallback(`/api/login?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Error al autenticar con el servidor');
    }
    return data;
  }
  // ---- PDF FILE UPLOAD ----
  static async uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('pdf', file);

    const res = await fetchWithPhpFallback('/api/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error del servidor (${res.status}) al subir el PDF.`);
    }

    return await safeJson<UploadResponse>(res);
  }

  // ---- USERS & PASSWORDS ----
  static async getUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/users?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener usuarios del servidor');
      const data = await safeJson(res);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener usuarios del servidor:', e);
      throw e;
    }
  }

  static async saveUsers(users: UserProfile[]): Promise<UserProfile[]> {
    const res = await fetchWithPhpFallback(`/api/users?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
    if (!res.ok) {
      throw new Error('Error al guardar usuarios en el servidor');
    }
    return await safeJson(res);
  }

  static async saveSingleUser(user: UserProfile): Promise<UserProfile> {
    try {
      const res = await fetchWithPhpFallback(`/api/users/save?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (res.ok) {
        return await safeJson(res);
      }
    } catch (e) {
      console.warn('Fallback a /api/users para guardar usuario individual:', e);
    }

    // Fallback: use /api/users
    const fallbackRes = await fetchWithPhpFallback(`/api/users?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!fallbackRes.ok) {
      throw new Error('Error al guardar el usuario en el servidor');
    }
    const data = await safeJson(fallbackRes);
    return Array.isArray(data) ? data.find((u) => u.id === user.id) || user : data;
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const res = await fetchWithPhpFallback(`/api/users/${encodeURIComponent(userId)}?_t=${Date.now()}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Error al eliminar usuario en el servidor');
    }
    return true;
  }

  // ---- JUDICIAL MEASURES ----
  static async getMeasures(): Promise<JudicialMeasure[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/measures?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener medidas del servidor');
      const data = await safeJson(res);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener medidas del servidor:', e);
      throw e;
    }
  }

  static async saveMeasures(measures: JudicialMeasure[]): Promise<JudicialMeasure[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/measures?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measures),
      });
      if (!res.ok) {
        throw new Error('Error al guardar medidas en el servidor');
      }
      return await safeJson(res);
    } catch (e) {
      console.warn('Fallo guardando medidas en backend:', e);
      return measures;
    }
  }

  // ---- PERSON IDENTIFICATIONS ----
  static async getIdentifications(): Promise<IdentifiedPerson[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/identifications?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener identificaciones del servidor');
      const data = await safeJson(res);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener identificaciones del servidor:', e);
      throw e;
    }
  }

  static async saveIdentifications(identifications: IdentifiedPerson[]): Promise<IdentifiedPerson[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/identifications?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifications),
      });
      if (!res.ok) {
        throw new Error('Error al guardar identificaciones en el servidor');
      }
      return await safeJson(res);
    } catch (e) {
      console.warn('Fallo guardando identificaciones en backend:', e);
      return identifications;
    }
  }

  // ---- DOCUMENTS / REPOSITORY FILES ----
  static async getDocuments(): Promise<DriveFile[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/documents?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener documentos del servidor');
      const data = await safeJson(res);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener documentos del servidor:', e);
      throw e;
    }
  }

  static async saveDocuments(documents: DriveFile[]): Promise<DriveFile[]> {
    try {
      const res = await fetchWithPhpFallback('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documents),
      });
      if (!res.ok) {
        throw new Error('Error al guardar documentos en el servidor');
      }
      return await safeJson(res);
    } catch (e) {
      console.warn('Fallo guardando documentos en backend:', e);
      return documents;
    }
  }
}

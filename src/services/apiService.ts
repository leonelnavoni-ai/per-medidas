import { UserProfile, JudicialMeasure, IdentifiedPerson, DriveFile, AuditLog } from '../types';

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
function getPhpEquivalentUrl(endpoint: string): string {
  if (endpoint.includes('.php')) return endpoint;
  const [path, queryString] = endpoint.split('?');
  const query = queryString ? `?${queryString}` : '';

  // Extract base route e.g. /api/users, /api/identifications, /api/measures
  const match = path.match(/^\/api\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_.-]+))?$/);
  if (match) {
    const route = match[1]; // e.g. 'users', 'identifications', 'health'
    const param = match[2]; // e.g. 'usr-123'
    if (param && param !== 'save') {
      const sep = queryString ? '&' : '?';
      return `/api/${route}.php?id=${encodeURIComponent(param)}${queryString ? sep + queryString : ''}`;
    }
    return `/api/${route}.php${query}`;
  }
  return path.replace('/api/', '/api/').split('?')[0] + '.php' + query;
}

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
      const phpEndpoint = getPhpEquivalentUrl(endpoint);
      const phpRes = await fetch(phpEndpoint, mergedOptions);
      const phpContentType = phpRes.headers.get('content-type') || '';
      if (phpContentType.includes('application/json')) {
        return phpRes;
      }
    }
    return res;
  } catch (e) {
    if (!endpoint.includes('.php')) {
      const phpEndpoint = getPhpEquivalentUrl(endpoint);
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
    try {
      const res = await fetchWithPhpFallback(`/api/users/${encodeURIComponent(userId)}?_t=${Date.now()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return true;
      }
    } catch (e) {
      console.warn('DELETE /api/users falló, intentando POST action=delete:', e);
    }

    // Fallback con POST action=delete compatible con todos los entornos PHP/cPanel
    try {
      const postRes = await fetchWithPhpFallback(`/api/users?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: userId }),
      });
      if (postRes.ok) {
        return true;
      }
    } catch (e) {
      console.warn('Fallback POST action=delete falló:', e);
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

  static async saveSingleIdentification(person: IdentifiedPerson): Promise<IdentifiedPerson> {
    try {
      const res = await fetchWithPhpFallback(`/api/identifications/save?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person),
      });
      if (res.ok) {
        return await safeJson(res);
      }
    } catch (e) {
      console.warn('Fallback al guardar identificación individual:', e);
    }

    // Fallback: /api/identifications
    const fallbackRes = await fetchWithPhpFallback(`/api/identifications?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
    });
    if (!fallbackRes.ok) {
      throw new Error('Error al guardar identificación en el servidor');
    }
    return await safeJson(fallbackRes);
  }

  static async deleteIdentification(personId: string): Promise<boolean> {
    try {
      const res = await fetchWithPhpFallback(`/api/identifications/${encodeURIComponent(personId)}?_t=${Date.now()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return true;
      }
    } catch (e) {
      console.warn('DELETE /api/identifications falló, intentando POST action=delete:', e);
    }

    try {
      const postRes = await fetchWithPhpFallback(`/api/identifications?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: personId }),
      });
      if (postRes.ok) {
        return true;
      }
    } catch (e) {
      console.warn('Fallback POST action=delete falló:', e);
    }
    return true;
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

  // ---- AUDIT & TRACEABILITY LOGS ----
  static async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetchWithPhpFallback(`/api/audit?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener logs de auditoría del servidor');
      const data = await safeJson(res);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener logs de auditoría del servidor:', e);
      throw e;
    }
  }

  static async saveAuditLogs(logs: AuditLog[]): Promise<AuditLog[]> {
    try {
      const res = await fetchWithPhpFallback('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs),
      });
      if (!res.ok) {
        throw new Error('Error al guardar logs de auditoría en el servidor');
      }
      return await safeJson(res);
    } catch (e) {
      console.warn('Fallo guardando logs de auditoría en backend:', e);
      return logs;
    }
  }

  static async recordAuditLog(log: AuditLog): Promise<AuditLog> {
    try {
      const res = await fetchWithPhpFallback('/api/audit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      if (!res.ok) {
        throw new Error('Error al registrar evento de auditoría en el servidor');
      }
      return await safeJson(res);
    } catch (e) {
      console.warn('Fallo registrando evento individual de auditoría en backend:', e);
      return log;
    }
  }

  static async getSystemAuditReport(): Promise<any> {
    const res = await fetchWithPhpFallback(`/api/audit/system-report?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Error al generar reporte de auditoría del sistema');
    }
    return await safeJson(res);
  }

  static async exportBackup(): Promise<any> {
    const res = await fetchWithPhpFallback(`/api/backup/export?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Error al exportar la copia de seguridad desde el servidor');
    }
    return await safeJson(res);
  }

  static async restoreBackup(backupData: any): Promise<any> {
    const res = await fetchWithPhpFallback('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    if (!res.ok) {
      const err = await safeJson(res).catch(() => ({ error: 'Error en la restauración' }));
      throw new Error(err.error || 'Error al restaurar la copia de seguridad en el servidor');
    }
    return await safeJson(res);
  }
}


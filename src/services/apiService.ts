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

export class ApiService {
  // ---- PDF FILE UPLOAD ----
  static async uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('pdf', file);

    const res = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error del servidor (${res.status}) al subir el PDF.`);
    }

    return await res.json();
  }

  // ---- USERS & PASSWORDS ----
  static async getUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetch(`/api/users?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener usuarios del servidor');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener usuarios del servidor, usando copia local:', e);
      throw e;
    }
  }

  static async saveUsers(users: UserProfile[]): Promise<UserProfile[]> {
    const res = await fetch(`/api/users?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
    if (!res.ok) {
      throw new Error('Error al guardar usuarios en el servidor');
    }
    return await res.json();
  }

  static async saveSingleUser(user: UserProfile): Promise<UserProfile> {
    const res = await fetch(`/api/users/save?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      throw new Error('Error al guardar el usuario en el servidor');
    }
    return await res.json();
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}?_t=${Date.now()}`, {
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
      const res = await fetch(`/api/measures?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener medidas del servidor');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener medidas del servidor, usando copia local:', e);
      throw e;
    }
  }

  static async saveMeasures(measures: JudicialMeasure[]): Promise<JudicialMeasure[]> {
    const res = await fetch(`/api/measures?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(measures),
    });
    if (!res.ok) {
      throw new Error('Error al guardar medidas en el servidor');
    }
    return await res.json();
  }

  // ---- PERSON IDENTIFICATIONS ----
  static async getIdentifications(): Promise<IdentifiedPerson[]> {
    try {
      const res = await fetch(`/api/identifications?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener identificaciones del servidor');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener identificaciones del servidor, usando copia local:', e);
      throw e;
    }
  }

  static async saveIdentifications(identifications: IdentifiedPerson[]): Promise<IdentifiedPerson[]> {
    const res = await fetch(`/api/identifications?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identifications),
    });
    if (!res.ok) {
      throw new Error('Error al guardar identificaciones en el servidor');
    }
    return await res.json();
  }

  // ---- DOCUMENTS / REPOSITORY FILES ----
  static async getDocuments(): Promise<DriveFile[]> {
    try {
      const res = await fetch(`/api/documents?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('No se pudo obtener documentos del servidor');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallo al obtener documentos del servidor, usando copia local:', e);
      throw e;
    }
  }

  static async saveDocuments(documents: DriveFile[]): Promise<DriveFile[]> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documents),
    });
    if (!res.ok) {
      throw new Error('Error al guardar documentos en el servidor');
    }
    return await res.json();
  }
}

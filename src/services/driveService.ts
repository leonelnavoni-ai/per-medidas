import { DriveFile } from '../types';
import { GOOGLE_OAUTH_CLIENT_ID, DEFAULT_DRIVE_FOLDER_ID } from '../data/initialData';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export class DriveService {
  private static tokenClient: ReturnType<NonNullable<NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']>> | null = null;

  /**
   * Initializes Google Identity Services token client
   */
  public static initTokenClient(
    onSuccess: (token: string, expiresIn: number) => void,
    onError: (err: string) => void
  ): boolean {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      console.warn('Google Identity Services script not yet loaded.');
      return false;
    }

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (response) => {
          if (response.error) {
            onError(response.error);
            return;
          }
          if (response.access_token) {
            onSuccess(response.access_token, response.expires_in || 3600);
          }
        },
        error_callback: (err) => {
          onError(typeof err === 'string' ? err : 'Error en autenticación Google');
        },
      });
      return true;
    } catch (e: any) {
      console.error('Error al inicializar cliente OAuth:', e);
      onError(e.message || 'Error inicializando OAuth');
      return false;
    }
  }

  /**
   * Requests an access token with prompt
   */
  public static requestToken(): void {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      throw new Error('El cliente OAuth de Google aún no está listo.');
    }
  }

  /**
   * Fetches Google User Profile information
   */
  public static async fetchUserInfo(accessToken: string): Promise<{ name: string; email: string; picture?: string }> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('No se pudo obtener información del perfil');
      const data = await res.json();
      return {
        name: data.name || data.email,
        email: data.email,
        picture: data.picture,
      };
    } catch (err) {
      console.warn('Failed to fetch userinfo:', err);
      return {
        name: 'Usuario Google Drive',
        email: 'conectado@drive.google.com',
      };
    }
  }

  /**
   * Searches and lists PDF files from Google Drive
   */
  public static async listPdfFiles(
    accessToken: string,
    queryStr?: string,
    folderId?: string
  ): Promise<DriveFile[]> {
    let q = "mimeType = 'application/pdf' and trashed = false";
    if (folderId && folderId.trim()) {
      q += ` and '${folderId.trim()}' in parents`;
    }
    if (queryStr && queryStr.trim()) {
      // sanitize search term
      const safeQuery = queryStr.trim().replace(/'/g, "\\'");
      q += ` and (name contains '${safeQuery}' or fullText contains '${safeQuery}')`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('pageSize', '60');
    url.searchParams.set(
      'fields',
      'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, description, owners, parents)'
    );
    url.searchParams.set('orderBy', 'modifiedTime desc');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Error ${response.status} de Google Drive: ${errBody}`);
    }

    const data = await response.json();
    const files = data.files || [];

    return files.map((f: any): DriveFile => {
      // Determine category based on keywords in filename
      const lower = f.name.toLowerCase();
      let category = 'Otros';
      if (lower.includes('contrat') || lower.includes('acuerdo') || lower.includes('convenio')) category = 'Contratos';
      else if (lower.includes('balanc') || lower.includes('financ') || lower.includes('factur') || lower.includes('pago')) category = 'Finanzas';
      else if (lower.includes('legal') || lower.includes('polit') || lower.includes('normat') || lower.includes('rgpd')) category = 'Legal';
      else if (lower.includes('tec') || lower.includes('manual') || lower.includes('api') || lower.includes('dev') || lower.includes('arq')) category = 'Técnico';
      else if (lower.includes('rrhh') || lower.includes('personal') || lower.includes('emplead') || lower.includes('vacac')) category = 'Recursos Humanos';
      else if (lower.includes('audit') || lower.includes('informe') || lower.includes('report') || lower.includes('test')) category = 'Auditoría';
      else if (lower.includes('operac') || lower.includes('soporte') || lower.includes('guia')) category = 'Operaciones';

      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType || 'application/pdf',
        size: f.size ? parseInt(f.size, 10) : 102400,
        createdTime: f.createdTime || new Date().toISOString(),
        modifiedTime: f.modifiedTime || new Date().toISOString(),
        category,
        tags: [category],
        isHostedLocal: false,
        uploadedBy: f.owners?.[0]?.displayName || 'Repositorio Central',
        driveId: f.id,
      };
    });
  }

  /**
   * Downloads a Drive PDF as a Blob for in-app viewing and offline download
   */
  public static async downloadPdfBlob(accessToken: string, fileId: string): Promise<Blob> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`No se pudo descargar el archivo desde el repositorio central (Status: ${res.status})`);
    }

    return await res.blob();
  }

  /**
   * Uploads a new PDF file to Google Drive using multipart upload
   */
  public static async uploadPdfFile(
    accessToken: string,
    file: File,
    folderId?: string
  ): Promise<DriveFile> {
    const metadata: Record<string, any> = {
      name: file.name,
      mimeType: 'application/pdf',
    };

    const effectiveFolderId = (folderId && folderId.trim()) ? folderId.trim() : DEFAULT_DRIVE_FOLDER_ID;
    if (effectiveFolderId) {
      metadata.parents = [effectiveFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al subir al repositorio central: ${errText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: 'application/pdf',
      size: file.size,
      createdTime: data.createdTime || new Date().toISOString(),
      modifiedTime: data.modifiedTime || new Date().toISOString(),
      category: 'General',
      tags: ['Subido', 'Indexado'],
      isHostedLocal: false,
      uploadedBy: 'Usuario Autorizado',
      driveId: data.id,
    };
  }

  /**
   * Finds or creates a folder in Google Drive by name
   */
  public static async getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
    try {
      const safeName = folderName.replace(/'/g, "\\'");
      const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`;
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // If not found, create it
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        return created.id;
      }
    } catch (e) {
      console.warn('Could not locate or create folder in Google Drive:', e);
    }
    return '';
  }
}

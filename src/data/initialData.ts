import { DriveFile, UserProfile, AuditLog } from '../types';

export const GOOGLE_OAUTH_CLIENT_ID = "393656741660-le42431m94mdl4228vvmos20p2rvd7sv.apps.googleusercontent.com";
export const GOOGLE_API_KEY = "AIzaSyA5CdJTN7rn3rxysQfPliWjvH-oHnvWTMo";

// Configuración de la Carpeta Oficial de Google Drive para Almacenar PDFs Subidos
export const DEFAULT_DRIVE_FOLDER_ID = "1vsKodJ1LgaFSbejTiwcilEaHFcmnLmWe";
export const DEFAULT_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1vsKodJ1LgaFSbejTiwcilEaHFcmnLmWe";
export const DEFAULT_DRIVE_FOLDER_NAME = "Medidas y Oficios Judiciales (Drive Oficial)";

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1788786602829',
    username: '30557',
    password: 'NAVONI30557',
    name: 'SARGENTO NAVONI LEONEL',
    email: 'leonel.navoni@gmail.com',
    role: 'superadmin',
    badgeNumber: '30557',
    department: 'COMISARIA DE MINORIDAD Y VIOLENCIA FAMILIAR',
    status: 'active',
    avatarUrl: 'police_m2',
    createdAt: '2026-09-07T13:10:02.829Z',
    lastLogin: '2026-09-27T02:02:00Z',
  },
  {
    id: 'usr-1',
    username: 'admin',
    password: 'almorial1',
    name: 'SARGENTO NAVONI LEONEL',
    email: 'leonel.navoni@gmail.com',
    role: 'superadmin',
    badgeNumber: '30557',
    department: 'COMISARIA DE MINORIDAD Y VIOLENCIA FAMILIAR',
    status: 'active',
    avatarUrl: 'police_m2',
    createdAt: '2026-01-10T08:00:00Z',
    lastLogin: '2026-09-27T02:02:00Z',
  }
];

export const CATEGORIES = [
  'Todos',
  'Medidas Judiciales',
  'Oficios',
  'Memorándums',
  'Informes Policiales',
  'Identificaciones'
] as const;

export function getInitialFiles(): DriveFile[] {
  return [];
}

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-audit-init',
    userId: 'usr-1788786602829',
    userName: 'SARGENTO NAVONI LEONEL',
    userRole: 'superadmin',
    action: 'LOGIN',
    details: 'Inicialización de estación de trabajo policial. Autenticación exitosa por legajo 30557.',
    timestamp: '2026-09-27T00:00:00Z',
    status: 'SUCCESS'
  }
];

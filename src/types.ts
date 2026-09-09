export type RoleType = 'superadmin' | 'admin' | 'editor' | 'viewer';

export interface PermissionSet {
  canSearch: boolean;
  canView: boolean;
  canDownload: boolean;
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canConfigureDrive: boolean;
  canViewAuditLogs: boolean;
  canIdentifyPerson: boolean;
}

export const ROLE_DEFAULT_PERMISSIONS: Record<RoleType, PermissionSet> = {
  superadmin: {
    canSearch: true,
    canView: true,
    canDownload: true,
    canUpload: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canConfigureDrive: true,
    canViewAuditLogs: true,
    canIdentifyPerson: true,
  },
  admin: {
    canSearch: true,
    canView: true,
    canDownload: true,
    canUpload: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canConfigureDrive: true,
    canViewAuditLogs: true,
    canIdentifyPerson: true,
  },
  editor: {
    canSearch: true,
    canView: true,
    canDownload: true,
    canUpload: true,
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
    canConfigureDrive: false,
    canViewAuditLogs: false,
    canIdentifyPerson: true,
  },
  viewer: {
    canSearch: true,
    canView: true,
    canDownload: true,
    canUpload: false,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canConfigureDrive: false,
    canViewAuditLogs: false,
    canIdentifyPerson: true,
  },
};

export interface JudicialMeasure {
  id: string;
  timestamp: string; // Columna 1 (Fecha/Hora de Carga)
  victima: string; // Apellido y Nombre de la víctima
  tipoMedida: string; // Tipo de Medida (Prohibición de acercamiento, Exclusión, Prohibición malos tratos, etc.)
  fechaDesde: string; // Fecha Vigente desde
  fechaHasta: string; // Fecha vigente hasta
  diasVigencia?: number; // Cantidad de días de vigencia (calculado o especificado)
  victimario: string; // Apellido y Nombres del Victimario
  nroOficio: string; // N° de Oficio / Expediente
  provenienteDe: string; // Proveniente de (JDO FLIA, JDO. GARANTIAS, JUZGADO DE PAZ, etc.)
  medidaReciproca: 'Si' | 'No' | string; // MEDIDA RECIPROCAS
  estadoVigencia?: 'Vigente' | 'Vencida' | 'Duración de la Causa' | 'No especificado';
  observaciones?: string;
  isOfficialRegistry?: boolean;
  pdfBlobUrl?: string;
  lastUpdated?: string;
  updatedBy?: string;
  // Custom uploaded PDF & Google Drive metadata
  hasCustomPdf?: boolean;
  serverPdfUrl?: string;
  pdfBase64?: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  driveFileId?: string;
  driveFolder?: string;
  driveWebViewLink?: string;
  uploadedAt?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  category: string;
  tags: string[];
  isHostedLocal?: boolean;
  serverPdfUrl?: string;
  localBlobUrl?: string;
  description?: string;
  uploadedBy?: string;
  folderPath?: string;
  driveId?: string;
  measureData?: JudicialMeasure;
  pdfBase64?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  role: RoleType;
  badgeNumber?: string; // Legajo o DNI Policial
  department?: string;  // Dependencia o Comisaría
  status: 'active' | 'inactive';
  avatarUrl?: string;
  customPermissions?: Partial<PermissionSet>;
  createdAt: string;
  lastLogin?: string;
}

export type LegalStatusType = 
  | 'Sin impedimento'
  | 'Con medida cautelar'
  | 'Pedido de captura / paradero'
  | 'En averiguación'
  | 'Demorado';

export interface IdentifiedPerson {
  id: string;
  fechaHora: string; // Fecha y hora del control (ej: "2026-09-07T10:30:00")
  apellidoNombre: string;
  dni: string;
  alias?: string;
  edad?: number | string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  domicilio?: string;
  telefono?: string;
  motivo: string; // ej: "Control en vía pública", "Actitud sospechosa", "Control vehicular", etc.
  lugar: string; // Intersección, calle o barrio donde se realizó el control
  interviniente: string; // Funcionario policial o dotación
  dependencia: string; // Comisaría o división actuante
  estadoLegal: LegalStatusType;
  observaciones?: string;
  vehiculo?: string; // Dominio, marca y modelo si se desplazaba en vehículo
  fotoBase64?: string;
  createdAt: string;
  createdBy: string;
}

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW' 
  | 'DOWNLOAD' 
  | 'UPLOAD' 
  | 'CREATE_MEASURE'
  | 'UPDATE_MEASURE'
  | 'DELETE' 
  | 'SEARCH' 
  | 'CONNECT_DRIVE' 
  | 'DISCONNECT_DRIVE'
  | 'UPDATE_PERMISSIONS' 
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'GENERATE_PASSWORD'
  | 'INSTALL_PWA'
  | 'CREATE_PERSON_IDENTIFICATION'
  | 'UPDATE_PERSON_IDENTIFICATION'
  | 'DELETE_PERSON_IDENTIFICATION';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: RoleType;
  action: AuditAction;
  targetFileName?: string;
  details: string;
  timestamp: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
}

export interface FilterOptions {
  query: string;
  category: string;
  datePreset: 'all' | 'today' | 'week' | 'month' | 'year';
  sizePreset: 'all' | 'small' | 'medium' | 'large'; // <1MB, 1-5MB, >5MB
  sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
}

export interface DriveConnectionState {
  isConnected: boolean;
  accessToken: string | null;
  tokenExpiry: number | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  folderId: string | null; // legacy alias for search folder
  searchFolderId: string | null; // Pre-configured folder to search & index from
  uploadFolderId: string | null; // Pre-configured folder to save new documents to
  folderName: string | null;
  isLoading: boolean;
  error: string | null;
}

import { DriveFile, UserProfile, AuditLog } from '../types';
import { generateSamplePdfBlob } from '../utils/pdfGenerator';

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
    createdAt: '2026-09-07T13:10:02.829Z',
    lastLogin: '2026-09-07T13:10:02.829Z',
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
    createdAt: '2026-01-10T08:00:00Z',
    lastLogin: '2026-09-06T15:25:00Z',
  },
  {
    id: 'usr-2',
    username: 'carolina',
    password: 'admin123',
    name: 'Carolina Méndez',
    email: 'carolina.mendez@policiaentrerios.gov.ar',
    role: 'admin',
    badgeNumber: 'LP-12840',
    department: 'Oficial de Servicio y Despacho',
    status: 'active',
    createdAt: '2026-02-15T09:30:00Z',
    lastLogin: '2026-09-05T18:12:00Z',
  },
  {
    id: 'usr-3',
    username: 'roberto',
    password: 'editor123',
    name: 'Roberto Gómez',
    email: 'roberto.gomez@policiaentrerios.gov.ar',
    role: 'editor',
    badgeNumber: 'LP-15234',
    department: 'Guardia y Notificaciones Judiciales',
    status: 'active',
    createdAt: '2026-03-01T11:20:00Z',
    lastLogin: '2026-09-06T12:00:00Z',
  },
  {
    id: 'usr-4',
    username: 'valeria',
    password: 'lector123',
    name: 'Valeria Soria',
    email: 'valeria.soria@policiaentrerios.gov.ar',
    role: 'viewer',
    badgeNumber: 'LP-19852',
    department: 'Mesa de Entrada y Consulta',
    status: 'active',
    createdAt: '2026-04-12T14:45:00Z',
    lastLogin: '2026-09-04T10:15:00Z',
  },
  {
    id: 'usr-5',
    username: 'lucas',
    password: 'viewer123',
    name: 'Lucas Pardo',
    email: 'lucas.pardo@policiaentrerios.gov.ar',
    role: 'viewer',
    badgeNumber: 'LP-22104',
    department: 'Personal en Pasiva / Licencia',
    status: 'inactive',
    createdAt: '2026-05-20T16:00:00Z',
    lastLogin: '2026-08-11T09:30:00Z',
  }
];

export const CATEGORIES = [
  'Todos',
  'Contratos',
  'Finanzas',
  'Legal',
  'Técnico',
  'Recursos Humanos',
  'Auditoría',
  'Operaciones'
] as const;

export function getInitialFiles(): DriveFile[] {
  const sampleDocsMeta = [
    {
      id: 'doc-seed-1',
      name: 'Contrato_Marco_Servicios_Cloud_2026.pdf',
      mimeType: 'application/pdf',
      size: 1420000,
      createdTime: '2026-08-15T10:00:00Z',
      modifiedTime: '2026-09-01T14:32:00Z',
      category: 'Contratos',
      tags: ['Legal', 'Cloud', 'SLA', 'Proveedores'],
      description: 'Acuerdo de nivel de servicio y condiciones generales de provisión de infraestructura en la nube.',
      uploadedBy: 'Leonel Navoni',
    },
    {
      id: 'doc-seed-2',
      name: 'Balance_Financiero_Trimestral_Q2_2026.pdf',
      mimeType: 'application/pdf',
      size: 2840000,
      createdTime: '2026-07-20T08:30:00Z',
      modifiedTime: '2026-08-28T11:15:00Z',
      category: 'Finanzas',
      tags: ['Q2', 'EBITDA', 'Costos', 'Presupuesto'],
      description: 'Estado de resultados consolidados, flujo de caja libre y proyecciones de gasto operativo.',
      uploadedBy: 'Carolina Méndez',
    },
    {
      id: 'doc-seed-3',
      name: 'Politica_Seguridad_Datos_RGPD_ISO27001.pdf',
      mimeType: 'application/pdf',
      size: 980000,
      createdTime: '2026-05-10T12:00:00Z',
      modifiedTime: '2026-09-02T09:40:00Z',
      category: 'Legal',
      tags: ['Ciberseguridad', 'ISO27001', 'Privacidad', 'Normativa'],
      description: 'Directrices obligatorias de tratamiento de información sensible y control de accesos.',
      uploadedBy: 'Leonel Navoni',
    },
    {
      id: 'doc-seed-4',
      name: 'Arquitectura_Sistemas_Microservicios_v4.pdf',
      mimeType: 'application/pdf',
      size: 3890000,
      createdTime: '2026-06-18T15:20:00Z',
      modifiedTime: '2026-08-30T17:05:00Z',
      category: 'Técnico',
      tags: ['DevOps', 'Docker', 'Kubernetes', 'API'],
      description: 'Manual de ingeniería de software con diagramas topológicos y especificación de endpoints.',
      uploadedBy: 'Roberto Gómez',
    },
    {
      id: 'doc-seed-5',
      name: 'Manual_Bienvenida_Politicas_Empleados_2026.pdf',
      mimeType: 'application/pdf',
      size: 1750000,
      createdTime: '2026-01-05T09:00:00Z',
      modifiedTime: '2026-08-10T16:22:00Z',
      category: 'Recursos Humanos',
      tags: ['Onboarding', 'Beneficios', 'Cultura', 'Personal'],
      description: 'Guía de inducción para nuevos colaboradores, código de conducta y esquema de compensación.',
      uploadedBy: 'Carolina Méndez',
    },
    {
      id: 'doc-seed-6',
      name: 'Informe_Auditoria_Seguridad_PenTest_2026.pdf',
      mimeType: 'application/pdf',
      size: 5120000,
      createdTime: '2026-08-01T11:45:00Z',
      modifiedTime: '2026-09-04T13:10:00Z',
      category: 'Auditoría',
      tags: ['PenTest', 'Vulnerabilidades', 'SOC2', 'Reporte'],
      description: 'Evaluación externa de penetración con hallazgos de seguridad y planes de remediación ejecutados.',
      uploadedBy: 'Leonel Navoni',
    },
    {
      id: 'doc-seed-7',
      name: 'Protocolo_Operativo_Respuesta_Incidentes.pdf',
      mimeType: 'application/pdf',
      size: 1150000,
      createdTime: '2026-04-14T10:10:00Z',
      modifiedTime: '2026-08-15T15:40:00Z',
      category: 'Operaciones',
      tags: ['Soporte', 'Disponibilidad', 'Nivel1', 'Procedimientos'],
      description: 'Procedimiento operativo estándar de escalamiento para fallas críticas en producción.',
      uploadedBy: 'Roberto Gómez',
    }
  ];

  return sampleDocsMeta.map((doc) => {
    const blob = generateSamplePdfBlob(doc.name, doc.category, doc.description, doc.modifiedTime.slice(0, 10));
    const localUrl = URL.createObjectURL(blob);
    return {
      ...doc,
      isHostedLocal: true,
      localBlobUrl: localUrl,
    };
  });
}

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-query-1',
    userId: 'usr-3',
    userName: 'Roberto Gómez',
    userRole: 'editor',
    action: 'SEARCH',
    details: 'Consulta de Persona / DNI: "34892110" - Verificación de medidas cautelares e impedimentos',
    timestamp: '2026-09-08T14:35:10Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-2',
    userId: 'usr-2',
    userName: 'Mariana Benítez',
    userRole: 'admin',
    action: 'SEARCH',
    details: 'Consulta de Medida Judicial: "Prohibición de Acercamiento" - Expte: 8943/2026',
    timestamp: '2026-09-08T13:20:44Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-3',
    userId: 'usr-4',
    userName: 'Valeria Soria',
    userRole: 'viewer',
    action: 'VIEW',
    targetFileName: 'Oficio_Judicial_4512_Medida_Proteccion.pdf',
    details: 'Visualización de Oficio Judicial N° 4512/26 - Juzgado de Familia N° 2',
    timestamp: '2026-09-08T11:45:18Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-4',
    userId: 'usr-3',
    userName: 'Roberto Gómez',
    userRole: 'editor',
    action: 'SEARCH',
    details: 'Consulta de Persona / DNI: "28910455" - Ciudadano: "BENÍTEZ, Mauro"',
    timestamp: '2026-09-08T10:12:05Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-5',
    userId: 'usr-1',
    userName: 'Leonel Navoni',
    userRole: 'superadmin',
    action: 'SEARCH',
    details: 'Búsqueda general de medidas judiciales: Carátula "Gómez c/ Ramírez s/ Violencia Familiar"',
    timestamp: '2026-09-07T18:50:30Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-6',
    userId: 'usr-4',
    userName: 'Valeria Soria',
    userRole: 'viewer',
    action: 'SEARCH',
    details: 'Consulta de Persona Identificada: "RODRÍGUEZ, Lucas" - Verificación en operativo de guardia',
    timestamp: '2026-09-07T16:22:15Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-query-7',
    userId: 'usr-2',
    userName: 'Mariana Benítez',
    userRole: 'admin',
    action: 'VIEW',
    targetFileName: 'Oficio_7821_Exclusion_Hogar.pdf',
    details: 'Apertura y consulta de Oficio N° 7821 - Exclusión del Hogar',
    timestamp: '2026-09-07T15:10:00Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-1',
    userId: 'usr-1',
    userName: 'Leonel Navoni',
    userRole: 'superadmin',
    action: 'CONNECT_DRIVE',
    details: 'Conexión OAuth2 autorizada con el servicio Google Drive API v3',
    timestamp: '2026-09-06T15:28:50Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-2',
    userId: 'usr-1',
    userName: 'Leonel Navoni',
    userRole: 'superadmin',
    action: 'UPLOAD',
    targetFileName: 'Informe_Auditoria_Seguridad_PenTest_2026.pdf',
    details: 'Archivo PDF alojado e indexado en la base de datos documental',
    timestamp: '2026-09-06T14:15:00Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-3',
    userId: 'usr-3',
    userName: 'Roberto Gómez',
    userRole: 'editor',
    action: 'SEARCH',
    details: 'Búsqueda por palabra clave: "Kubernetes" y filtro categoría Técnico',
    timestamp: '2026-09-06T12:05:22Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-4',
    userId: 'usr-4',
    userName: 'Valeria Soria',
    userRole: 'viewer',
    action: 'VIEW',
    targetFileName: 'Balance_Financiero_Trimestral_Q2_2026.pdf',
    details: 'Visualización segura en visor interactivo embebido',
    timestamp: '2026-09-05T16:20:10Z',
    status: 'SUCCESS'
  },
  {
    id: 'log-5',
    userId: 'usr-4',
    userName: 'Valeria Soria',
    userRole: 'viewer',
    action: 'DOWNLOAD',
    targetFileName: 'Contrato_Marco_Servicios_Cloud_2026.pdf',
    details: 'Intento de descarga bloqueado por directiva de permisos de rol Lector',
    timestamp: '2026-09-05T16:22:00Z',
    status: 'DENIED'
  }
];

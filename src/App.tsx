import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  Upload,
  Shield,
  FileText,
  HardDrive,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck,
  Eye,
  Info
} from 'lucide-react';
import {
  DriveFile,
  UserProfile,
  FilterOptions,
  DriveConnectionState,
  PermissionSet,
  ROLE_DEFAULT_PERMISSIONS,
  AuditLog,
  AuditAction,
  JudicialMeasure,
  IdentifiedPerson,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  getInitialFiles,
  GOOGLE_OAUTH_CLIENT_ID,
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  DEFAULT_DRIVE_FOLDER_NAME
} from './data/initialData';
import { DEFAULT_JUDICIAL_MEASURES } from './data/defaultMeasures';
import { INITIAL_IDENTIFIED_PERSONS } from './data/initialIdentifications';
import { generateSamplePdfBlob, generateJudicialMeasurePdfBlob } from './utils/pdfGenerator';
import { measureToDriveFile, fileToBase64, base64ToBlob } from './utils/measureUtils';
import { DriveService } from './services/driveService';
import { Header } from './components/Header';
import { SearchBarAndFilters } from './components/SearchBarAndFilters';
import { DocumentCard } from './components/DocumentCard';
import { PdfViewerModal } from './components/PdfViewerModal';
import { UploadPdfModal } from './components/UploadPdfModal';
import { AdminPanel } from './components/AdminPanel';
import { PwaInstallModal } from './components/PwaInstallModal';
import { JudicialMeasuresExplorer } from './components/JudicialMeasuresExplorer';
import { MeasureModal } from './components/MeasureModal';
import { LoginScreen } from './components/LoginScreen';
import { PersonIdentificationExplorer } from './components/PersonIdentificationExplorer';
import { PersonIdentificationModal } from './components/PersonIdentificationModal';
import { PersonWhatsAppModal } from './components/PersonWhatsAppModal';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'measures' | 'identifications' | 'files' | 'admin'>('measures');

  // Default Judicial Measures State (Official Database)
  const [measures, setMeasures] = useState<JudicialMeasure[]>(() => {
    try {
      const saved = localStorage.getItem('judicial_measures_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading stored measures:', e);
    }
    return DEFAULT_JUDICIAL_MEASURES;
  });

  // Measure Modal State
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [measureModalMode, setMeasureModalMode] = useState<'create' | 'edit'>('create');
  const [activeEditingMeasure, setActiveEditingMeasure] = useState<JudicialMeasure | null>(null);

  // Person Identification State (Official Police Controls)
  const [identifications, setIdentifications] = useState<IdentifiedPerson[]>(() => {
    try {
      const saved = localStorage.getItem('police_person_identifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading stored identifications:', e);
    }
    return INITIAL_IDENTIFIED_PERSONS;
  });

  // Person Modal State
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personModalMode, setPersonModalMode] = useState<'create' | 'edit'>('create');
  const [activeEditingPerson, setActiveEditingPerson] = useState<IdentifiedPerson | null>(null);

  // WhatsApp Person Share Modal State
  const [whatsAppPerson, setWhatsAppPerson] = useState<{
    person: IdentifiedPerson;
    matchingMeasures: JudicialMeasure[];
  } | null>(null);

  // Documents State (General PDFs)
  const [files, setFiles] = useState<DriveFile[]>(() => getInitialFiles());
  const [activeViewingFile, setActiveViewingFile] = useState<DriveFile | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Users & RBAC State (with local persistence)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('police_app_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hasAdmin = false;
          const mapped = parsed.map((u: UserProfile) => {
            if (
              u.id === 'usr-1' ||
              u.role === 'superadmin' ||
              u.username === 'admin' ||
              (u.email && u.email.toLowerCase() === 'leonel.navoni@gmail.com')
            ) {
              hasAdmin = true;
              return {
                ...u,
                username: 'admin',
                password: 'almorial1',
                status: 'active',
              };
            }
            return u;
          });
          if (!hasAdmin) {
            mapped.unshift(INITIAL_USERS[0]);
          }
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Error loading users from localStorage:', e);
    }
    return INITIAL_USERS;
  });
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const activeId = localStorage.getItem('police_app_active_user_id');
      const saved = localStorage.getItem('police_app_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (activeId) {
            const found = parsed.find((u: UserProfile) => u.id === activeId);
            if (found) {
              if (
                found.id === 'usr-1' ||
                found.role === 'superadmin' ||
                found.username === 'admin' ||
                (found.email && found.email.toLowerCase() === 'leonel.navoni@gmail.com')
              ) {
                return { ...found, username: 'admin', password: 'almorial1', status: 'active' };
              }
              return found;
            }
          }
          const first = parsed[0];
          if (
            first.id === 'usr-1' ||
            first.role === 'superadmin' ||
            first.username === 'admin' ||
            (first.email && first.email.toLowerCase() === 'leonel.navoni@gmail.com')
          ) {
            return { ...first, username: 'admin', password: 'almorial1', status: 'active' };
          }
          return first;
        }
      }
    } catch (e) {}
    return INITIAL_USERS[0];
  });

  // Authentication State - Defaults strictly to false so entering the application requires login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      // 1. Check current browser tab session
      const sessionAuth = sessionStorage.getItem('police_app_authenticated');
      if (sessionAuth === 'true') return true;

      // 2. Check if the user explicitly requested to remember login on this device
      const remember = localStorage.getItem('police_app_remember_login');
      const localAuth = localStorage.getItem('police_app_authenticated');
      if (remember === 'true' && localAuth === 'true') {
        return true;
      }
    } catch (e) {
      console.warn('Error reading auth state:', e);
    }
    // By default, entry to the system strictly requires user authentication
    return false;
  });

  // Persist users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('police_app_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving users to localStorage:', e);
    }
  }, [users]);

  // Keep currentUser in sync if updated in users list
  useEffect(() => {
    const updated = users.find((u) => u.id === currentUser.id);
    if (updated) {
      const hasChanged =
        updated.name !== currentUser.name ||
        updated.email !== currentUser.email ||
        updated.role !== currentUser.role ||
        updated.status !== currentUser.status ||
        JSON.stringify(updated.customPermissions) !== JSON.stringify(currentUser.customPermissions);
      if (hasChanged) {
        setCurrentUser(updated);
      }
    }
  }, [users, currentUser]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Google Drive Connection State
  const [driveState, setDriveState] = useState<DriveConnectionState>({
    isConnected: false,
    accessToken: null,
    tokenExpiry: null,
    userEmail: null,
    userName: null,
    userPhoto: null,
    folderId: DEFAULT_DRIVE_FOLDER_ID,
    searchFolderId: DEFAULT_DRIVE_FOLDER_ID,
    uploadFolderId: DEFAULT_DRIVE_FOLDER_ID,
    folderName: DEFAULT_DRIVE_FOLDER_NAME,
    isLoading: false,
    error: null,
  });

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    query: '',
    category: 'Todos',
    datePreset: 'all',
    sizePreset: 'all',
    sortBy: 'date_desc',
  });

  // PWA Install Prompt State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Add audit log helper
  const addAuditLog = (
    action: AuditAction,
    details: string,
    targetFileName?: string,
    status: 'SUCCESS' | 'DENIED' | 'WARNING' = 'SUCCESS'
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetFileName,
      details,
      timestamp: new Date().toISOString(),
      status,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Compute permissions for current active user
  const currentPermissions: PermissionSet = useMemo(() => {
    const basePermissions = ROLE_DEFAULT_PERMISSIONS[currentUser.role];
    if (currentUser.customPermissions) {
      return { ...basePermissions, ...currentUser.customPermissions };
    }
    return basePermissions;
  }, [currentUser]);

  // Register PWA Service Worker & Install Prompt
  useEffect(() => {
    // Service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredInstallPrompt(null);
      addAuditLog('INSTALL_PWA', 'Aplicación instalada exitosamente en el dispositivo local');
      showToast('¡Drive PDF Explorer instalado correctamente en tu dispositivo!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Initialize Google Drive Identity Services Client
  useEffect(() => {
    const checkGisInterval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGisInterval);
        DriveService.initTokenClient(
          async (token, expiresIn) => {
            setDriveState((prev) => ({ ...prev, isLoading: true, error: null }));
            try {
              const userInfo = await DriveService.fetchUserInfo(token);
              const searchTargetFolder = driveState.searchFolderId || driveState.folderId || undefined;
              const driveFiles = await DriveService.listPdfFiles(token, undefined, searchTargetFolder);

              setDriveState((prev) => ({
                ...prev,
                isConnected: true,
                accessToken: token,
                tokenExpiry: Date.now() + expiresIn * 1000,
                userEmail: userInfo.email,
                userName: userInfo.name,
                userPhoto: userInfo.picture || null,
                isLoading: false,
                error: null,
              }));

              // Merge fetched Drive files, avoiding duplicates
              setFiles((prev) => {
                const existingDriveIds = new Set(driveFiles.map((df) => df.id));
                const nonDriveFiles = prev.filter((f) => !f.driveId || !existingDriveIds.has(f.driveId));
                return [...driveFiles, ...nonDriveFiles];
              });

              addAuditLog(
                'CONNECT_DRIVE',
                `Google Drive conectado exitosamente con cuenta ${userInfo.email}. ${driveFiles.length} archivos PDF sincronizados.`
              );
              showToast(`Google Drive conectado: ${driveFiles.length} PDFs sincronizados`, 'success');
            } catch (err: any) {
              console.error('Error fetching Drive data:', err);
              setDriveState((prev) => ({
                ...prev,
                isLoading: false,
                error: err.message || 'Error cargando archivos de Google Drive',
              }));
              showToast(err.message || 'Error al conectar con Google Drive', 'error');
            }
          },
          (err) => {
            console.error('OAuth error callback:', err);
            setDriveState((prev) => ({ ...prev, isLoading: false, error: err }));
            showToast(`Error OAuth Google: ${err}`, 'error');
          }
        );
      }
    }, 500);

    return () => clearInterval(checkGisInterval);
  }, [driveState.folderId]);

  // Connect to Google Drive Trigger
  const handleConnectDrive = () => {
    setDriveState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      DriveService.requestToken();
    } catch (e: any) {
      setDriveState((prev) => ({ ...prev, isLoading: false, error: e.message }));
      showToast(e.message || 'Error inicializando conexión a Google Drive', 'error');
    }
  };

  // Disconnect Google Drive
  const handleDisconnectDrive = () => {
    // Keep local files, remove Drive files
    setFiles((prev) => prev.filter((f) => f.isHostedLocal));
    setDriveState({
      isConnected: false,
      accessToken: null,
      tokenExpiry: null,
      userEmail: null,
      userName: null,
      userPhoto: null,
      folderId: null,
      folderName: null,
      isLoading: false,
      error: null,
    });
    addAuditLog('DISCONNECT_DRIVE', 'Sesión de Google Drive cerrada. Archivos de Drive removidos de la memoria activa.');
    showToast('Google Drive desconectado. Repositorio en modo seguro local.', 'warning');
  };

  // Handle Trigger PWA Install
  const handleTriggerInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Iniciando instalación de la aplicación...', 'success');
      }
      setDeferredInstallPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // User Switcher (Role Simulation)
  const handleSwitchUser = (selectedUser: UserProfile) => {
    setCurrentUser(selectedUser);
    try {
      localStorage.setItem('police_app_active_user_id', selectedUser.id);
    } catch (e) {}
    showToast(
      `Sesión cambiada a ${selectedUser.name} (Rol: ${selectedUser.role.toUpperCase()})`,
      'success'
    );
  };

  // Authentication Handlers
  const handleLogin = (user: UserProfile, rememberSession: boolean) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('police_app_authenticated', 'true');
      sessionStorage.setItem('police_app_active_user_id', user.id);
      if (rememberSession) {
        localStorage.setItem('police_app_remember_login', 'true');
        localStorage.setItem('police_app_authenticated', 'true');
        localStorage.setItem('police_app_active_user_id', user.id);
      } else {
        localStorage.removeItem('police_app_remember_login');
        localStorage.removeItem('police_app_authenticated');
        localStorage.removeItem('police_app_active_user_id');
      }
    } catch (e) {
      console.warn('Failed to save session state:', e);
    }
    addAuditLog('LOGIN', `Inicio de sesión exitoso: ${user.name} (@${user.username || user.email}) con rol ${user.role}`);
    showToast(`Bienvenido/a al Sistema Policial, ${user.name}`, 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('police_app_authenticated');
      sessionStorage.removeItem('police_app_active_user_id');
      localStorage.removeItem('police_app_authenticated');
      localStorage.removeItem('police_app_remember_login');
      localStorage.removeItem('police_app_active_user_id');
    } catch (e) {
      console.warn('Failed to clear session state:', e);
    }
    addAuditLog('LOGOUT', `Sesión cerrada por ${currentUser.name} (@${currentUser.username || currentUser.email})`);
    showToast('Sesión cerrada correctamente. Ingrese sus credenciales para volver al sistema.', 'info');
  };

  // Open PDF Viewer
  const handleViewPdf = (file: DriveFile) => {
    if (!currentPermissions.canView) {
      showToast('Acceso denegado: Tu rol no tiene permisos para visualizar documentos.', 'error');
      addAuditLog('VIEW', 'Intento de visualización bloqueado por política RBAC', file.name, 'DENIED');
      return;
    }
    setActiveViewingFile(file);
    addAuditLog('VIEW', `Visualización iniciada en visor protegido embebido`, file.name, 'SUCCESS');
  };

  // Download PDF
  const handleDownloadPdf = async (file: DriveFile) => {
    try {
      showToast(`Preparando descarga de ${file.name}...`, 'success');
      let blobUrl = file.localBlobUrl;

      if (!blobUrl && file.driveId && driveState.accessToken) {
        const blob = await DriveService.downloadPdfBlob(driveState.accessToken, file.driveId);
        blobUrl = URL.createObjectURL(blob);
      }

      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Safe local blob generation: user never navigates to or sees any Google Drive address
        const fallbackBlob = generateSamplePdfBlob(
          file.name,
          file.category,
          file.description || 'Documento indexado y protegido en la plataforma.',
          file.modifiedTime.slice(0, 10)
        );
        const safeUrl = URL.createObjectURL(fallbackBlob);
        const a = document.createElement('a');
        a.href = safeUrl;
        a.download = file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      addAuditLog('DOWNLOAD', `Descarga de documento autorizada y completada`, file.name, 'SUCCESS');
      showToast(`Descarga de ${file.name} iniciada`, 'success');
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(`Error al descargar: ${err.message}`, 'error');
    }
  };

  // Delete PDF
  const handleDeletePdf = (file: DriveFile) => {
    if (!currentPermissions.canDelete) {
      showToast('Acceso denegado: No cuentas con permisos para eliminar documentos.', 'error');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar "${file.name}" del repositorio?`)) {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      addAuditLog('DELETE', `Documento eliminado del repositorio`, file.name, 'SUCCESS');
      showToast(`Archivo "${file.name}" eliminado correctamente.`, 'success');
    }
  };

  // Add Uploaded PDF File
  const handleAddFile = (newFile: DriveFile) => {
    setFiles((prev) => [newFile, ...prev]);
    addAuditLog(
      'UPLOAD',
      `Nuevo archivo PDF alojado e indexado (${newFile.category})`,
      newFile.name,
      'SUCCESS'
    );
    showToast(`PDF "${newFile.name}" alojado e indexado correctamente.`, 'success');
  };

  // State update helper for Judicial Measures with local persistence
  const updateMeasuresState = (newMeasures: JudicialMeasure[]) => {
    setMeasures(newMeasures);
    try {
      localStorage.setItem('judicial_measures_data', JSON.stringify(newMeasures));
    } catch (e) {
      console.warn('Could not persist measures to localStorage:', e);
    }
  };

  // State update helper for Identified Persons with local persistence
  const updateIdentificationsState = (newIdentifications: IdentifiedPerson[]) => {
    setIdentifications(newIdentifications);
    try {
      localStorage.setItem('police_person_identifications', JSON.stringify(newIdentifications));
    } catch (e) {
      console.warn('Could not persist identifications to localStorage:', e);
    }
  };

  // Open Create Person Identification Modal
  const handleOpenCreatePerson = () => {
    const canIdentify = currentPermissions.canIdentifyPerson ?? true;
    if (!canIdentify) {
      showToast('Acceso denegado: Tu rol de usuario no tiene permisos para cargar identificaciones.', 'error');
      return;
    }
    setActiveEditingPerson(null);
    setPersonModalMode('create');
    setIsPersonModalOpen(true);
  };

  // Open Edit Person Identification Modal
  const handleOpenEditPerson = (person: IdentifiedPerson) => {
    const canEdit =
      currentPermissions.canEdit ||
      (currentPermissions.canIdentifyPerson ?? true) ||
      person.createdBy === currentUser.name;
    if (!canEdit) {
      showToast('Acceso denegado: Tu rol de usuario no tiene permisos para modificar identificaciones.', 'error');
      return;
    }
    setActiveEditingPerson(person);
    setPersonModalMode('edit');
    setIsPersonModalOpen(true);
  };

  // Save or Update Person Identification
  const handleSavePerson = (person: IdentifiedPerson, sendWhatsApp: boolean) => {
    const isEdit = personModalMode === 'edit';
    const exists = identifications.some((p) => p.id === person.id);
    let updated: IdentifiedPerson[];

    if (exists) {
      updated = identifications.map((p) => (p.id === person.id ? person : p));
    } else {
      updated = [person, ...identifications];
    }

    updateIdentificationsState(updated);

    addAuditLog(
      isEdit ? 'UPDATE_PERSON_IDENTIFICATION' : 'CREATE_PERSON_IDENTIFICATION',
      `${isEdit ? 'Modificación' : 'Registro'} de identificación: ${person.apellidoNombre} (DNI: ${person.dni || 'S/D'}) en ${person.lugar}`,
      person.apellidoNombre,
      'SUCCESS'
    );

    showToast(
      isEdit
        ? `Identificación de "${person.apellidoNombre}" modificada correctamente.`
        : `Identificación de "${person.apellidoNombre}" registrada con éxito.`,
      'success'
    );

    if (sendWhatsApp) {
      const cleanName = person.apellidoNombre.trim().toLowerCase();
      const matching = measures.filter(
        (m) =>
          cleanName &&
          (m.victima.toLowerCase().includes(cleanName) ||
            m.victimario.toLowerCase().includes(cleanName))
      );
      setWhatsAppPerson({ person, matchingMeasures: matching });
    }
  };

  // Delete Person Identification
  const handleDeletePerson = (person: IdentifiedPerson) => {
    if (!currentPermissions.canDelete) {
      showToast('Acceso denegado: Tu rol no tiene permisos para eliminar registros de identificación.', 'error');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el registro de identificación de "${person.apellidoNombre}" (DNI: ${person.dni || 'S/D'})?`)) {
      const updated = identifications.filter((p) => p.id !== person.id);
      updateIdentificationsState(updated);
      addAuditLog(
        'DELETE_PERSON_IDENTIFICATION',
        `Eliminación de identificación policial: ${person.apellidoNombre} (DNI ${person.dni || 'S/D'})`,
        person.apellidoNombre,
        'SUCCESS'
      );
      showToast(`Registro de "${person.apellidoNombre}" eliminado correctamente.`, 'success');
    }
  };

  // Open WhatsApp Person Modal
  const handleOpenPersonWhatsApp = (person: IdentifiedPerson, matchingMeasures: JudicialMeasure[]) => {
    setWhatsAppPerson({ person, matchingMeasures });
  };

  // View Official Judicial Measure PDF in integrated protected viewer
  const handleViewMeasurePdf = (measure: JudicialMeasure) => {
    if (!currentPermissions.canView) {
      showToast('Acceso denegado: Tu rol no tiene permisos para visualizar documentos.', 'error');
      addAuditLog('VIEW', 'Intento de visualización bloqueado por política RBAC', `Oficio ${measure.nroOficio}`, 'DENIED');
      return;
    }
    const driveFile = measureToDriveFile(measure);
    setActiveViewingFile(driveFile);
    addAuditLog('VIEW', `Visualización de Oficio Judicial N° ${measure.nroOficio} iniciada`, driveFile.name, 'SUCCESS');
  };

  // Download Judicial Measure PDF directly
  const handleDownloadMeasurePdf = async (measure: JudicialMeasure) => {
    try {
      let blob: Blob;
      let downloadFileName: string;

      if (measure.hasCustomPdf && measure.pdfBase64) {
        blob = base64ToBlob(measure.pdfBase64);
        downloadFileName = measure.pdfFileName || `Oficio_${measure.nroOficio}.pdf`;
      } else if (measure.hasCustomPdf && measure.driveFileId && driveState.isConnected && driveState.accessToken) {
        try {
          blob = await DriveService.downloadPdfBlob(driveState.accessToken, measure.driveFileId);
          downloadFileName = measure.pdfFileName || `Oficio_${measure.nroOficio}.pdf`;
        } catch {
          blob = generateJudicialMeasurePdfBlob(measure);
          const safeOficio = (measure.nroOficio || 'SN').replace(/[^a-zA-Z0-9]/g, '_');
          downloadFileName = `Oficio_Judicial_${safeOficio}.pdf`;
        }
      } else {
        blob = generateJudicialMeasurePdfBlob(measure);
        const safeOficio = (measure.nroOficio || 'SN').replace(/[^a-zA-Z0-9]/g, '_');
        downloadFileName = `Oficio_Judicial_${safeOficio}.pdf`;
      }

      const safeUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = safeUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(safeUrl);

      addAuditLog(
        'DOWNLOAD',
        `Descarga de Oficio Judicial N° ${measure.nroOficio} autorizada y completada${measure.hasCustomPdf ? ' (Archivo original Google Drive)' : ''}`,
        downloadFileName,
        'SUCCESS'
      );
      showToast(`Oficio N° ${measure.nroOficio} descargado exitosamente`, 'success');
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(`Error al descargar: ${err.message}`, 'error');
    }
  };

  // Open Create Measure Modal
  const handleOpenCreateMeasure = () => {
    if (!currentPermissions.canUpload && !currentPermissions.canEdit) {
      showToast('Acceso Restringido: Tu rol de usuario no tiene permiso para cargar nuevas medidas.', 'error');
      return;
    }
    setActiveEditingMeasure(null);
    setMeasureModalMode('create');
    setIsMeasureModalOpen(true);
  };

  // Open Edit Measure Modal
  const handleOpenEditMeasure = (measure: JudicialMeasure) => {
    if (!currentPermissions.canEdit) {
      showToast('Acceso Restringido: Tu rol de usuario no tiene permiso para editar ni actualizar medidas.', 'error');
      return;
    }
    setActiveEditingMeasure(measure);
    setMeasureModalMode('edit');
    setIsMeasureModalOpen(true);
  };

  // Save or Update Measure (incorporating PDF upload to Google Drive folder and audit log)
  const handleSaveMeasure = async (
    measure: JudicialMeasure,
    attachedFile?: File | null,
    folderName: string = 'Medidas Judiciales',
    removeExistingPdf: boolean = false
  ) => {
    const finalMeasure: JudicialMeasure = { ...measure };

    if (removeExistingPdf) {
      finalMeasure.hasCustomPdf = false;
      finalMeasure.pdfBase64 = undefined;
      finalMeasure.pdfBlobUrl = undefined;
      finalMeasure.pdfFileName = undefined;
      finalMeasure.pdfFileSize = undefined;
      finalMeasure.driveFileId = undefined;
      finalMeasure.driveFolder = undefined;
      finalMeasure.driveWebViewLink = undefined;
    }

    if (attachedFile) {
      try {
        const base64Data = await fileToBase64(attachedFile);
        const localBlobUrl = URL.createObjectURL(attachedFile);
        const targetFolder = folderName.trim() || 'Medidas Judiciales';

        finalMeasure.hasCustomPdf = true;
        finalMeasure.pdfBase64 = base64Data;
        finalMeasure.pdfBlobUrl = localBlobUrl;
        finalMeasure.pdfFileName = attachedFile.name;
        finalMeasure.pdfFileSize = attachedFile.size;
        finalMeasure.driveFolder = targetFolder;
        finalMeasure.uploadedAt = new Date().toISOString();

        // If Google Drive is authenticated, upload directly to the specified folder in Google Drive
        if (driveState.isConnected && driveState.accessToken) {
          try {
            showToast(`Cargando PDF a Google Drive en carpeta oficial...`, 'info');
            
            // Upload directly to target folder in Google Drive (Default ID: 1vsKodJ1LgaFSbejTiwcilEaHFcmnLmWe)
            const targetFolderId = driveState.uploadFolderId || DEFAULT_DRIVE_FOLDER_ID;

            const uploadResult = await DriveService.uploadPdfFile(
              driveState.accessToken,
              attachedFile,
              targetFolderId
            );

            finalMeasure.driveFileId = uploadResult.id;
            finalMeasure.driveWebViewLink = uploadResult.webViewLink;

            showToast(`PDF guardado con éxito en Google Drive`, 'success');
          } catch (driveErr: any) {
            console.warn('Google Drive direct upload warning:', driveErr);
            showToast(`PDF guardado localmente (Drive: ${driveErr.message || 'requiere reconexión'})`, 'info');
          }
        }

        // Also register in files list so it appears in the Drive Files Explorer
        const driveFileRecord: DriveFile = {
          id: finalMeasure.driveFileId || `measure-pdf-${finalMeasure.id}`,
          name: attachedFile.name,
          mimeType: 'application/pdf',
          size: attachedFile.size,
          createdTime: new Date().toISOString(),
          modifiedTime: new Date().toISOString(),
          category: 'Medidas Judiciales',
          tags: [
            'Medida Judicial',
            `Oficio ${finalMeasure.nroOficio}`,
            finalMeasure.victima,
            targetFolder
          ],
          isHostedLocal: !finalMeasure.driveFileId,
          localBlobUrl,
          description: `Oficio Judicial N° ${finalMeasure.nroOficio}. Beneficiario/a: ${finalMeasure.victima}. Denunciado: ${finalMeasure.victimario}. Organismo: ${finalMeasure.provenienteDe}. Carpeta en Drive: ${targetFolder}`,
          uploadedBy: currentUser.name,
          folderPath: targetFolder,
          driveId: finalMeasure.driveFileId,
        };

        setFiles((prev) => [driveFileRecord, ...prev.filter((f) => f.id !== driveFileRecord.id)]);
      } catch (err: any) {
        console.error('Error processing PDF upload:', err);
        showToast(`Error al procesar el archivo PDF: ${err.message}`, 'error');
      }
    }

    if (measureModalMode === 'create') {
      const updated = [finalMeasure, ...measures];
      updateMeasuresState(updated);
      addAuditLog(
        'CREATE_MEASURE',
        `Nueva medida judicial registrada para víctima ${finalMeasure.victima} (Oficio ${finalMeasure.nroOficio})${finalMeasure.hasCustomPdf ? ` con PDF en Google Drive carpeta "${finalMeasure.driveFolder}"` : ''}`,
        `Oficio ${finalMeasure.nroOficio}`,
        'SUCCESS'
      );
      showToast(
        `Medida judicial registrada exitosamente (Oficio ${finalMeasure.nroOficio})${finalMeasure.hasCustomPdf ? ' y PDF vinculado en Drive' : ''}`,
        'success'
      );
    } else {
      const updated = measures.map((m) => (m.id === finalMeasure.id ? finalMeasure : m));
      updateMeasuresState(updated);
      addAuditLog(
        'UPDATE_MEASURE',
        `Medida judicial actualizada para víctima ${finalMeasure.victima} (Oficio ${finalMeasure.nroOficio})${finalMeasure.hasCustomPdf ? ` con PDF en Google Drive carpeta "${finalMeasure.driveFolder}"` : ''}`,
        `Oficio ${finalMeasure.nroOficio}`,
        'SUCCESS'
      );
      showToast(
        `Medida judicial N° ${finalMeasure.nroOficio} actualizada correctamente${finalMeasure.hasCustomPdf ? ' (PDF guardado en Drive)' : ''}`,
        'success'
      );
    }
  };

  // Filter & Search Logic
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      // Search Query
      if (filters.query.trim()) {
        const query = filters.query.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesDesc = f.description?.toLowerCase().includes(query) || false;
        const matchesTags = f.tags.some((t) => t.toLowerCase().includes(query));
        const matchesCategory = f.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesTags && !matchesCategory) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'Todos' && f.category !== filters.category) {
        return false;
      }

      // Size preset
      if (filters.sizePreset === 'small' && f.size >= 1048576) {
        return false; // >= 1MB
      }
      if (filters.sizePreset === 'medium' && (f.size < 1048576 || f.size > 5242880)) {
        return false; // not between 1MB and 5MB
      }
      if (filters.sizePreset === 'large' && f.size <= 5242880) {
        return false; // <= 5MB
      }

      // Date preset
      if (filters.datePreset !== 'all') {
        const fileTime = new Date(f.modifiedTime).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (filters.datePreset === 'today' && now - fileTime > oneDay) {
          return false;
        }
        if (filters.datePreset === 'week' && now - fileTime > 7 * oneDay) {
          return false;
        }
        if (filters.datePreset === 'month' && now - fileTime > 30 * oneDay) {
          return false;
        }
        if (filters.datePreset === 'year' && now - fileTime > 365 * oneDay) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_desc':
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
        case 'date_asc':
          return new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });
  }, [files, filters]);

  // If not authenticated, display official police LoginScreen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center selection:bg-blue-500 selection:text-white">
        {toast && (
          <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-5 duration-300 max-w-md">
            <div
              className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                  : toast.type === 'info'
                  ? 'bg-blue-950/90 border-blue-700 text-blue-200'
                  : 'bg-amber-950/90 border-amber-700 text-amber-200'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
        <LoginScreen users={users} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300 max-w-md">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-950/90 border-blue-700 text-blue-200'
                : 'bg-amber-950/90 border-amber-700 text-amber-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <Lock className="w-5 h-5 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        userPermissions={currentPermissions}
        driveState={driveState}
        onConnectDrive={handleConnectDrive}
        onDisconnectDrive={handleDisconnectDrive}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCreateMeasure={handleOpenCreateMeasure}
        onInstallPwa={handleTriggerInstall}
        isInstallable={Boolean(deferredInstallPrompt)}
        isPwaInstalled={isPwaInstalled}
        fileCount={files.length}
        measuresCount={measures.length}
        identificationsCount={identifications.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. DEFAULT JUDICIAL MEASURES VIEW */}
        {currentTab === 'measures' && (
          <JudicialMeasuresExplorer
            measures={measures}
            userPermissions={currentPermissions}
            currentUser={currentUser}
            onViewPdf={handleViewMeasurePdf}
            onDownloadPdf={handleDownloadMeasurePdf}
            onOpenCreate={handleOpenCreateMeasure}
            onOpenEdit={handleOpenEditMeasure}
          />
        )}

        {/* 2. IDENTIFICACIÓN DE PERSONAS VIEW */}
        {currentTab === 'identifications' && (
          <PersonIdentificationExplorer
            identifications={identifications}
            measures={measures}
            userPermissions={currentPermissions}
            currentUser={currentUser}
            onOpenCreate={handleOpenCreatePerson}
            onOpenEdit={handleOpenEditPerson}
            onDelete={handleDeletePerson}
            onOpenWhatsApp={handleOpenPersonWhatsApp}
          />
        )}

        {/* 3. REPOSITORY FILES VIEW */}
        {currentTab === 'files' && (
          <div className="space-y-6">
            
            {/* Search & Filter Bar for PDF Files */}
            <SearchBarAndFilters
              filters={filters}
              setFilters={setFilters}
              totalMatches={filteredFiles.length}
              totalFiles={files.length}
              isDriveConnected={driveState.isConnected}
            />

            {/* Documents Grid / List */}
            {filteredFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredFiles.map((file) => (
                  <DocumentCard
                    key={file.id}
                    file={file}
                    permissions={currentPermissions}
                    onView={handleViewPdf}
                    onDownload={handleDownloadPdf}
                    onDelete={handleDeletePdf}
                  />
                ))}
              </div>
            ) : (
              /* Empty Search Results State */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No se encontraron documentos PDF</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    No hay resultados coincidentes con los filtros aplicados o la palabra clave ingresada.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() =>
                      setFilters({
                        query: '',
                        category: 'Todos',
                        datePreset: 'all',
                        sizePreset: 'all',
                        sortBy: 'date_desc',
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Filtros</span>
                  </button>

                  {currentPermissions.canUpload && (
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Alojar Nuevo PDF</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. ADMIN PANEL VIEW */}
        {currentTab === 'admin' && (
          <AdminPanel
            users={users}
            setUsers={setUsers}
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            auditLogs={auditLogs}
            driveState={driveState}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
            onUpdateDriveConfig={(searchFolderId, uploadFolderId) =>
              setDriveState((prev) => ({
                ...prev,
                searchFolderId: searchFolderId || null,
                uploadFolderId: uploadFolderId || null,
                folderId: searchFolderId || uploadFolderId || null,
              }))
            }
            onAddAuditLog={addAuditLog}
          />
        )}

      </main>

      {/* Measure Create / Update Modal */}
      {isMeasureModalOpen && (
        <MeasureModal
          isOpen={isMeasureModalOpen}
          onClose={() => setIsMeasureModalOpen(false)}
          onSave={handleSaveMeasure}
          initialMeasure={activeEditingMeasure}
          mode={measureModalMode}
          isDriveConnected={driveState.isConnected}
          currentUser={currentUser}
        />
      )}

      {/* Person Identification Create / Update Modal */}
      {isPersonModalOpen && (
        <PersonIdentificationModal
          isOpen={isPersonModalOpen}
          onClose={() => {
            setIsPersonModalOpen(false);
            setActiveEditingPerson(null);
          }}
          onSave={handleSavePerson}
          initialPerson={activeEditingPerson}
          mode={personModalMode}
          currentUser={currentUser}
          measures={measures}
        />
      )}

      {/* Person Identification WhatsApp Modal */}
      {whatsAppPerson && (
        <PersonWhatsAppModal
          isOpen={Boolean(whatsAppPerson)}
          onClose={() => setWhatsAppPerson(null)}
          person={whatsAppPerson.person}
          currentUser={currentUser}
          matchingMeasures={whatsAppPerson.matchingMeasures}
        />
      )}

      {/* PDF Integrated Viewer Modal */}
      {activeViewingFile && (
        <PdfViewerModal
          file={activeViewingFile}
          onClose={() => setActiveViewingFile(null)}
          permissions={currentPermissions}
          onDownload={handleDownloadPdf}
          driveToken={driveState.accessToken}
        />
      )}

      {/* Upload PDF Modal */}
      {isUploadOpen && (
        <UploadPdfModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onAddFile={handleAddFile}
          driveState={driveState}
          currentUserName={currentUser.name}
        />
      )}

      {/* PWA Download / Installation Instructions Modal */}
      {isInstallModalOpen && (
        <PwaInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          onTriggerInstall={handleTriggerInstall}
          canPrompt={Boolean(deferredInstallPrompt)}
          isInstalled={isPwaInstalled}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Drive PDF Explorer • Aplicación Web Descargable (PWA) con Control RBAC y Google Drive</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Almacenamiento Seguro
            </span>
            <span>•</span>
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              Cómo instalar
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

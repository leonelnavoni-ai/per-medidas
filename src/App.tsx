import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { ApiService } from './services/apiService';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'measures' | 'identifications' | 'files' | 'admin' | 'audit'>('measures');

  // Default Judicial Measures State (Stored on Web Server Database)
  const [measures, setMeasures] = useState<JudicialMeasure[]>(DEFAULT_JUDICIAL_MEASURES);

  // Measure Modal State
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [measureModalMode, setMeasureModalMode] = useState<'create' | 'edit'>('create');
  const [activeEditingMeasure, setActiveEditingMeasure] = useState<JudicialMeasure | null>(null);

  // Person Identification State (Stored on Web Server Database)
  const [identifications, setIdentifications] = useState<IdentifiedPerson[]>(INITIAL_IDENTIFIED_PERSONS);

  // Person Modal State
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personModalMode, setPersonModalMode] = useState<'create' | 'edit'>('create');
  const [activeEditingPerson, setActiveEditingPerson] = useState<IdentifiedPerson | null>(null);

  // WhatsApp Person Share Modal State
  const [whatsAppPerson, setWhatsAppPerson] = useState<{
    person: IdentifiedPerson;
    matchingMeasures: JudicialMeasure[];
  } | null>(null);

  // Documents State (General PDFs stored on Web Server)
  const [files, setFiles] = useState<DriveFile[]>(() => getInitialFiles());
  const [activeViewingFile, setActiveViewingFile] = useState<DriveFile | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Users & RBAC State (Stored and synchronized directly with the Web Server)
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const activeId = sessionStorage.getItem('police_app_active_user_id') || localStorage.getItem('police_app_active_user_id');
      if (activeId) {
        const found = INITIAL_USERS.find((u: UserProfile) => u.id === activeId);
        if (found) return found;
      }
    } catch (e) {}
    return INITIAL_USERS[0];
  });

  // Authentication State - Defaults to stored session or persistent session if remember was marked
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isRemembered = localStorage.getItem('police_app_remember_user_data') === 'true';
      if (isRemembered && localStorage.getItem('police_app_authenticated') === 'true') {
        return true;
      }
      const sessionAuth = sessionStorage.getItem('police_app_authenticated');
      if (sessionAuth === 'true') return true;
    } catch (e) {
      console.warn('Error reading auth state:', e);
    }
    return false;
  });

  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  // Sync state with server
  const isSyncingRef = useRef(false);
  const lastIdentEditTimeRef = useRef<number>(0);
  const lastUsersEditTimeRef = useRef<number>(0);

  const syncWithServer = useCallback(async (showNotice = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsServerSyncing(true);
    try {
      // Parallel requests for fast response on mobile data networks
      const [serverUsers, serverMeasures, serverIdents, serverDocs, serverAudit] = await Promise.all([
        ApiService.getUsers().catch((e) => {
          console.warn('Sync users notice:', e);
          return null;
        }),
        ApiService.getMeasures().catch((e) => {
          console.warn('Sync measures notice:', e);
          return null;
        }),
        ApiService.getIdentifications().catch((e) => {
          console.warn('Sync identifications notice:', e);
          return null;
        }),
        ApiService.getDocuments().catch((e) => {
          console.warn('Sync documents notice:', e);
          return null;
        }),
        ApiService.getAuditLogs().catch((e) => {
          console.warn('Sync audit notice:', e);
          return null;
        }),
      ]);

      let hasLiveResponse = false;

      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        if (Date.now() - lastUsersEditTimeRef.current > 7000) {
          setUsers(serverUsers);
        }
        hasLiveResponse = true;
      }
      if (Array.isArray(serverMeasures) && serverMeasures.length > 0) {
        setMeasures(serverMeasures);
        hasLiveResponse = true;
      }
      if (Array.isArray(serverIdents) && serverIdents.length > 0) {
        if (Date.now() - lastIdentEditTimeRef.current > 7000) {
          setIdentifications(serverIdents);
        }
        hasLiveResponse = true;
      }
      if (Array.isArray(serverDocs) && serverDocs.length > 0) {
        setFiles((prev) => {
          const driveFiles = prev.filter((f) => Boolean(f.driveId));
          const serverDocIds = new Set(serverDocs.map((d) => d.id));
          const filteredDrive = driveFiles.filter((df) => !serverDocIds.has(df.id));
          return [...serverDocs, ...filteredDrive];
        });
        hasLiveResponse = true;
      }
      if (Array.isArray(serverAudit) && serverAudit.length > 0) {
        setAuditLogs(serverAudit);
        hasLiveResponse = true;
      }

      if (hasLiveResponse) {
        setServerOnline(true);
        if (showNotice) {
          showToast('Sincronización con el servidor policial establecida.', 'success');
        }
      } else {
        const isHealthy = await ApiService.checkHealth();
        setServerOnline(isHealthy);
        if (isHealthy && showNotice) {
          showToast('Conectado con el servidor policial.', 'success');
        } else if (!isHealthy && showNotice) {
          showToast('Operando en modo local (sin conexión al servidor central).', 'warning');
        }
      }
    } catch (err) {
      console.warn('Aviso de sincronización con servidor:', err);
      setServerOnline(false);
      if (showNotice) {
        showToast('Operando en modo local seguro.', 'warning');
      }
    } finally {
      setIsServerSyncing(false);
      isSyncingRef.current = false;
    }
  }, []);

  // Sync on mount and keep mobile client refreshed periodically
  useEffect(() => {
    // Clear any legacy local storage user cache to ensure 100% server authority
    try {
      localStorage.removeItem('police_users_db_cache');
    } catch (e) {}

    syncWithServer(false);

    // Auto-poll every 6 seconds to keep mobile and desktop in real-time sync
    const pollTimer = setInterval(() => {
      syncWithServer(false);
    }, 6000);

    const handleFocus = () => {
      syncWithServer(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncWithServer]);

  // Safe user update function that pushes changes to web server database explicitly
  const updateUsersState = useCallback((updater: React.SetStateAction<UserProfile[]>) => {
    lastUsersEditTimeRef.current = Date.now();
    setUsers((prevUsers) => {
      const nextUsers = typeof updater === 'function' ? updater(prevUsers) : updater;
      // Send directly to web server database
      ApiService.saveUsers(nextUsers).catch((err) =>
        console.warn('Error al sincronizar usuarios con el servidor:', err)
      );
      return nextUsers;
    });
  }, []);

  // Keep currentUser in sync if updated in users list without circular triggers
  useEffect(() => {
    setCurrentUser((prevUser) => {
      const updated = users.find((u) => u.id === prevUser.id);
      if (!updated) return prevUser;
      const hasChanged =
        updated.name !== prevUser.name ||
        updated.email !== prevUser.email ||
        updated.role !== prevUser.role ||
        updated.status !== prevUser.status ||
        JSON.stringify(updated.customPermissions) !== JSON.stringify(prevUser.customPermissions);
      return hasChanged ? updated : prevUser;
    });
  }, [users]);

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
    // Persist to server in real time
    ApiService.recordAuditLog(newLog).catch((err) => {
      console.warn('Aviso guardando log de auditoría en servidor:', err);
    });
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
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Check for updates on load
        reg.update().catch(() => {});
      }).catch((err) => {
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
      sessionStorage.setItem('police_app_active_user_id', selectedUser.id);
    } catch (e) {}
    showToast(
      `Sesión cambiada a ${selectedUser.name} (Rol: ${selectedUser.role.toUpperCase()})`,
      'success'
    );
  };

  // Authentication Handlers
  const handleLogin = (user: UserProfile, remember: boolean = false) => {
    setCurrentUser(user);
    // Ensure newly authenticated user is integrated into users state
    setUsers((prevUsers) => {
      const exists = prevUsers.some((u) => u.id === user.id || u.username === user.username);
      if (!exists) {
        return [user, ...prevUsers];
      }
      return prevUsers.map((u) => (u.id === user.id ? { ...u, ...user } : u));
    });
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('police_app_authenticated', 'true');
      sessionStorage.setItem('police_app_active_user_id', user.id);
      if (remember) {
        localStorage.setItem('police_app_authenticated', 'true');
        localStorage.setItem('police_app_active_user_id', user.id);
      } else {
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

      // Check if file has embedded base64 data
      const base64Content = file.measureData?.pdfBase64 || file.pdfBase64;
      if (base64Content) {
        try {
          const rawBlob = base64ToBlob(base64Content);
          blobUrl = URL.createObjectURL(rawBlob);
        } catch (e) {
          console.warn('Error converting file base64 to blob:', e);
        }
      }

      if (!blobUrl && file.serverPdfUrl) {
        try {
          const res = await fetch(file.serverPdfUrl);
          const ct = res.headers.get('content-type') || '';
          if (res.ok && !ct.includes('text/html')) {
            const rawBlob = await res.blob();
            blobUrl = URL.createObjectURL(rawBlob);
          }
        } catch (e) {
          console.warn('Could not fetch serverPdfUrl:', e);
        }
      }

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

  // Helper to update files state and persist to web server repository
  const updateFilesState = (updater: (prev: DriveFile[]) => DriveFile[]) => {
    setFiles((prev) => {
      const nextFiles = updater(prev);
      // Persist directly to web server
      ApiService.saveDocuments(nextFiles).catch((err) =>
        console.warn('Error al guardar documentos en el servidor web:', err)
      );
      return nextFiles;
    });
  };

  // Delete PDF
  const handleDeletePdf = (file: DriveFile) => {
    if (!currentPermissions.canDelete) {
      showToast('Acceso denegado: No cuentas con permisos para eliminar documentos.', 'error');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar "${file.name}" del repositorio del servidor?`)) {
      updateFilesState((prev) => prev.filter((f) => f.id !== file.id));
      addAuditLog('DELETE', `Documento eliminado del repositorio del servidor`, file.name, 'SUCCESS');
      showToast(`Archivo "${file.name}" eliminado correctamente del servidor.`, 'success');
    }
  };

  // Add Uploaded PDF File
  const handleAddFile = (newFile: DriveFile) => {
    updateFilesState((prev) => [newFile, ...prev]);
    addAuditLog(
      'UPLOAD',
      `Nuevo archivo PDF alojado en servidor e indexado (${newFile.category})`,
      newFile.name,
      'SUCCESS'
    );
    showToast(`PDF "${newFile.name}" alojado en el servidor e indexado correctamente.`, 'success');
  };

  // State update helper for Judicial Measures with direct web server persistence
  const updateMeasuresState = (newMeasures: JudicialMeasure[]) => {
    setMeasures(newMeasures);
    // Persist directly to web server database
    ApiService.saveMeasures(newMeasures).catch((err) =>
      console.warn('Error al guardar medidas en el servidor:', err)
    );
  };

  // State update helper for Identified Persons with direct web server persistence
  const updateIdentificationsState = (newIdentifications: IdentifiedPerson[]) => {
    setIdentifications(newIdentifications);
    // Persist directly to web server database
    ApiService.saveIdentifications(newIdentifications).catch((err) =>
      console.warn('Error al guardar identificaciones en el servidor:', err)
    );
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
      person.createdBy === currentUser.name ||
      currentUser.role === 'superadmin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'editor';
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
    lastIdentEditTimeRef.current = Date.now();
    const isEdit = personModalMode === 'edit';
    const exists = identifications.some((p) => p.id === person.id);
    let updated: IdentifiedPerson[];

    if (exists) {
      updated = identifications.map((p) => (p.id === person.id ? person : p));
    } else {
      updated = [person, ...identifications];
    }

    setIdentifications(updated);

    // Save individual record first for instant server-side persistence
    ApiService.saveSingleIdentification(person)
      .then(() => console.log('Persona identificada persistida en servidor:', person.apellidoNombre))
      .catch((err) => console.warn('Aviso guardando identificación individual:', err));

    // Also persist full list to guarantee synchronization
    ApiService.saveIdentifications(updated).catch((err) =>
      console.warn('Error al guardar identificaciones en el servidor:', err)
    );

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
      lastIdentEditTimeRef.current = Date.now();
      const updated = identifications.filter((p) => p.id !== person.id);
      setIdentifications(updated);

      ApiService.deleteIdentification(person.id).catch(() => {
        ApiService.saveIdentifications(updated).catch(() => {});
      });

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
      const safeOficio = (measure.nroOficio || 'SN').replace(/[^a-zA-Z0-9]/g, '_');

      // 1. If measure has embedded custom PDF base64, prioritize it for instant 100% genuine download
      if (measure.hasCustomPdf && measure.pdfBase64) {
        blob = base64ToBlob(measure.pdfBase64);
        downloadFileName = measure.pdfFileName || `Oficio_Judicial_${safeOficio}.pdf`;
      } else if (measure.hasCustomPdf && measure.serverPdfUrl) {
        try {
          const res = await fetch(measure.serverPdfUrl);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && !contentType.includes('text/html')) {
            blob = await res.blob();
            downloadFileName = measure.pdfFileName || `Oficio_Judicial_${safeOficio}.pdf`;
          } else {
            throw new Error(`Servidor devolvió contenido no binario (${contentType})`);
          }
        } catch (fetchErr) {
          console.warn('Fallback a base64 o generado tras error de red:', fetchErr);
          if (measure.pdfBase64) {
            blob = base64ToBlob(measure.pdfBase64);
            downloadFileName = measure.pdfFileName || `Oficio_Judicial_${safeOficio}.pdf`;
          } else {
            blob = generateJudicialMeasurePdfBlob(measure);
            downloadFileName = `Oficio_Judicial_${safeOficio}.pdf`;
          }
        }
      } else if (measure.hasCustomPdf && measure.driveFileId && driveState.isConnected && driveState.accessToken) {
        try {
          blob = await DriveService.downloadPdfBlob(driveState.accessToken, measure.driveFileId);
          downloadFileName = measure.pdfFileName || `Oficio_${safeOficio}.pdf`;
        } catch {
          blob = generateJudicialMeasurePdfBlob(measure);
          downloadFileName = `Oficio_Judicial_${safeOficio}.pdf`;
        }
      } else {
        blob = generateJudicialMeasurePdfBlob(measure);
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
        // Upload to server storage
        let serverPdfUrl: string | undefined;
        try {
          const uploadRes = await ApiService.uploadPdf(attachedFile);
          serverPdfUrl = uploadRes.fileUrl;
        } catch (serverErr) {
          console.warn('Advertencia al guardar PDF en servidor:', serverErr);
        }

        const base64Data = await fileToBase64(attachedFile);
        const localBlobUrl = URL.createObjectURL(attachedFile);
        const targetFolder = folderName.trim() || 'Medidas Judiciales';

        finalMeasure.hasCustomPdf = true;
        finalMeasure.serverPdfUrl = serverPdfUrl;
        finalMeasure.pdfBase64 = base64Data;
        finalMeasure.pdfBlobUrl = serverPdfUrl || localBlobUrl;
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
          serverPdfUrl,
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
        <LoginScreen
          users={users}
          onLogin={handleLogin}
          isServerOnline={serverOnline}
          isServerSyncing={isServerSyncing}
          onRetryConnection={() => syncWithServer(true)}
        />
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
        onInstallPwa={handleTriggerInstall}
        isInstallable={Boolean(deferredInstallPrompt)}
        isPwaInstalled={isPwaInstalled}
        fileCount={files.length}
        measuresCount={measures.length}
        identificationsCount={identifications.length}
        isServerSyncing={isServerSyncing}
        serverOnline={serverOnline}
        onManualSync={() => syncWithServer(true)}
      />

      {/* Main Content Area - Totalmente adaptado para pantallas móviles, tablets y escritorio */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
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

        {/* 3. ADMIN & AUDIT PANEL VIEW */}
        {(currentTab === 'admin' || currentTab === 'audit') && (
          <AdminPanel
            users={users}
            setUsers={updateUsersState}
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
            initialSubTab={currentTab === 'audit' ? 'audit' : 'users'}
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

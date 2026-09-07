import React, { useState } from 'react';
import {
  Users,
  Shield,
  FileCheck,
  HardDrive,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  ShieldAlert,
  Copy,
  CheckCheck,
  Sparkles,
  BadgeCheck,
  MessageCircle,
} from 'lucide-react';
import { UserWhatsAppModal } from './UserWhatsAppModal';
import {
  UserProfile,
  RoleType,
  AuditLog,
  DriveConnectionState,
  PermissionSet,
  ROLE_DEFAULT_PERMISSIONS
} from '../types';
import { formatDate } from '../utils/formatters';
import { DEFAULT_DRIVE_FOLDER_ID, DEFAULT_DRIVE_FOLDER_URL } from '../data/initialData';

interface AdminPanelProps {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  auditLogs: AuditLog[];
  driveState: DriveConnectionState;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onUpdateDriveConfig: (searchFolderId: string, uploadFolderId: string) => void;
  onAddAuditLog: (action: any, details: string, targetFile?: string, status?: 'SUCCESS' | 'DENIED') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  setUsers,
  currentUser,
  onSwitchUser,
  auditLogs,
  driveState,
  onConnectDrive,
  onDisconnectDrive,
  onUpdateDriveConfig,
  onAddAuditLog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audit' | 'drive'>('users');
  
  // User creation modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserBadge, setNewUserBadge] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('viewer');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // User editing & permissions modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBadgeNumber, setEditBadgeNumber] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<RoleType>('viewer');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [editPermissions, setEditPermissions] = useState<PermissionSet>({ ...ROLE_DEFAULT_PERMISSIONS.viewer });

  // Clipboard and quick password visibility states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});

  // WhatsApp credentials sharing modal
  const [whatsAppTargetUser, setWhatsAppTargetUser] = useState<UserProfile | null>(null);
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState(true);

  // Password generator
  const generateSecurePassword = () => {
    const prefix = 'Pol';
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['!', '#', '$', '*', '@'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}-${num}${sym}`;
  };

  const handleCopyPassword = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswordIds((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleQuickRegeneratePassword = (user: UserProfile) => {
    const newPass = generateSecurePassword();
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, password: newPass } : u))
    );
    handleCopyPassword(newPass, `user-${user.id}`);
    onAddAuditLog(
      'GENERATE_PASSWORD',
      `Nueva contraseña generada y copiada para ${user.name} (${user.username || user.email})`,
      undefined,
      'SUCCESS'
    );
  };

  // User deletion state
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // Pre-configured Search and Save repository locations
  const [searchFolderInput, setSearchFolderInput] = useState(
    driveState.searchFolderId || driveState.folderId || DEFAULT_DRIVE_FOLDER_ID
  );
  const [uploadFolderInput, setUploadFolderInput] = useState(
    driveState.uploadFolderId || driveState.folderId || DEFAULT_DRIVE_FOLDER_ID
  );
  const [folderSaveSuccess, setFolderSaveSuccess] = useState(false);

  // Audit log filter
  const [auditFilter, setAuditFilter] = useState('');

  const handleRoleChange = (userId: string, newRole: RoleType) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          // If user had custom permissions, keep or reset based on user preference
          return { ...u, role: newRole };
        }
        return u;
      })
    );
    const targetUser = users.find((u) => u.id === userId);
    onAddAuditLog(
      'UPDATE_PERMISSIONS',
      `Cambio de rol de ${targetUser?.name || userId} a ${newRole}`,
      undefined,
      'SUCCESS'
    );
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'inactive' : 'active';
          onAddAuditLog(
            'UPDATE_PERMISSIONS',
            `Estado de ${u.name} cambiado a ${newStatus}`,
            undefined,
            'SUCCESS'
          );
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const assignedPassword = newUserPassword.trim() || generateSecurePassword();
    const suggestedUsername = newUserUsername.trim() || newUserEmail.trim().split('@')[0].toLowerCase();

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      username: suggestedUsername,
      password: assignedPassword,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      badgeNumber: newUserBadge.trim() || `LP-${Math.floor(10000 + Math.random() * 90000)}`,
      department: newUserDepartment.trim() || 'Comisaría del Menor y V. Familiar',
      role: newUserRole,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUsers((prev) => [newUser, ...prev]);
    onAddAuditLog(
      'CREATE_USER',
      `Nuevo usuario creado: ${newUser.name} (@${newUser.username}) con rol ${newUser.role} y contraseña generada`,
      undefined,
      'SUCCESS'
    );

    // Auto copy the password to clipboard for admin convenience
    handleCopyPassword(assignedPassword, `user-${newUser.id}`);

    // If requested, immediately open the WhatsApp credentials modal for this new user
    if (sendWhatsAppOnCreate) {
      setWhatsAppTargetUser(newUser);
    }

    setNewUserName('');
    setNewUserUsername('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserBadge('');
    setNewUserDepartment('');
    setNewUserRole('viewer');
    setShowAddUserModal(false);
  };

  // Start editing user and load their data & permissions
  const handleStartEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username || user.email.split('@')[0]);
    setEditEmail(user.email);
    setEditPassword(user.password || 'admin123');
    setEditBadgeNumber(user.badgeNumber || '');
    setEditDepartment(user.department || '');
    setEditRole(user.role);
    setEditStatus(user.status);
    const hasCustom = Boolean(user.customPermissions && Object.keys(user.customPermissions).length > 0);
    setUseCustomPermissions(hasCustom);
    setEditPermissions({
      ...ROLE_DEFAULT_PERMISSIONS[user.role],
      ...(user.customPermissions || {})
    });
  };

  const handleEditRoleSelect = (newRole: RoleType) => {
    setEditRole(newRole);
    if (!useCustomPermissions) {
      setEditPermissions({ ...ROLE_DEFAULT_PERMISSIONS[newRole] });
    }
  };

  const handleTogglePermission = (key: keyof PermissionSet) => {
    setUseCustomPermissions(true);
    setEditPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleResetToRoleDefaults = () => {
    setEditPermissions({ ...ROLE_DEFAULT_PERMISSIONS[editRole] });
    setUseCustomPermissions(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) return;

    const passwordChanged = editingUser.password !== editPassword;

    const updatedUser: UserProfile = {
      ...editingUser,
      name: editName.trim(),
      username: editUsername.trim() || editingUser.username || editEmail.split('@')[0],
      email: editEmail.trim().toLowerCase(),
      password: editPassword.trim() || editingUser.password || 'admin123',
      badgeNumber: editBadgeNumber.trim() || editingUser.badgeNumber,
      department: editDepartment.trim() || editingUser.department,
      role: editRole,
      status: editStatus,
      customPermissions: useCustomPermissions ? { ...editPermissions } : undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    onAddAuditLog(
      'UPDATE_USER',
      `Datos de ${updatedUser.name} actualizados (Rol: ${updatedUser.role}, Estado: ${updatedUser.status}${passwordChanged ? ', Contraseña modificada' : ''}${useCustomPermissions ? ', Permisos personalizados asignados' : ''})`,
      undefined,
      'SUCCESS'
    );

    setEditingUser(null);
  };

  const handleStartDelete = (user: UserProfile) => {
    setDeletingUser(user);
  };

  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser.id) return;

    const target = deletingUser;
    setUsers((prev) => prev.filter((u) => u.id !== target.id));

    onAddAuditLog(
      'DELETE_USER',
      `Usuario ${target.name} (${target.email}) eliminado definitivamente del sistema`,
      undefined,
      'SUCCESS'
    );

    setDeletingUser(null);
  };

  const extractIdFromUrl = (val: string): string => {
    const trimmed = val.trim();
    if (trimmed.includes('drive.google.com') && trimmed.includes('/folders/')) {
      const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  };

  const handleSaveDriveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearch = extractIdFromUrl(searchFolderInput) || DEFAULT_DRIVE_FOLDER_ID;
    const cleanUpload = extractIdFromUrl(uploadFolderInput) || DEFAULT_DRIVE_FOLDER_ID;
    setSearchFolderInput(cleanSearch);
    setUploadFolderInput(cleanUpload);
    onUpdateDriveConfig(cleanSearch, cleanUpload);
    setFolderSaveSuccess(true);
    setTimeout(() => setFolderSaveSuccess(false), 3000);
    onAddAuditLog(
      'UPDATE_PERMISSIONS',
      `Ubicaciones de Google Drive configuradas: Búsqueda [${cleanSearch}] | Guardado [${cleanUpload}]`,
      undefined,
      'SUCCESS'
    );
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.userName.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.action.toLowerCase().includes(auditFilter.toLowerCase())
  );

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'editor':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  const getRoleLabel = (role: RoleType) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Lector';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Title Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Panel de Administración y Seguridad
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control de accesos basado en roles (RBAC), auditoría y enlace con Google Drive
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios & Roles</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Auditoría de Accesos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('drive')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'drive'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Base Google Drive</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GESTIÓN DE USUARIOS Y ROLES */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          
          {/* Permissions Matrix Reference Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Matriz de Permisos por Rol (RBAC)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reglas activas de control de acceso aplicadas en la interfaz y visor
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Nuevo Usuario</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-3">Rol</th>
                    <th className="py-2 px-3 text-center">Buscar PDFs</th>
                    <th className="py-2 px-3 text-center">Visualizar</th>
                    <th className="py-2 px-3 text-center">Identificar Personas</th>
                    <th className="py-2 px-3 text-center">Descargar</th>
                    <th className="py-2 px-3 text-center">Alojar / Subir</th>
                    <th className="py-2 px-3 text-center">Eliminar</th>
                    <th className="py-2 px-3 text-center">Gestión Usuarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-purple-300">Super Admin</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-blue-300">Administrador</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-emerald-300">Editor</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">✗ Bloqueado</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">✗ Bloqueado</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-amber-300">Lector (Viewer)</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">✓ Permitido</td>
                    <td className="py-2.5 px-3 text-center text-rose-400 font-medium">✗ Bloqueado</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">✗ Bloqueado</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">✗ Bloqueado</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">✗ Bloqueado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* User List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Usuarios Registrados en el Sistema ({users.length})
              </h3>
              <p className="text-xs text-slate-400">
                Usa el botón "Probar este rol" para simular la vista del usuario inmediatamente
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Efectivo / Legajo</th>
                    <th className="py-2.5 px-3">Correo</th>
                    <th className="py-2.5 px-3">Credencial (Contraseña)</th>
                    <th className="py-2.5 px-3">Rol Asignado</th>
                    <th className="py-2.5 px-3">Permisos</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Último Acceso</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    const hasCustom = Boolean(u.customPermissions && Object.keys(u.customPermissions).length > 0);
                    const isPassVisible = Boolean(visiblePasswordIds[u.id]);
                    const userPass = u.password || 'admin123';
                    const isCopied = copiedId === `user-${u.id}`;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                                    Tú (Sesión)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                                  @{u.username || u.email.split('@')[0]}
                                </span>
                                {u.badgeNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300 font-medium">
                                      {u.badgeNumber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {u.email}
                        </td>

                        {/* Credencial / Contraseña con generador rápido */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-mono text-xs flex items-center min-w-[85px] justify-center select-all">
                              {isPassVisible ? userPass : '••••••••'}
                            </div>

                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title={isPassVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyPassword(userPass, `user-${u.id}`)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Copiar contraseña"
                            >
                              {isCopied ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setWhatsAppTargetUser(u)}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                              title={`Enviar credenciales de acceso de ${u.name} por WhatsApp`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickRegeneratePassword(u)}
                              className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Generar nueva contraseña aleatoria segura y copiarla"
                            >
                              <Sparkles className="w-3 h-3 text-blue-500" />
                              <span className="hidden xl:inline">Regenerar</span>
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as RoleType)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none ${getRoleBadge(
                              u.role
                            )}`}
                          >
                            <option value="superadmin">Super Admin</option>
                            <option value="admin">Administrador</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Lector (Solo vista)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          {hasCustom ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold" title="Este usuario tiene permisos personalizados asignados">
                              <Sliders className="w-3 h-3" />
                              <span>Personalizados</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Estándar del Rol
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                              u.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>Suspendido</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {u.lastLogin ? formatDate(u.lastLogin) : 'Nunca'}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Enviar credenciales por WhatsApp */}
                            <button
                              onClick={() => setWhatsAppTargetUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title={`Enviar datos de acceso de ${u.name} por WhatsApp`}
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Editar datos y permisos */}
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Modificar datos, cambiar clave o asignar permisos específicos"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>

                            {/* Probar rol */}
                            <button
                              onClick={() => onSwitchUser(u)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                              title="Simular interfaz como este usuario para validar permisos"
                            >
                              Probar
                            </button>

                            {/* Eliminar usuario */}
                            <button
                              onClick={() => handleStartDelete(u)}
                              disabled={isCurrent}
                              className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isCurrent ? 'No puedes eliminar tu propio usuario en sesión activa' : `Eliminar a ${u.name} del sistema`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: AUDITORÍA DE ACCESOS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Registro Integral de Auditoría & Trazabilidad</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Historial cronológico de búsquedas, aperturas de documentos, descargas e intentos de acceso
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Filtrar logs..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-2 px-3">Fecha y Hora</th>
                  <th className="py-2 px-3">Usuario & Rol</th>
                  <th className="py-2 px-3">Acción</th>
                  <th className="py-2 px-3">Detalle del Evento</th>
                  <th className="py-2 px-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{log.userRole}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                      {log.targetFileName && (
                        <div className="text-blue-500 font-mono text-[11px] mt-0.5 truncate">
                          📄 {log.targetFileName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? 'PERMITIDO' : 'DENEGADO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN BASE GOOGLE DRIVE */}
      {activeSubTab === 'drive' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Connection Status Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Estado de la Base de Datos Google Drive
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  driveState.isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {driveState.isConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Conexión Activa (Google Drive API v3)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Modo Desconectado (Repositorio Local)</span>
                  </>
                )}
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">OAuth 2.0 Client ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200 text-[11px] truncate max-w-xs">
                    393656741660-le42431m94mdl4228vvmos20p2rvd7sv.apps.googleusercontent.com
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alcances (Scopes):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    drive.readonly, drive.file
                  </span>
                </div>
                {driveState.userEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cuenta de Drive autorizada:</span>
                    <span className="font-semibold text-blue-500">
                      {driveState.userEmail}
                    </span>
                  </div>
                )}
              </div>

              {/* Notice: Location & Destination Hidden from Users */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Privacidad y Aislamiento de Ubicaciones Activo
                </span>
                <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
                  Los usuarios y lectores no visualizan nombres de carpetas, rutas ni URLs de Google Drive. El sistema busca y almacena en segundo plano según la configuración fijada a continuación.
                </p>
              </div>

              {/* Configure Pre-Set Locations for Searching and Saving */}
              <form onSubmit={handleSaveDriveConfig} className="pt-2 space-y-4">
                
                {/* 1. Folder to Search / Index from */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    1. Carpeta donde buscar la información (ID de Google Drive):
                  </label>
                  <input
                    type="text"
                    value={searchFolderInput}
                    onChange={(e) => setSearchFolderInput(e.target.value)}
                    placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs (o dejar en blanco para raíz)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    El sistema indexará y ejecutará las búsquedas de los usuarios exclusivamente dentro de esta carpeta.
                  </p>
                </div>

                {/* 2. Folder to Save / Upload to */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      2. Carpeta donde guardar los archivos PDF (Google Drive):
                    </label>
                    <a
                      href={DEFAULT_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Abrir carpeta en Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={uploadFolderInput}
                    onChange={(e) => setUploadFolderInput(e.target.value)}
                    placeholder={DEFAULT_DRIVE_FOLDER_ID}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cualquier nuevo PDF subido por los usuarios se guardará automáticamente en este destino de Google Drive (ID: {DEFAULT_DRIVE_FOLDER_ID}).
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Guardar Configuración de Ubicaciones
                  </button>
                  {folderSaveSuccess && (
                    <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ubicaciones configuradas y protegidas.</span>
                    </p>
                  )}
                </div>
              </form>

              {/* Action buttons */}
              <div className="pt-3 flex items-center gap-3">
                {driveState.isConnected ? (
                  <button
                    onClick={onDisconnectDrive}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Desconectar Google Drive
                  </button>
                ) : (
                  <button
                    onClick={onConnectDrive}
                    disabled={driveState.isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {driveState.isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5" />
                    )}
                    <span>Autorizar y Conectar Google Drive</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Diagnostics & Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              <span>Garantías de Seguridad</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl">
                <span className="font-bold text-blue-700 dark:text-blue-300 block mb-1">
                  1. Token Client-Side Exclusivo
                </span>
                Los tokens de acceso OAuth se manejan directamente en el cliente mediante Google Identity Services, sin exponer secretos ni credenciales privadas.
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                  2. Visualizador Embebido Seguro
                </span>
                Los documentos PDF se renderizan directamente mediante Blob URLs y enlaces seguros oficiales, evitando descargas accidentales no autorizadas.
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl">
                <span className="font-bold text-purple-700 dark:text-purple-300 block mb-1">
                  3. Control de Descargas RBAC
                </span>
                Los usuarios con rol "Lector" tienen restringida la descarga binaria de los documentos para evitar fugas de información.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modal: Agregar Nuevo Usuario */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span>Registrar Nuevo Usuario</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nombre y Apellido Completo:
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => {
                    setNewUserName(e.target.value);
                    if (!newUserUsername) {
                      const clean = e.target.value.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
                      setNewUserUsername(clean);
                    }
                  }}
                  placeholder="ej: Oficial Inspector Walter Ríos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Usuario de Acceso:
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="ej: wrios o walter.rios"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Legajo Policial (Opcional):
                  </label>
                  <input
                    type="text"
                    value={newUserBadge}
                    onChange={(e) => setNewUserBadge(e.target.value)}
                    placeholder="ej: LP-24890"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Correo Institucional:
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="ej: walter.rios@policia.gov.ar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Dependencia Policial:
                  </label>
                  <input
                    type="text"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    placeholder="ej: Comisaría del Menor y V. Familiar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Generador de Contraseña */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contraseña de Acceso al Sistema:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = generateSecurePassword();
                      setNewUserPassword(pass);
                      setShowNewPassword(true);
                      handleCopyPassword(pass, 'new-user-pass');
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar Clave Automática</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Ingresa o genera una contraseña segura"
                      className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newUserPassword && (
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(newUserPassword, 'new-user-pass')}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copiar contraseña"
                    >
                      {copiedId === 'new-user-pass' ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">¡Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Si dejas este campo vacío, el sistema generará automáticamente una clave segura y la copiará al portapapeles.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Rol Inicial en el Sistema:
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="viewer">Lector (Solo búsqueda y visualización, sin descarga)</option>
                  <option value="editor">Editor (Búsqueda, visualización, descarga y subida)</option>
                  <option value="admin">Administrador (Control total y gestión de usuarios)</option>
                  <option value="superadmin">Super Admin (Control supremo de todo el sistema)</option>
                </select>
              </div>

              {/* Opción de envío por WhatsApp */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppOnCreate}
                    onChange={(e) => setSendWhatsAppOnCreate(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Enviar credenciales por WhatsApp al crear</span>
                    </span>
                    <p className="text-[10.5px] text-emerald-700/80 dark:text-emerald-300/80">
                      Abre la ventana lista con usuario, clave y enlace oficial para enviar al efectivo.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Usuario y Credencial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Datos de Usuario y Asignar Permisos */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Edit2 className="w-4 h-4 text-blue-500" />
                  <span>Modificar Datos y Asignar Permisos</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gestiona la identidad, rol y permisos personalizados de {editingUser.name}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-5 text-xs">
              {/* Sección 1: Datos Básicos */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Datos de la Cuenta</span>
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Nombre y Apellido Completo:
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre del usuario"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Usuario de Acceso (@):
                      </label>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="ej: wrios"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Correo Institucional:
                      </label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Legajo Policial:
                      </label>
                      <input
                        type="text"
                        value={editBadgeNumber}
                        onChange={(e) => setEditBadgeNumber(e.target.value)}
                        placeholder="ej: LP-30129"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Dependencia Policial:
                    </label>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder="ej: Comisaría del Menor y V. Familiar"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Modificar / Regenerar Contraseña */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                        <span>Contraseña de Acceso al Sistema:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pass = generateSecurePassword();
                          setEditPassword(pass);
                          setShowEditPassword(true);
                          handleCopyPassword(pass, 'edit-user-pass');
                        }}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generar Nueva Clave</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          required
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Contraseña del usuario"
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyPassword(editPassword, 'edit-user-pass')}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                        title="Copiar contraseña"
                      >
                        {copiedId === 'edit-user-pass' ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">¡Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Rol Asignado:
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => handleEditRoleSelect(e.target.value as RoleType)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="superadmin">Super Admin (Control supremo del sistema)</option>
                        <option value="admin">Administrador (Control total y gestión de usuarios)</option>
                        <option value="editor">Editor (Búsqueda, visualización, descarga y subida)</option>
                        <option value="viewer">Lector (Solo búsqueda y visualización)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Estado de la Cuenta:
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="active">Activo (Acceso permitido al sistema)</option>
                        <option value="inactive">Suspendido (Acceso bloqueado)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Asignación Granular de Permisos */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>Asignación Individual de Permisos (RBAC)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Marca las casillas para otorgar o revocar permisos específicos a este usuario
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToRoleDefaults}
                    className="self-start sm:self-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restablecer a valores del rol</span>
                  </button>
                </div>

                {/* Switch para activar permisos personalizados */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomPermissions}
                      onChange={(e) => setUseCustomPermissions(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-blue-900 dark:text-blue-200">
                        Personalizar permisos independientes para este usuario
                      </span>
                      <span className="block text-[11px] text-blue-700/80 dark:text-blue-300/80">
                        {useCustomPermissions
                          ? 'Los permisos configurados abajo sobrescribirán los permisos estándar del rol.'
                          : 'El usuario actualmente hereda los permisos estándar de su rol.'}
                      </span>
                    </div>
                  </label>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    useCustomPermissions 
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700' 
                      : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                  }`}>
                    {useCustomPermissions ? 'Personalizado' : 'Por Rol'}
                  </span>
                </div>

                {/* Grid de los permisos granulares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { key: 'canSearch' as keyof PermissionSet, label: 'Buscar Medidas y Registros', desc: 'Permite buscar expedientes y oficios en el sistema' },
                    { key: 'canView' as keyof PermissionSet, label: 'Visualizar Documentos y PDFs', desc: 'Permite abrir y ver medidas y archivos en el visor integrado' },
                    { key: 'canIdentifyPerson' as keyof PermissionSet, label: 'Identificar Personas', desc: 'Permite registrar e identificar ciudadanos en controles policiales' },
                    { key: 'canDownload' as keyof PermissionSet, label: 'Descargar Archivos PDF', desc: 'Habilita la descarga local de archivos PDF' },
                    { key: 'canUpload' as keyof PermissionSet, label: 'Cargar Medidas y Subir PDFs', desc: 'Permite registrar nuevas medidas de protección y subir archivos' },
                    { key: 'canEdit' as keyof PermissionSet, label: 'Editar Datos de Medidas', desc: 'Habilita modificar oficios, vencimientos y estados' },
                    { key: 'canDelete' as keyof PermissionSet, label: 'Eliminar Medidas Judiciales', desc: 'Permite suprimir registros del libro de medidas' },
                    { key: 'canManageUsers' as keyof PermissionSet, label: 'Administrar Usuarios y Permisos', desc: 'Acceso a este panel administrativo de usuarios y roles' },
                    { key: 'canConfigureDrive' as keyof PermissionSet, label: 'Configurar Google Drive', desc: 'Permite modificar las carpetas del repositorio central' },
                    { key: 'canViewAuditLogs' as keyof PermissionSet, label: 'Ver Auditoría y Trazabilidad', desc: 'Acceso a registros de auditoría y accesos de usuarios' },
                  ].map((perm) => {
                    const isChecked = editPermissions[perm.key];
                    return (
                      <div
                        key={perm.key}
                        onClick={() => handleTogglePermission(perm.key)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold text-xs ${isChecked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                              {perm.label}
                            </span>
                            {isChecked ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Concedido
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Denegado
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                            {perm.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const previewUser: UserProfile = {
                      ...editingUser,
                      name: editName.trim() || editingUser.name,
                      username: editUsername.trim() || editingUser.username,
                      email: editEmail.trim() || editingUser.email,
                      password: editPassword.trim() || editingUser.password || 'admin123',
                      badgeNumber: editBadgeNumber.trim() || editingUser.badgeNumber,
                      department: editDepartment.trim() || editingUser.department,
                      role: editRole,
                      status: editStatus,
                    };
                    setWhatsAppTargetUser(previewUser);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Enviar los datos y credenciales de acceso por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar Credenciales por WhatsApp</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación de Usuario */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Confirmar Eliminación de Usuario
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  Esta acción es destructiva e irreversible
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                ¿Confirmas que deseas eliminar de forma permanente al usuario del sistema?
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl space-y-1">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {deletingUser.name}
                </p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {deletingUser.email}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold">
                    Rol: {deletingUser.role.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ID: {deletingUser.id}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px]">
                El usuario perderá todo acceso al libro de medidas judiciales y documentos inmediatamente. La baja se registrará en el registro histórico de auditoría.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Usuario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Credenciales de Acceso por WhatsApp */}
      <UserWhatsAppModal
        isOpen={Boolean(whatsAppTargetUser)}
        onClose={() => setWhatsAppTargetUser(null)}
        targetUser={whatsAppTargetUser}
        currentUser={currentUser}
      />

    </div>
  );
};

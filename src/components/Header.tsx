import React, { useState } from 'react';
import {
  FileText,
  HardDrive,
  Shield,
  Download,
  CheckCircle2,
  Users,
  ChevronDown,
  LogOut,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, DriveConnectionState, PermissionSet } from '../types';
import { PoliceLogo } from './PoliceLogo';

interface HeaderProps {
  currentTab: 'measures' | 'identifications' | 'files' | 'admin' | 'audit';
  setCurrentTab: (tab: 'measures' | 'identifications' | 'files' | 'admin' | 'audit') => void;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onSwitchUser?: (user: UserProfile) => void;
  userPermissions: PermissionSet;
  driveState: DriveConnectionState;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onOpenUpload: () => void;
  onInstallPwa: () => void;
  isInstallable: boolean;
  isPwaInstalled: boolean;
  fileCount: number;
  measuresCount: number;
  identificationsCount?: number;
  isLogoApplied?: boolean;
  onOpenLogoPreview?: () => void;
  logoVariant?: 'adapted' | 'original';
  onLogout?: () => void;
  isServerSyncing?: boolean;
  serverOnline?: boolean;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  allUsers = [],
  onSwitchUser,
  userPermissions,
  driveState,
  onConnectDrive,
  onDisconnectDrive,
  onOpenUpload,
  onInstallPwa,
  isInstallable,
  isPwaInstalled,
  fileCount,
  measuresCount,
  identificationsCount = 0,
  isLogoApplied = false,
  onOpenLogoPreview,
  logoVariant = 'adapted',
  onLogout,
  isServerSyncing = false,
  serverOnline = true,
  onManualSync,
}) => {
  const [showDriveMenu, setShowDriveMenu] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
      case 'editor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Lector';
      default: return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md bg-opacity-95 w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[3.25rem] sm:min-h-[3.5rem] py-1.5 gap-2 sm:gap-3">
          
          {/* App Brand & Identity */}
          <div 
            className="flex items-center space-x-1.5 sm:space-x-2.5 cursor-pointer min-w-0 shrink" 
            onClick={() => setCurrentTab('measures')}
            title="Comisaría de Minoridad y Violencia Familiar - Policía de Entre Ríos"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center filter drop-shadow-md">
              <PoliceLogo className="w-7 h-7 sm:w-9 sm:h-9" variant={logoVariant} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-bold text-[11px] sm:text-sm tracking-tight text-white truncate max-w-[170px] sm:max-w-none">
                  Comisaría Minoridad y V. Familiar
                </span>
                <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap shrink-0">
                  Policía ER
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Medidas Judiciales (Default Tab) */}
            <button
              id="nav-tab-measures"
              onClick={() => setCurrentTab('measures')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                currentTab === 'measures'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Medidas Judiciales</span>
              <span className="text-xs bg-black/25 px-1.5 py-0.2 rounded-full font-mono">
                {measuresCount}
              </span>
            </button>

            {/* Identificación de Personas */}
            <button
              id="nav-tab-identifications"
              onClick={() => setCurrentTab('identifications')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                currentTab === 'identifications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Identificación de Personas</span>
              {typeof identificationsCount === 'number' && (
                <span className="text-xs bg-black/25 px-1.5 py-0.2 rounded-full font-mono">
                  {identificationsCount}
                </span>
              )}
            </button>

            {/* Panel Admin */}
            {userPermissions.canManageUsers && (
              <button
                id="nav-tab-admin"
                onClick={() => setCurrentTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  currentTab === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Panel Admin</span>
              </button>
            )}
          </div>

          {/* Action Buttons & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Drive Status (shown only when connected) */}
            {driveState.isConnected && (
              <div className="relative">
                <button
                  id="header-drive-status-btn"
                  onClick={() => setShowDriveMenu(!showDriveMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden lg:inline font-medium">Google Drive Conectado</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

              {/* Drive Dropdown Menu */}
              {showDriveMenu && driveState.isConnected && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">Google Drive Activo</span>
                    </div>
                    <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded">
                      En línea
                    </span>
                  </div>

                  <div className="py-2.5 text-xs space-y-1 text-slate-300">
                    <p className="text-slate-400 text-[11px]">Estado del Repositorio:</p>
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sincronización Centralizada Activa
                    </p>
                    {driveState.userEmail && (
                      <p className="text-slate-400 text-[11px] pt-1">
                        Cuenta conectada: <span className="text-slate-200">{driveState.userEmail}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
                    {userPermissions.canManageUsers && (
                      <button
                        onClick={() => {
                          setShowDriveMenu(false);
                          setCurrentTab('admin');
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        Ajustes de Administrador
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDriveMenu(false);
                        onDisconnectDrive();
                      }}
                      className="px-2 py-1 rounded bg-red-950/40 text-red-300 hover:bg-red-900/50 border border-red-800 text-[11px] flex items-center gap-1 ml-auto"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

            {/* PWA Download / Install App Button */}
            {(isInstallable || !isPwaInstalled) && (
              <button
                id="header-install-pwa-btn"
                onClick={onInstallPwa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                title="Descargar e instalar la aplicación en tu computadora o móvil"
              >
                <Download className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Descargar App</span>
                <span className="sm:hidden">Instalar</span>
              </button>
            )}

            {/* Real-time Server Sync status indicator / trigger */}
            {onManualSync && (
              <button
                id="header-server-sync-btn"
                onClick={onManualSync}
                disabled={isServerSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                title="Sincronizar usuarios, medidas e identificaciones con el servidor policial"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isServerSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline text-[11px] font-medium">
                  {isServerSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </span>
              </button>
            )}

            {/* Usuario Actual Autenticado (Sin opción de abrir o cambiar a otros usuarios) */}
            <div 
              id="header-current-user-badge"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs shadow-sm"
              title={`Usuario activo: ${currentUser.name} (${currentUser.username ? `@${currentUser.username}` : currentUser.email})`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {getRoleName(currentUser.role)}
                </div>
              </div>
            </div>

            {/* Quick Logout Button in Header Bar */}
            {onLogout && (
              <button
                id="btn-quick-logout"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 hover:text-white border border-rose-700/60 hover:border-rose-600 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Cerrar sesión del sistema policial"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setCurrentTab('measures')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'measures' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Medidas ({measuresCount})</span>
          </button>
          <button
            onClick={() => setCurrentTab('identifications')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'identifications' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Identificaciones ({identificationsCount || 0})</span>
          </button>
          {userPermissions.canManageUsers && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap ${
                currentTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
          {onLogout && (
            <button
              id="mobile-btn-logout"
              onClick={onLogout}
              className="px-2.5 py-1 rounded-md text-rose-300 hover:bg-rose-950/60 flex items-center gap-1 font-semibold border border-rose-800/40"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Salir</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

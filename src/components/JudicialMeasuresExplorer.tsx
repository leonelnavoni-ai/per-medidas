import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  Eye,
  Download,
  Edit,
  PlusCircle,
  Shield,
  FileText,
  Calendar,
  Building2,
  Lock,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  MessageCircle,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Archive,
} from 'lucide-react';
import { JudicialMeasure, PermissionSet, UserProfile } from '../types';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { getMeasureExpirationInfo } from '../utils/dateCalculations';

interface JudicialMeasuresExplorerProps {
  measures: JudicialMeasure[];
  userPermissions: PermissionSet;
  currentUser: UserProfile;
  onViewPdf: (measure: JudicialMeasure) => void;
  onDownloadPdf: (measure: JudicialMeasure) => void;
  onOpenCreate: () => void;
  onOpenEdit: (measure: JudicialMeasure) => void;
  onDeleteMeasure?: (measure: JudicialMeasure) => void;
  onBulkDeleteExpired?: (measures: JudicialMeasure[]) => void;
}

export const JudicialMeasuresExplorer: React.FC<JudicialMeasuresExplorerProps> = ({
  measures,
  userPermissions,
  currentUser,
  onViewPdf,
  onDownloadPdf,
  onOpenCreate,
  onOpenEdit,
  onDeleteMeasure,
  onBulkDeleteExpired,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterJuzgado, setFilterJuzgado] = useState('Todos');
  const [filterReciproca, setFilterReciproca] = useState('Todos');
  const [filterVigencia, setFilterVigencia] = useState('Todos');
  const [filterPdf, setFilterPdf] = useState<'Todos' | 'con_pdf' | 'sin_pdf'>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [whatsAppMeasure, setWhatsAppMeasure] = useState<JudicialMeasure | null>(null);
  const [showExpiredPanel, setShowExpiredPanel] = useState(true);
  const [showExpiredListDetail, setShowExpiredListDetail] = useState(true);
  const [dismissedExpiredIds, setDismissedExpiredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('police_dismissed_expired_measures');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const itemsPerPage = 15;

  // Determine Administrator privileges (Exclusive for measure deletion and management)
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin' || userPermissions.canDelete;

  // Expired, Expiring Soon, and Active measures categorization
  const expiredMeasures = useMemo(() => {
    return measures.filter((m) => getMeasureExpirationInfo(m.fechaHasta).isExpired);
  }, [measures]);

  const expiringSoonMeasures = useMemo(() => {
    return measures.filter((m) => getMeasureExpirationInfo(m.fechaHasta).isExpiringSoon);
  }, [measures]);

  const activeMeasures = useMemo(() => {
    return measures.filter((m) => {
      const exp = getMeasureExpirationInfo(m.fechaHasta);
      return exp.status === 'vigente' || exp.status === 'duracion_causa';
    });
  }, [measures]);

  // Handle keeping an expired measure in archive without deleting
  const handleKeepSingleExpired = (id: string) => {
    setDismissedExpiredIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem('police_dismissed_expired_measures', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Handle keeping all expired measures
  const handleKeepAllExpired = () => {
    const allIds = expiredMeasures.map((m) => m.id);
    setDismissedExpiredIds((prev) => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('police_dismissed_expired_measures', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setShowExpiredPanel(false);
  };

  // Measures that still need admin review
  const unreviewedExpiredCount = expiredMeasures.filter((m) => !dismissedExpiredIds.includes(m.id)).length;

  // Extract unique Courts
  const courtOptions = useMemo(() => {
    const set = new Set<string>();
    measures.forEach((m) => {
      if (m.provenienteDe) set.add(m.provenienteDe.trim());
    });
    return Array.from(set).sort();
  }, [measures]);

  // Extract unique Types
  const measureTypes = useMemo(() => {
    const set = new Set<string>();
    measures.forEach((m) => {
      if (m.tipoMedida) set.add(m.tipoMedida.trim());
    });
    return Array.from(set).sort();
  }, [measures]);

  // Filter and Search logic
  const filteredMeasures = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return measures.filter((m) => {
      // Search matching
      if (q) {
        const matchesVictima = m.victima.toLowerCase().includes(q);
        const matchesVictimario = m.victimario.toLowerCase().includes(q);
        const matchesOficio = m.nroOficio.toLowerCase().includes(q);
        const matchesJuzgado = m.provenienteDe.toLowerCase().includes(q);
        const matchesTipo = m.tipoMedida.toLowerCase().includes(q);
        const matchesFechas = 
          m.fechaDesde.toLowerCase().includes(q) || 
          m.fechaHasta.toLowerCase().includes(q) ||
          m.timestamp.toLowerCase().includes(q);
        const matchesPdfName = m.pdfFileName?.toLowerCase().includes(q) || false;
        const matchesFolder = m.driveFolder?.toLowerCase().includes(q) || false;

        if (
          !matchesVictima &&
          !matchesVictimario &&
          !matchesOficio &&
          !matchesJuzgado &&
          !matchesTipo &&
          !matchesFechas &&
          !matchesPdfName &&
          !matchesFolder
        ) {
          return false;
        }
      }

      // Filter Tipo
      if (filterTipo !== 'Todos' && m.tipoMedida !== filterTipo) {
        return false;
      }

      // Filter Juzgado
      if (filterJuzgado !== 'Todos' && m.provenienteDe !== filterJuzgado) {
        return false;
      }

      // Filter Recíproca
      if (filterReciproca === 'Si' && m.medidaReciproca !== 'Si') {
        return false;
      }
      if (filterReciproca === 'No' && m.medidaReciproca === 'Si') {
        return false;
      }

      // Filter Vigencia / Estado de Expiración
      if (filterVigencia === 'por_vencer') {
        const exp = getMeasureExpirationInfo(m.fechaHasta);
        if (!exp.isExpiringSoon) return false;
      } else if (filterVigencia === 'vencida') {
        const exp = getMeasureExpirationInfo(m.fechaHasta);
        if (!exp.isExpired) return false;
      } else if (filterVigencia === 'vigente') {
        const exp = getMeasureExpirationInfo(m.fechaHasta);
        if (exp.status !== 'vigente') return false;
      } else if (filterVigencia === 'causa') {
        const exp = getMeasureExpirationInfo(m.fechaHasta);
        if (exp.status !== 'duracion_causa') return false;
      } else if (filterVigencia === 'fecha') {
        const exp = getMeasureExpirationInfo(m.fechaHasta);
        if (exp.status === 'duracion_causa' || exp.status === 'sin_fecha') return false;
      }

      // Filter PDF en Drive
      if (filterPdf === 'con_pdf' && !m.hasCustomPdf) {
        return false;
      }
      if (filterPdf === 'sin_pdf' && m.hasCustomPdf) {
        return false;
      }

      return true;
    });
  }, [measures, searchTerm, filterTipo, filterJuzgado, filterReciproca, filterVigencia, filterPdf]);

  // Pagination
  const totalPages = Math.ceil(filteredMeasures.length / itemsPerPage) || 1;
  const paginatedMeasures = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMeasures.slice(start, start + itemsPerPage);
  }, [filteredMeasures, currentPage]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterTipo('Todos');
    setFilterJuzgado('Todos');
    setFilterReciproca('Todos');
    setFilterVigencia('Todos');
    setFilterPdf('Todos');
    setCurrentPage(1);
  };

  const isFiltered = 
    searchTerm.trim() !== '' || 
    filterTipo !== 'Todos' || 
    filterJuzgado !== 'Todos' || 
    filterReciproca !== 'Todos' ||
    filterVigencia !== 'Todos' ||
    filterPdf !== 'Todos';

  const exportToCsv = () => {
    const headers = [
      'Fecha Carga',
      'Apellido y Nombre de la víctima',
      'Tipo de Medida',
      'Fecha Vigente desde',
      'Fecha vigente hasta',
      'Apellido y Nombres del Victimario',
      'N° de Oficio',
      'Proveniente de:',
      'MEDIDA RECIPROCAS',
    ];

    const rows = filteredMeasures.map((m) => [
      `"${m.timestamp}"`,
      `"${m.victima}"`,
      `"${m.tipoMedida}"`,
      `"${m.fechaDesde}"`,
      `"${m.fechaHasta}"`,
      `"${m.victimario}"`,
      `"${m.nroOficio}"`,
      `"${m.provenienteDe}"`,
      `"${m.medidaReciproca}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_medidas_judiciales_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMeasureBadgeStyle = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('exclusion') || t.includes('exclusión')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
    }
    if (t.includes('malos tratos')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner / Summary metrics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Registro Oficial de Medidas Judiciales y Cautelares
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Base de datos predeterminada para búsqueda rápida, visualización de oficios PDF y registro de medidas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Create New Measure Button */}
            {userPermissions.canUpload ? (
              <button
                id="btn-cargar-nueva-medida"
                onClick={onOpenCreate}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Registrar y cargar una nueva medida judicial en el sistema"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Cargar Nueva Medida</span>
              </button>
            ) : (
              <div 
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                title="Modo sólo lectura: Tu rol actual no tiene permisos para cargar ni editar registros"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Solo Visualización</span>
              </div>
            )}

            {/* Export filtered to CSV */}
            <button
              onClick={exportToCsv}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Exportar resultados filtrados a hoja de cálculo CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Vista de Tabla detallada"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Vista en Tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Statistics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
          <button
            onClick={() => {
              setFilterVigencia('Todos');
              setCurrentPage(1);
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterVigencia === 'Todos'
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400/20'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Ver todas las medidas registradas"
          >
            <span className="text-slate-400 block text-[11px]">Total Registradas</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {measures.length}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">medidas</span>
          </button>

          {/* Medidas Próximas a Vencer */}
          <button
            onClick={() => {
              setFilterVigencia('por_vencer');
              setCurrentPage(1);
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              filterVigencia === 'por_vencer'
                ? 'bg-amber-100/90 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30'
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/70'
            }`}
            title="Filtrar medidas que vencen en los próximos 7 días"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-800 dark:text-amber-300 block text-[11px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>Por Vencer (7d)</span>
              </span>
              {expiringSoonMeasures.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-amber-950 animate-pulse">
                  ALERTA
                </span>
              )}
            </div>
            <span className="text-base font-black text-amber-950 dark:text-amber-100">
              {expiringSoonMeasures.length}
            </span>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400 ml-1">próximas</span>
          </button>

          {/* Medidas Vencidas */}
          <button
            onClick={() => {
              setFilterVigencia('vencida');
              setCurrentPage(1);
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              filterVigencia === 'vencida'
                ? 'bg-rose-100/90 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 ring-2 ring-rose-400/30'
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100/70'
            }`}
            title="Filtrar medidas con fecha expirada"
          >
            <div className="flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-300 block text-[11px] font-bold flex items-center gap-1">
                <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Vencidas</span>
              </span>
              {expiredMeasures.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                  EXPIRADAS
                </span>
              )}
            </div>
            <span className="text-base font-black text-rose-950 dark:text-rose-100">
              {expiredMeasures.length}
            </span>
            <span className="text-[10px] text-rose-700/80 dark:text-rose-400 ml-1">medidas</span>
          </button>

          {/* Vigentes Activas */}
          <button
            onClick={() => {
              setFilterVigencia('vigente');
              setCurrentPage(1);
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterVigencia === 'vigente'
                ? 'bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/30'
                : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70'
            }`}
            title="Filtrar medidas activas con vigencia"
          >
            <span className="text-emerald-700 dark:text-emerald-300 block text-[11px] font-bold">Vigentes Activas</span>
            <span className="text-base font-bold text-emerald-950 dark:text-emerald-100">
              {activeMeasures.length}
            </span>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 ml-1">en curso</span>
          </button>

          {/* PDFs en Google Drive */}
          <button
            onClick={() => {
              setFilterPdf(filterPdf === 'con_pdf' ? 'Todos' : 'con_pdf');
              setCurrentPage(1);
            }}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterPdf === 'con_pdf'
                ? 'bg-blue-100/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/30'
                : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 hover:bg-blue-100/70'
            }`}
            title="Filtrar medidas con oficio original en Google Drive"
          >
            <span className="text-blue-600 dark:text-blue-400 block text-[11px] font-bold flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>PDFs en Drive</span>
            </span>
            <span className="text-base font-bold text-blue-900 dark:text-blue-200">
              {measures.filter((m) => m.hasCustomPdf).length}
            </span>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400 ml-1">adjuntos</span>
          </button>
        </div>
      </div>

      {/* PANEL EXCLUSIVO PARA ADMINISTRADORES: GESTIÓN DE MEDIDAS VENCIDAS (BORRAR O DEJARLAS) */}
      {isAdmin && expiredMeasures.length > 0 && showExpiredPanel && (
        <div className="bg-gradient-to-r from-rose-900/10 via-amber-900/10 to-rose-900/10 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-rose-950/40 border-2 border-rose-300 dark:border-rose-700/70 rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200 dark:border-rose-800/60">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shrink-0 shadow-xs">
                <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Gestión de Medidas Vencidas</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                      {expiredMeasures.length} vencidas
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                    Panel Exclusivo de Administrador
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Se detectaron medidas judiciales con plazo vencido. Como administrador, puede <strong>dejarlas en el archivo histórico</strong> para consulta o <strong>borrarlas definitivamente</strong> del servidor policial.
                </p>
              </div>
            </div>

            {/* Global Actions for Administrator */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={handleKeepAllExpired}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Conservar todas las medidas vencidas en el archivo histórico sin eliminarlas"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dejarlas Todas (Mantener en Archivo)</span>
              </button>

              {onBulkDeleteExpired && (
                <button
                  onClick={() => onBulkDeleteExpired(expiredMeasures)}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Eliminar masivamente todas las medidas vencidas del sistema"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar Todas las Vencidas ({expiredMeasures.length})</span>
                </button>
              )}

              <button
                onClick={() => setShowExpiredListDetail(!showExpiredListDetail)}
                className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title={showExpiredListDetail ? 'Ocultar listado detallado' : 'Mostrar listado detallado'}
              >
                {showExpiredListDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible detailed review list of expired measures */}
          {showExpiredListDetail && (
            <div className="space-y-2 pt-1 max-h-80 overflow-y-auto pr-1">
              {expiredMeasures.map((m) => {
                const exp = getMeasureExpirationInfo(m.fechaHasta);
                const isDismissed = dismissedExpiredIds.includes(m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                      isDismissed
                        ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                        : 'bg-white dark:bg-slate-900/90 border-rose-200 dark:border-rose-900/60 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {m.victima}
                        </span>
                        <span className="text-slate-400">c/</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {m.victimario}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Oficio: {m.nroOficio}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          {exp.badgeLabel}
                        </span>
                        {isDismissed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            ✓ Conservada en Archivo
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Medida: <strong className="text-slate-700 dark:text-slate-300">{m.tipoMedida}</strong></span>
                        <span>Juzgado: <strong className="text-slate-700 dark:text-slate-300">{m.provenienteDe}</strong></span>
                        <span>Venció el: <strong className="text-rose-600 dark:text-rose-400">{exp.formattedExpiryDate}</strong> ({Math.abs(exp.daysDiff || 0)} días atrás)</span>
                      </div>
                    </div>

                    {/* Actions per measure */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onViewPdf(m)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver oficio judicial en visor integrado"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Oficio</span>
                      </button>

                      {!isDismissed ? (
                        <button
                          onClick={() => handleKeepSingleExpired(m.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Dejar esta medida en el archivo histórico sin borrarla"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Dejarla (Conservar)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDismissedExpiredIds((prev) => prev.filter((id) => id !== m.id));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Volver a marcar como pendiente de revisión"
                        >
                          Pendiente
                        </button>
                      )}

                      {onDeleteMeasure && (
                        <button
                          onClick={() => onDeleteMeasure(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Borrar definitivamente esta medida del sistema"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por Víctima, Victimario, N° de Oficio, Expediente, Juzgado, Fecha o archivo PDF..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-start">
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar Filtros</span>
              </button>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="font-bold text-slate-900 dark:text-slate-100">{filteredMeasures.length}</span> de {measures.length} medidas
            </div>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          
          {/* Tipo de Medida */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Tipo de Medida:
            </label>
            <select
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los tipos</option>
              {measureTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Juzgado / Origen */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Organismo / Juzgado:
            </label>
            <select
              value={filterJuzgado}
              onChange={(e) => {
                setFilterJuzgado(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los juzgados</option>
              {courtOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Medida Recíproca */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Medida Recíproca:
            </label>
            <select
              value={filterReciproca}
              onChange={(e) => {
                setFilterReciproca(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todas (Sí y No)</option>
              <option value="Si">Solo Recíprocas (Sí)</option>
              <option value="No">No Recíprocas</option>
            </select>
          </div>

          {/* Vigencia */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Vigencia / Plazo:
            </label>
            <select
              value={filterVigencia}
              onChange={(e) => {
                setFilterVigencia(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="Todos">Todos los plazos ({measures.length})</option>
              <option value="por_vencer">⚠️ Próximas a Vencer ({expiringSoonMeasures.length})</option>
              <option value="vencida">🛑 Medidas Vencidas ({expiredMeasures.length})</option>
              <option value="vigente">🟢 Vigentes Activas ({activeMeasures.length})</option>
              <option value="causa">⚖️ Durante la Causa</option>
              <option value="fecha">📅 Con fecha límite fija</option>
            </select>
          </div>

          {/* Documento PDF en Google Drive */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Oficio en Google Drive:
            </label>
            <select
              value={filterPdf}
              onChange={(e) => {
                setFilterPdf(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los oficios</option>
              <option value="con_pdf">Con PDF en Drive</option>
              <option value="sin_pdf">Sin PDF adjunto</option>
            </select>
          </div>

        </div>

      </div>

      {/* Results View: Table Mode */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Fecha Carga</th>
                  <th className="py-3 px-3.5">Víctima</th>
                  <th className="py-3 px-3.5">Denunciado / Victimario</th>
                  <th className="py-3 px-3.5">Medida Dispuesta</th>
                  <th className="py-3 px-3.5">N° Oficio / Causa</th>
                  <th className="py-3 px-3.5">Juzgado Emisor</th>
                  <th className="py-3 px-3.5">Vigencia</th>
                  <th className="py-3 px-3.5 text-center">Recíproca</th>
                  <th className="py-3 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedMeasures.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No se encontraron medidas coincidentes</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Intenta ajustar los filtros de búsqueda o restablecerlos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedMeasures.map((m) => {
                    const exp = getMeasureExpirationInfo(m.fechaHasta);
                    const rowHighlightClass = exp.isExpiringSoon
                      ? 'bg-amber-50/70 dark:bg-amber-950/25 border-l-4 border-l-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors'
                      : exp.isExpired
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-l-4 border-l-rose-500 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors';

                    return (
                      <tr 
                        key={m.id} 
                        className={rowHighlightClass}
                      >
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {m.timestamp.split(' ')[0]}
                        </td>

                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={m.victima}>
                          {m.victima}
                        </td>

                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={m.victimario}>
                          {m.victimario}
                        </td>

                        <td className="py-3 px-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${getMeasureBadgeStyle(m.tipoMedida)}`}>
                            {m.tipoMedida}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                          <div>
                            <span>{m.nroOficio}</span>
                            {m.hasCustomPdf && (
                              <div className="mt-0.5">
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  title={`PDF subido a Google Drive en carpeta: ${m.driveFolder || 'Medidas Judiciales'}${m.pdfFileName ? ` (${m.pdfFileName})` : ''}`}
                                >
                                  <FileText className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                  <span>Drive: {m.driveFolder || 'Medidas'}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {m.provenienteDe}
                        </td>

                        {/* Vigencia con remarcado visual */}
                        <td className="py-3 px-3.5 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Hasta:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {m.fechaHasta || 'No fijada'}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${exp.badgeClass}`}>
                                {exp.isExpiringSoon && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />}
                                {exp.isExpired && <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                                <span>{exp.badgeLabel}</span>
                              </span>
                            </div>
                            {m.fechaDesde && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span>Desde: {m.fechaDesde}</span>
                                {m.diasVigencia ? (
                                  <span className="text-blue-500 font-medium">({m.diasVigencia}d)</span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          {m.medidaReciproca === 'Si' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              SÍ
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Enviar datos de la medida y oficio por WhatsApp */}
                            <button
                              onClick={() => setWhatsAppMeasure(m)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-colors cursor-pointer"
                              title="Enviar datos de la medida judicial y oficio por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </button>

                            {/* Visualizar Oficio PDF */}
                            <button
                              onClick={() => onViewPdf(m)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                m.hasCustomPdf
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/60'
                              }`}
                              title={
                                m.hasCustomPdf
                                  ? `Visualizar PDF oficial subido a Google Drive (Carpeta: ${m.driveFolder || 'Medidas Judiciales'})`
                                  : 'Visualizar Oficio Judicial en visor PDF integrado'
                              }
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Descargar PDF */}
                            <button
                              onClick={() => onDownloadPdf(m)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title={
                                m.hasCustomPdf
                                  ? `Descargar archivo PDF oficial (${m.pdfFileName || m.nroOficio})`
                                  : 'Descargar Oficio Judicial en PDF'
                              }
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Actualizar / Editar (if allowed) */}
                            {userPermissions.canEdit && (
                              <button
                                onClick={() => onOpenEdit(m)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                                title="Actualizar datos de la medida / Cargar PDF a Google Drive"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Eliminar Medida (Exclusivo para Administradores) */}
                            {isAdmin && onDeleteMeasure && (
                              <button
                                onClick={() => onDeleteMeasure(m)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                                title={`Eliminar medida Oficio N° ${m.nroOficio} definitivamente (Acción exclusiva de Administrador)`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Página <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> de <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results View: Card Mode */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedMeasures.map((m) => {
              const exp = getMeasureExpirationInfo(m.fechaHasta);
              const cardBorderClass = exp.isExpiringSoon
                ? 'border-2 border-amber-400 dark:border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/30'
                : exp.isExpired
                ? 'border-2 border-rose-400 dark:border-rose-600 shadow-xs'
                : 'border border-slate-200 dark:border-slate-800';

              return (
                <div 
                  key={m.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 ${cardBorderClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getMeasureBadgeStyle(m.tipoMedida)}`}>
                          {m.tipoMedida}
                        </span>
                        {exp.isExpiringSoon && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                            <span>Vence {exp.daysDiff === 0 ? 'hoy' : exp.daysDiff === 1 ? 'mañana' : `en ${exp.daysDiff}d`}</span>
                          </span>
                        )}
                        {exp.isExpired && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                            <AlertOctagon className="w-2.5 h-2.5 text-rose-600" />
                            <span>Vencida</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {m.hasCustomPdf && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            title={`PDF subido a Google Drive en carpeta: ${m.driveFolder || 'Medidas Judiciales'}`}
                          >
                            <FileText className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                            <span>Drive</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {m.nroOficio}
                        </span>
                      </div>
                    </div>

                    {/* Banner de aviso especial para medidas próximas a vencer */}
                    {exp.isExpiringSoon && (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>Próxima a Vencer ({exp.daysDiff === 0 ? 'HOY' : exp.daysDiff === 1 ? 'MAÑANA' : `en ${exp.daysDiff} días`})</span>
                        </div>
                        <p className="text-[10.5px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                          Fecha límite: <strong>{exp.formattedExpiryDate}</strong>
                        </p>
                      </div>
                    )}

                    {/* Banner de aviso especial para medidas vencidas con opción rápida para admin */}
                    {exp.isExpired && (
                      <div className="mt-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <div>
                            <span className="font-bold text-[11px] block">Medida Judicial Vencida</span>
                            <span className="text-[10px] text-rose-700 dark:text-rose-300">
                              Expiró el {exp.formattedExpiryDate} ({Math.abs(exp.daysDiff || 0)} días atrás)
                            </span>
                          </div>
                        </div>

                        {isAdmin && onDeleteMeasure && (
                          <button
                            onClick={() => onDeleteMeasure(m)}
                            className="shrink-0 px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="Borrar medida vencida definitivamente"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Borrar</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Víctima</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {m.victima}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Denunciado / Victimario</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {m.victimario}
                        </p>
                      </div>

                      <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block">Juzgado:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.provenienteDe}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Vigente hasta:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.fechaHasta || 'No fijada'}</span>
                          {m.diasVigencia ? (
                            <span className="text-[10px] text-blue-500 block font-medium">Plazo: {m.diasVigencia} días</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {m.medidaReciproca === 'Si' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          Recíproca
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">{m.timestamp.split(' ')[0]}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botón WhatsApp */}
                      <button
                        onClick={() => setWhatsAppMeasure(m)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        title="Enviar datos de la medida judicial y oficio por WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => onViewPdf(m)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-blue-500 transition-colors cursor-pointer"
                        title={
                          m.hasCustomPdf
                            ? `Visualizar PDF oficial subido a Drive (${m.driveFolder || 'Medidas'})`
                            : 'Visualizar Oficio Judicial'
                        }
                      >
                        <Eye className="w-3 h-3" />
                        <span>{m.hasCustomPdf ? 'Ver PDF' : 'Ver Oficio'}</span>
                      </button>

                      <button
                        onClick={() => onDownloadPdf(m)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title={
                          m.hasCustomPdf
                            ? `Descargar archivo PDF oficial (${m.pdfFileName || m.nroOficio})`
                            : 'Descargar Oficio Judicial en PDF'
                        }
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {userPermissions.canEdit && (
                        <button
                          onClick={() => onOpenEdit(m)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Actualizar medida / Cargar PDF a Google Drive"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Eliminar Medida (Exclusivo Administradores) */}
                      {isAdmin && onDeleteMeasure && (
                        <button
                          onClick={() => onDeleteMeasure(m)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                          title={`Eliminar medida Oficio N° ${m.nroOficio} definitivamente (Acción exclusiva de Administrador)`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-500">
              <div>
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Compartir Medida por WhatsApp */}
      <WhatsAppShareModal
        isOpen={Boolean(whatsAppMeasure)}
        onClose={() => setWhatsAppMeasure(null)}
        measure={whatsAppMeasure}
        currentUser={currentUser}
      />
    </div>
  );
};

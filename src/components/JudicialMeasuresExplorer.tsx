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
} from 'lucide-react';
import { JudicialMeasure, PermissionSet, UserProfile } from '../types';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface JudicialMeasuresExplorerProps {
  measures: JudicialMeasure[];
  userPermissions: PermissionSet;
  currentUser: UserProfile;
  onViewPdf: (measure: JudicialMeasure) => void;
  onDownloadPdf: (measure: JudicialMeasure) => void;
  onOpenCreate: () => void;
  onOpenEdit: (measure: JudicialMeasure) => void;
}

export const JudicialMeasuresExplorer: React.FC<JudicialMeasuresExplorerProps> = ({
  measures,
  userPermissions,
  currentUser,
  onViewPdf,
  onDownloadPdf,
  onOpenCreate,
  onOpenEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterJuzgado, setFilterJuzgado] = useState('Todos');
  const [filterReciproca, setFilterReciproca] = useState('Todos');
  const [filterVigencia, setFilterVigencia] = useState('Todos');
  const [filterPdf, setFilterPdf] = useState<'Todos' | 'con_pdf' | 'sin_pdf'>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [whatsAppMeasure, setWhatsAppMeasure] = useState<JudicialMeasure | null>(null);
  const itemsPerPage = 15;

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

      // Filter Vigencia
      if (filterVigencia === 'causa') {
        const isCausa = 
          m.fechaHasta.toUpperCase().includes('DURACION') || 
          m.fechaHasta.toUpperCase().includes('FINALIZAR') ||
          m.fechaHasta.toUpperCase().includes('ACTUACIONES');
        if (!isCausa) return false;
      } else if (filterVigencia === 'fecha') {
        const isCausa = 
          m.fechaHasta.toUpperCase().includes('DURACION') || 
          m.fechaHasta.toUpperCase().includes('FINALIZAR');
        if (isCausa) return false;
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
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Total Registradas</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {measures.length}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">medidas</span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <span className="text-blue-600 dark:text-blue-400 block text-[11px]">Prohibición Acercamiento</span>
            <span className="text-base font-bold text-blue-900 dark:text-blue-200">
              {measures.filter((m) => m.tipoMedida.toLowerCase().includes('acercamiento')).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
            <span className="text-rose-600 dark:text-rose-400 block text-[11px]">Exclusiones de Hogar</span>
            <span className="text-base font-bold text-rose-900 dark:text-rose-200">
              {measures.filter((m) => m.tipoMedida.toLowerCase().includes('exclusi')).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
            <span className="text-purple-600 dark:text-purple-400 block text-[11px]">Medidas Recíprocas</span>
            <span className="text-base font-bold text-purple-900 dark:text-purple-200">
              {measures.filter((m) => m.medidaReciproca === 'Si').length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-emerald-600 dark:text-emerald-400 block text-[11px]">PDFs en Drive</span>
            <span className="text-base font-bold text-emerald-900 dark:text-emerald-200">
              {measures.filter((m) => m.hasCustomPdf).length}
            </span>
          </div>
        </div>
      </div>

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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos los plazos</option>
              <option value="causa">Durante la Causa</option>
              <option value="fecha">Con fecha límite fija</option>
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
                  paginatedMeasures.map((m) => (
                    <tr 
                      key={m.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
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

                      <td className="py-3 px-3.5 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Hasta:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {m.fechaHasta || 'No fijada'}
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
                        </div>
                      </td>
                    </tr>
                  ))
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
            {paginatedMeasures.map((m) => (
              <div 
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getMeasureBadgeStyle(m.tipoMedida)}`}>
                      {m.tipoMedida}
                    </span>
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
                  </div>
                </div>
              </div>
            ))}
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

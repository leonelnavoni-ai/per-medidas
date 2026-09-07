import React from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Calendar,
  Layers,
  ArrowDownAZ,
  RotateCcw,
  FolderArchive
} from 'lucide-react';
import { FilterOptions } from '../types';
import { CATEGORIES } from '../data/initialData';

interface SearchBarAndFiltersProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalMatches: number;
  totalFiles: number;
  isDriveConnected: boolean;
}

export const SearchBarAndFilters: React.FC<SearchBarAndFiltersProps> = ({
  filters,
  setFilters,
  totalMatches,
  totalFiles,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, query: e.target.value }));
  };

  const handleCategorySelect = (category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      category: 'Todos',
      datePreset: 'all',
      sizePreset: 'all',
      sortBy: 'date_desc',
    });
  };

  const isFiltered = 
    filters.query.trim() !== '' ||
    filters.category !== 'Todos' ||
    filters.datePreset !== 'all' ||
    filters.sizePreset !== 'all' ||
    filters.sortBy !== 'date_desc';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      
      {/* Primary Search Bar Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="search-input-drive"
            type="text"
            value={filters.query}
            onChange={handleQueryChange}
            placeholder="Buscar por nombre de archivo PDF, etiqueta, palabra clave o contenido..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.query && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick actions: Filter Toggle & Counter */}
        <div className="flex items-center gap-2 justify-between sm:justify-start">
          <button
            id="toggle-advanced-filters-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              showAdvanced || isFiltered
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros avanzados</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>

          {isFiltered && (
            <button
              id="reset-filters-btn"
              onClick={resetFilters}
              className="px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Limpiar</span>
            </button>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalMatches}</span> de {totalFiles} PDFs
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 text-[11px] font-medium mr-1 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Categoría:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = filters.category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Collapsible Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Date Filter */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Fecha de modificación:
            </label>
            <select
              value={filters.datePreset}
              onChange={(e) => setFilters((prev) => ({ ...prev, datePreset: e.target.value as any }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Esta semana (últimos 7 días)</option>
              <option value="month">Este mes (últimos 30 días)</option>
              <option value="year">Este año</option>
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium flex items-center gap-1">
              <FolderArchive className="w-3.5 h-3.5 text-indigo-500" />
              Tamaño del archivo:
            </label>
            <select
              value={filters.sizePreset}
              onChange={(e) => setFilters((prev) => ({ ...prev, sizePreset: e.target.value as any }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los tamaños</option>
              <option value="small">Pequeño (&lt; 1 MB)</option>
              <option value="medium">Mediano (1 MB - 5 MB)</option>
              <option value="large">Grande (&gt; 5 MB)</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium flex items-center gap-1">
              <ArrowDownAZ className="w-3.5 h-3.5 text-amber-500" />
              Ordenar por:
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="date_desc">Modificación: más reciente</option>
              <option value="date_asc">Modificación: más antiguo</option>
              <option value="name_asc">Nombre: A - Z</option>
              <option value="name_desc">Nombre: Z - A</option>
              <option value="size_desc">Tamaño: mayor a menor</option>
              <option value="size_asc">Tamaño: menor a mayor</option>
            </select>
          </div>

        </div>
      )}

    </div>
  );
};

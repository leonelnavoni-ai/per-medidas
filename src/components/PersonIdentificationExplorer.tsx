import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  MessageCircle,
  Shield,
  MapPin,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  RotateCcw,
  User,
  Car,
  Phone,
  FileText,
  Printer,
  X,
  Clock,
  Building,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from 'lucide-react';
import { IdentifiedPerson, JudicialMeasure, PermissionSet, UserProfile } from '../types';

interface PersonIdentificationExplorerProps {
  identifications: IdentifiedPerson[];
  measures: JudicialMeasure[];
  userPermissions: PermissionSet;
  currentUser: UserProfile;
  onOpenCreate: () => void;
  onOpenEdit: (person: IdentifiedPerson) => void;
  onDelete: (person: IdentifiedPerson) => void;
  onOpenWhatsApp: (person: IdentifiedPerson, relatedMeasures: JudicialMeasure[]) => void;
}

export const PersonIdentificationExplorer: React.FC<PersonIdentificationExplorerProps> = ({
  identifications,
  measures,
  userPermissions,
  currentUser,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onOpenWhatsApp,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPersonForDetail, setSelectedPersonForDetail] = useState<IdentifiedPerson | null>(null);

  // Helper to find matching judicial measures for any identified person
  const getMatchingMeasures = (person: IdentifiedPerson): JudicialMeasure[] => {
    const cleanName = person.apellidoNombre.trim().toLowerCase();
    const cleanDni = person.dni.trim();
    if (!cleanName && cleanDni.length < 5) return [];

    return measures.filter((m) => {
      const victimaMatch = cleanName && m.victima.toLowerCase().includes(cleanName);
      const victimarioMatch = cleanName && m.victimario.toLowerCase().includes(cleanName);
      return victimaMatch || victimarioMatch;
    });
  };

  // KPIs
  const stats = useMemo(() => {
    const total = identifications.length;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const todayCount = identifications.filter((p) => p.fechaHora.startsWith(todayStr)).length;
    const alertCount = identifications.filter(
      (p) =>
        p.estadoLegal === 'Con medida cautelar' ||
        p.estadoLegal === 'Pedido de captura / paradero' ||
        getMatchingMeasures(p).length > 0
    ).length;
    const averiguacionCount = identifications.filter(
      (p) => p.estadoLegal === 'En averiguación' || p.estadoLegal === 'Demorado'
    ).length;

    return { total, todayCount, alertCount, averiguacionCount };
  }, [identifications, measures]);

  // Filtered list
  const filteredIdentifications = useMemo(() => {
    return identifications.filter((person) => {
      // Free text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = person.apellidoNombre.toLowerCase().includes(q);
        const matchesDni = person.dni.toLowerCase().includes(q);
        const matchesAlias = person.alias?.toLowerCase().includes(q) || false;
        const matchesLugar = person.lugar.toLowerCase().includes(q);
        const matchesMotivo = person.motivo.toLowerCase().includes(q);
        const matchesVehiculo = person.vehiculo?.toLowerCase().includes(q) || false;
        const matchesObs = person.observaciones?.toLowerCase().includes(q) || false;
        const matchesInterviniente = person.interviniente.toLowerCase().includes(q);

        if (
          !matchesName &&
          !matchesDni &&
          !matchesAlias &&
          !matchesLugar &&
          !matchesMotivo &&
          !matchesVehiculo &&
          !matchesObs &&
          !matchesInterviniente
        ) {
          return false;
        }
      }

      // Filter by estado legal
      if (filterEstado !== 'all' && person.estadoLegal !== filterEstado) {
        return false;
      }

      // Filter by date preset
      if (filterDatePreset !== 'all') {
        const itemDate = new Date(person.fechaHora).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (filterDatePreset === 'today' && now - itemDate > oneDay) {
          return false;
        }
        if (filterDatePreset === 'week' && now - itemDate > 7 * oneDay) {
          return false;
        }
        if (filterDatePreset === 'month' && now - itemDate > 30 * oneDay) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
  }, [identifications, searchQuery, filterEstado, filterDatePreset]);

  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'Sin impedimento':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Con medida cautelar':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Pedido de captura / paradero':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Demorado':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Identificados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Identificados
            </p>
            <h4 className="text-xl font-extrabold text-white font-mono">
              {stats.total}
            </h4>
          </div>
        </div>

        {/* Identificados Hoy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Controles Hoy
            </p>
            <h4 className="text-xl font-extrabold text-emerald-400 font-mono">
              {stats.todayCount}
            </h4>
          </div>
        </div>

        {/* Con Medidas / Alertas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Con Medidas / Alertas
            </p>
            <h4 className="text-xl font-extrabold text-amber-400 font-mono">
              {stats.alertCount}
            </h4>
          </div>
        </div>

        {/* En Averiguación / Demorados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Averiguación / Demora
            </p>
            <h4 className="text-xl font-extrabold text-purple-400 font-mono">
              {stats.averiguacionCount}
            </h4>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Cargar Button */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por DNI, Apellido, Nombre, Alias, Lugar o Vehículo..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action Button: Cargar Identificación */}
          {(userPermissions.canIdentifyPerson ?? true) && (
            <button
              onClick={onOpenCreate}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              title="Registrar nueva persona identificada en el sistema"
            >
              <Plus className="w-4 h-4" />
              <span>Cargar Identificación</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1 text-slate-400 mr-1 font-semibold">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Filtrar:</span>
          </div>

          {/* Estado legal select */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="all">Todos los estados legales</option>
            <option value="Sin impedimento">🟢 Sin impedimento</option>
            <option value="Con medida cautelar">⚠️ Con medida cautelar</option>
            <option value="Pedido de captura / paradero">🚨 Pedido de captura</option>
            <option value="En averiguación">🟡 En averiguación</option>
            <option value="Demorado">⛔ Demorado</option>
          </select>

          {/* Date preset */}
          <select
            value={filterDatePreset}
            onChange={(e) => setFilterDatePreset(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Este mes</option>
          </select>

          {(searchQuery || filterEstado !== 'all' || filterDatePreset !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterEstado('all');
                setFilterDatePreset('all');
              }}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}

          {/* View Switcher: Cards vs Table */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista tipo Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista tipo Tabla"
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
            </div>

            <div className="text-slate-400 text-xs hidden sm:block">
              <strong>{filteredIdentifications.length}</strong> de {identifications.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Cards Content */}
      {filteredIdentifications.length > 0 ? (
        viewMode === 'cards' ? (
          /* Results View: Card Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIdentifications.map((person) => {
              const matchingMeasures = getMatchingMeasures(person);
              const hasMeasuresAlert = matchingMeasures.length > 0;
              const dateObj = new Date(person.fechaHora);
              const dateFormatted = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  }) +
                  ' ' +
                  dateObj.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : person.fechaHora;

              return (
                <div
                  key={person.id}
                  className={`bg-slate-900/95 border rounded-2xl p-4.5 shadow-md flex flex-col justify-between space-y-3.5 transition-all hover:border-slate-700 ${
                    hasMeasuresAlert
                      ? 'border-amber-500/40 shadow-amber-950/20'
                      : person.estadoLegal === 'Pedido de captura / paradero'
                      ? 'border-rose-500/50 shadow-rose-950/30'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    {/* Row 1: Legal Status & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getEstadoBadgeStyle(
                          person.estadoLegal
                        )}`}
                      >
                        {person.estadoLegal === 'Sin impedimento' && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        {person.estadoLegal === 'Con medida cautelar' && (
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                        )}
                        {person.estadoLegal === 'Pedido de captura / paradero' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                        <span>{person.estadoLegal}</span>
                      </span>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{dateFormatted}</span>
                      </div>
                    </div>

                    {/* Row 2: Citizen Name, Alias & DNI */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-white text-base tracking-tight">
                          {person.apellidoNombre}
                        </h4>
                        {person.alias && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold border border-slate-700">
                            "{person.alias}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 font-mono mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-400 font-bold">
                          DNI {person.dni || 'S/D'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {person.nacionalidad || 'Argentina'}
                          {person.edad ? ` (${person.edad} años)` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Measures Alert Banner if applicable */}
                    {hasMeasuresAlert && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <span className="font-bold block">
                            {matchingMeasures.length} MEDIDA(S) JUDICIAL(ES) VIGENTE(S)
                          </span>
                          <span className="text-[11px] text-amber-400/90 line-clamp-1">
                            {matchingMeasures.map((m) => `${m.tipoMedida} (Oficio: ${m.nroOficio})`).join(', ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Information Grid */}
                    <div className="space-y-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-slate-300">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">
                            Lugar del Control
                          </span>
                          <span className="text-[11px] leading-tight block">{person.lugar}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1.5 border-t border-slate-800/60">
                        <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="text-slate-300">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">
                            Motivo
                          </span>
                          <span className="text-[11px] leading-tight block">{person.motivo}</span>
                        </div>
                      </div>

                      {person.vehiculo && (
                        <div className="flex items-start gap-2 pt-1.5 border-t border-slate-800/60">
                          <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="text-slate-300">
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">
                              Vehículo
                            </span>
                            <span className="text-[11px] font-mono font-medium text-emerald-300 block">
                              {person.vehiculo}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-1.5 border-t border-slate-800/60">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="text-slate-300">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">
                            Dotación / Dependencia
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {person.interviniente} • {person.dependencia}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenWhatsApp(person, matchingMeasures)}
                      className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-950/40 transition-colors cursor-pointer"
                      title="Compartir informe oficial de la persona identificada por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedPersonForDetail(person)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        title="Ver ficha completa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {(userPermissions.canEdit || (userPermissions.canIdentifyPerson ?? true) || person.createdBy === currentUser.name || currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.role === 'editor') && (
                        <button
                          onClick={() => onOpenEdit(person)}
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                          title="Editar / Modificar datos de la persona"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {userPermissions.canDelete && (
                        <button
                          onClick={() => onDelete(person)}
                          className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Ciudadano / DNI</th>
                  <th className="py-3 px-4">Lugar del Control</th>
                  <th className="py-3 px-4">Motivo / Vehículo</th>
                  <th className="py-3 px-4">Situación Legal</th>
                  <th className="py-3 px-4">Medidas Judiciales</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredIdentifications.map((person) => {
                  const matchingMeasures = getMatchingMeasures(person);
                  const hasMeasuresAlert = matchingMeasures.length > 0;

                  const dateObj = new Date(person.fechaHora);
                  const dateFormatted = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }) +
                      ' ' +
                      dateObj.toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : person.fechaHora;

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Fecha / Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>

                      {/* Ciudadano / DNI */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">
                              {person.apellidoNombre}
                            </span>
                            {person.alias && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                                "{person.alias}"
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>DNI: {person.dni || 'Sin documento'}</span>
                            {person.edad && <span>• {person.edad} años</span>}
                          </div>
                        </div>
                      </td>

                      {/* Lugar del Control */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex items-start gap-1.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                          <span className="truncate text-xs" title={person.lugar}>
                            {person.lugar}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                          Por: {person.interviniente}
                        </div>
                      </td>

                      {/* Motivo / Vehículo */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <span className="text-slate-200 block truncate" title={person.motivo}>
                          {person.motivo}
                        </span>
                        {person.vehiculo && (
                          <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mt-0.5 truncate" title={person.vehiculo}>
                            <Car className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{person.vehiculo}</span>
                          </div>
                        )}
                      </td>

                      {/* Situación Legal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            person.estadoLegal === 'Sin impedimento'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : person.estadoLegal === 'Con medida cautelar'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : person.estadoLegal === 'Pedido de captura / paradero'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : person.estadoLegal === 'Demorado'
                              ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          <span>{person.estadoLegal}</span>
                        </span>
                      </td>

                      {/* Alerta de Medidas Judiciales */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasMeasuresAlert ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-600/70 text-amber-300 font-bold text-[10.5px] shadow-xs"
                            title={`Coincide con ${matchingMeasures.length} medida(s) judicial(es) registrada(s)`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{matchingMeasures.length} Medida(s)</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp button */}
                          <button
                            onClick={() => onOpenWhatsApp(person, matchingMeasures)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            title={`Enviar datos de identificación de ${person.apellidoNombre} por WhatsApp`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Ver Ficha Detalle */}
                          <button
                            onClick={() => setSelectedPersonForDetail(person)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Ver ficha completa de identificación"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          {(userPermissions.canEdit || (userPermissions.canIdentifyPerson ?? true) || person.createdBy === currentUser.name) && (
                            <button
                              onClick={() => onOpenEdit(person)}
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                              title="Modificar datos de la identificación"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Eliminar */}
                          {userPermissions.canDelete && (
                            <button
                              onClick={() => onDelete(person)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                              title="Eliminar registro de identificación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              No se encontraron personas identificadas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              No hay registros que coincidan con la búsqueda o el filtro aplicado.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterEstado('all');
                setFilterDatePreset('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Filtros</span>
            </button>

            {(userPermissions.canIdentifyPerson ?? true) && (
              <button
                onClick={onOpenCreate}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Identificación</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Ficha Detallada de Persona Identificada */}
      {selectedPersonForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ficha Digital de Identificación Policial
                  </h3>
                  <p className="text-xs text-slate-400">
                    Policía de Entre Ríos • Jefatura Dptal. Victoria
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPersonForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300">
              {/* Title Badge */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    {selectedPersonForDetail.apellidoNombre}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    DNI: <strong className="text-slate-200">{selectedPersonForDetail.dni || 'Sin documento'}</strong>
                    {selectedPersonForDetail.alias ? ` • Alias: "${selectedPersonForDetail.alias}"` : ''}
                    {selectedPersonForDetail.edad ? ` • ${selectedPersonForDetail.edad} años` : ''}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold inline-block shrink-0 ${
                    selectedPersonForDetail.estadoLegal === 'Sin impedimento'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : selectedPersonForDetail.estadoLegal === 'Con medida cautelar'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : selectedPersonForDetail.estadoLegal === 'Pedido de captura / paradero'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {selectedPersonForDetail.estadoLegal}
                </span>
              </div>

              {/* Cross check measures alert */}
              {(() => {
                const matches = getMatchingMeasures(selectedPersonForDetail);
                if (matches.length === 0) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/70 text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Medidas Judiciales Coincidentes ({matches.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {matches.map((m) => (
                        <div
                          key={m.id}
                          className="p-2 rounded-lg bg-amber-900/50 border border-amber-700/50 text-xs"
                        >
                          <p className="font-bold text-white">
                            Oficio N° {m.nroOficio} — {m.tipoMedida} ({m.provenienteDe})
                          </p>
                          <p className="text-[11px] text-amber-200 mt-0.5">
                            Víctima: <strong>{m.victima}</strong> | Denunciado: <strong>{m.victimario}</strong>
                          </p>
                          <p className="text-[10px] text-amber-300/80 font-mono mt-0.5">
                            Vigencia: {m.fechaDesde} hasta {m.fechaHasta || 'Duración de la causa'} ({m.estadoVigencia || 'Vigente'})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fecha y Hora del Control:</span>
                  </span>
                  <p className="font-mono text-slate-200 font-semibold">
                    {new Date(selectedPersonForDetail.fechaHora).toLocaleString('es-AR')} hs
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Lugar del Control:</span>
                  </span>
                  <p className="text-slate-200 font-semibold">
                    {selectedPersonForDetail.lugar}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Motivo del Control:</span>
                  </span>
                  <p className="text-slate-200 font-semibold">
                    {selectedPersonForDetail.motivo}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-400" />
                    <span>Domicilio Declarado:</span>
                  </span>
                  <p className="text-slate-200">
                    {selectedPersonForDetail.domicilio || 'No aportó'}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Teléfono de Contacto:</span>
                  </span>
                  <p className="text-slate-200 font-mono">
                    {selectedPersonForDetail.telefono || 'Sin número registrado'}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>Vehículo / Movilidad:</span>
                  </span>
                  <p className="text-slate-200">
                    {selectedPersonForDetail.vehiculo || 'Peatonal / Sin vehículo'}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Interviniente y Dependencia:</span>
                  </span>
                  <p className="text-slate-200">
                    {selectedPersonForDetail.interviniente} — <strong>{selectedPersonForDetail.dependencia}</strong>
                  </p>
                </div>

                {selectedPersonForDetail.observaciones && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                    <span className="text-slate-400 font-semibold">Observaciones / Detalles:</span>
                    <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedPersonForDetail.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const matchingMeasures = getMatchingMeasures(selectedPersonForDetail);
                  onOpenWhatsApp(selectedPersonForDetail, matchingMeasures);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Ficha por WhatsApp</span>
              </button>

              <div className="flex items-center gap-2">
                {(userPermissions.canEdit || (userPermissions.canIdentifyPerson ?? true) || selectedPersonForDetail.createdBy === currentUser.name || currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.role === 'editor') && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedPersonForDetail;
                      setSelectedPersonForDetail(null);
                      onOpenEdit(p);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Editar y guardar cambios en esta persona"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modificar Ficha</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPersonForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  FileText,
  Eye,
  Download,
  Trash2,
  Calendar,
  Lock,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { DriveFile, PermissionSet } from '../types';
import { formatBytes, formatDateShort } from '../utils/formatters';

interface DocumentCardProps {
  file: DriveFile;
  permissions: PermissionSet;
  onView: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  onDelete?: (file: DriveFile) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  file,
  permissions,
  onView,
  onDownload,
  onDelete,
}) => {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Contratos':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Finanzas':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Legal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Técnico':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Auditoría':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Filter out any internal location tags so user cannot see location or destination
  const displayTags = (file.tags || []).filter(
    (t) => !t.toLowerCase().includes('drive') && !t.toLowerCase().includes('alojado')
  );

  return (
    <div
      id={`doc-card-${file.id}`}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        {/* Top Badges Row: Pure Category & Verification Status (No Location / Destination) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryColor(file.category)}`}>
            {file.category}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Documento Indexado</span>
          </div>
        </div>

        {/* File Icon & Name */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 
              onClick={() => permissions.canView && onView(file)}
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer line-clamp-2 transition-colors break-words leading-snug"
              title={file.name}
            >
              {file.name}
            </h3>
            {file.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {file.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Details */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDateShort(file.modifiedTime)}</span>
          </div>
          <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
            {formatBytes(file.size)}
          </span>
        </div>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {displayTags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 flex items-center gap-0.5"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        
        {/* Visualizar Button */}
        <button
          id={`btn-view-${file.id}`}
          onClick={() => onView(file)}
          disabled={!permissions.canView}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={permissions.canView ? "Visualizar PDF en la aplicación" : "No tienes permisos para visualizar"}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Visualizar</span>
        </button>

        {/* Descargar Button */}
        <button
          id={`btn-download-${file.id}`}
          onClick={() => onDownload(file)}
          disabled={!permissions.canDownload}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            permissions.canDownload
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700'
          }`}
          title={
            permissions.canDownload
              ? "Descargar archivo PDF al dispositivo"
              : "Descarga bloqueada para tu rol actual"
          }
        >
          {permissions.canDownload ? (
            <Download className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="hidden sm:inline">Descargar</span>
        </button>

        {/* Eliminar Button (only if canDelete) */}
        {permissions.canDelete && onDelete && (
          <button
            id={`btn-delete-${file.id}`}
            onClick={() => onDelete(file)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Eliminar PDF de la base"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

      </div>
    </div>
  );
};

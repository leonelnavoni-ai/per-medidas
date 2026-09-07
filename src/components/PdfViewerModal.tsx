import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Lock,
  ShieldCheck,
  Info,
  CheckCircle2,
  Printer,
  ExternalLink,
} from 'lucide-react';
import { DriveFile, PermissionSet } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { generateSamplePdfBlob, generateJudicialMeasurePdfBlob } from '../utils/pdfGenerator';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface PdfViewerModalProps {
  file: DriveFile | null;
  onClose: () => void;
  permissions: PermissionSet;
  onDownload: (file: DriveFile) => void;
  driveToken?: string | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  file,
  onClose,
  permissions,
  onDownload,
  driveToken,
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load PDF binary source securely
  useEffect(() => {
    if (!file) {
      setActivePdfUrl(null);
      return;
    }

    setRotation(0);
    setZoom(100);

    // 1. If it's already a local Blob URL (custom uploaded PDF or pre-generated)
    if (file.localBlobUrl) {
      setActivePdfUrl(file.localBlobUrl);
      setIsLoadingPdf(false);
      return;
    }

    // 2. If it is a judicial measure record without blob URL, generate standard PDF blob
    if (file.measureData) {
      const measureBlob = generateJudicialMeasurePdfBlob(file.measureData);
      const blobUrl = URL.createObjectURL(measureBlob);
      setActivePdfUrl(blobUrl);
      setIsLoadingPdf(false);
      return;
    }

    // 3. If it's a Google Drive file with token
    if (file.driveId && driveToken) {
      setIsLoadingPdf(true);
      fetch(`https://www.googleapis.com/drive/v3/files/${file.driveId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${driveToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: No se pudo descargar el archivo`);
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          setActivePdfUrl(blobUrl);
          setIsLoadingPdf(false);
        })
        .catch((err) => {
          console.warn('Fallback to standard PDF generator:', err);
          const fallbackBlob = generateSamplePdfBlob(
            file.name,
            file.category,
            file.description || 'Documento indexado y protegido en la plataforma.',
            file.modifiedTime.slice(0, 10)
          );
          setActivePdfUrl(URL.createObjectURL(fallbackBlob));
          setIsLoadingPdf(false);
        });
    } else {
      // 4. Offline / standard file fallback: create standard in-memory PDF blob
      const fallbackBlob = generateSamplePdfBlob(
        file.name,
        file.category,
        file.description || 'Documento indexado y protegido en la plataforma.',
        file.modifiedTime.slice(0, 10)
      );
      setActivePdfUrl(URL.createObjectURL(fallbackBlob));
      setIsLoadingPdf(false);
    }
  }, [file, driveToken]);

  if (!file) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenExternalTab = () => {
    if (activePdfUrl) {
      window.open(activePdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Top Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-md sm:max-w-xl" title={file.name}>
                  {file.name}
                </h2>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Visor Canvas Activo</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-medium text-blue-400">{file.category}</span>
                <span>•</span>
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="hidden sm:inline">{formatDate(file.modifiedTime)}</span>
                {file.measureData?.nroOficio && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-amber-300">Oficio N° {file.measureData.nroOficio}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Imprimir documento (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Open in Separate Tab Button */}
            {activePdfUrl && (
              <button
                onClick={handleOpenExternalTab}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Abrir PDF en pestaña independiente del navegador"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Metadata Info Drawer Toggle */}
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                showMetadata ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Ver detalles y metadatos del documento"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Direct Download Button inside Viewer */}
            <button
              id="viewer-download-btn"
              onClick={() => onDownload(file)}
              disabled={!permissions.canDownload}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                permissions.canDownload
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
              title={
                permissions.canDownload
                  ? "Descargar archivo PDF"
                  : "Tu rol de usuario actual no tiene permiso de descarga"
              }
            >
              {permissions.canDownload ? (
                <Download className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {permissions.canDownload ? 'Descargar' : 'Bloqueado'}
              </span>
            </button>

            {/* Close Modal */}
            <button
              id="viewer-close-btn"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
              title="Cerrar visor (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* Viewer Tools Control Bar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Lector de Documento PDF</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-slate-500">Renderizado directo en pantalla</span>
          </div>

          {/* Zoom and Display Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1 font-medium hidden sm:inline">
                Zoom:
              </span>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-xs font-semibold text-blue-400">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="ml-1 px-2 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer hidden sm:inline"
              >
                100%
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                title="Girar 90 grados"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden md:inline">Girar</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                title="Pantalla completa"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden md:inline">
                  {isFullscreen ? 'Ventana' : 'Maximizar'}
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Content Area: Protected Pure Native Render (Zero Chrome Block) */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-950">
          
          {/* Main Rendering Canvas Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-950 flex flex-col items-center">
            {isLoadingPdf ? (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 my-auto p-8">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Cargando documento PDF...</p>
                <p className="text-xs text-slate-500">Renderizando con motor Canvas</p>
              </div>
            ) : activePdfUrl ? (
              <PdfCanvasViewer
                pdfUrl={activePdfUrl}
                zoom={zoom}
                rotation={rotation}
                fileName={file.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 my-auto">
                <FileText className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No se pudo cargar el archivo PDF seleccionado</p>
              </div>
            )}
          </div>

          {/* Metadata Sidebar (Collapsible) */}
          {showMetadata && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto shrink-0 text-xs text-slate-300 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Ficha del Documento</span>
                </h3>
                <button
                  onClick={() => setShowMetadata(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Nombre del archivo</label>
                  <p className="text-white font-medium break-words mt-0.5">{file.name}</p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Categoría & Clasificación</label>
                  <p className="text-blue-400 font-medium mt-0.5">{file.category}</p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Estado de Visualización</label>
                  <div className="flex items-center gap-1.5 mt-0.5 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lector Canvas Activo</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Tamaño</label>
                  <p className="text-slate-200 font-mono mt-0.5">{formatBytes(file.size)}</p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Última Modificación</label>
                  <p className="text-slate-200 mt-0.5">{formatDate(file.modifiedTime)}</p>
                </div>

                {file.uploadedBy && (
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Subido por / Interviniente</label>
                    <p className="text-slate-200 mt-0.5">
                      {file.uploadedBy}
                    </p>
                  </div>
                )}

                {file.description && (
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Descripción</label>
                    <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      {file.description}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Renderizado Directo</span>
                      Visualización sobre lienzo Canvas nativo de alta resolución.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

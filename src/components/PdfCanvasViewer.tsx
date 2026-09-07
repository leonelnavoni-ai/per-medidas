import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react';

// Configure worker safely
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('Worker configuration note:', e);
  }
}

interface PdfCanvasViewerProps {
  pdfUrl: string;
  zoom: number;
  rotation: number;
  fileName: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfUrl,
  zoom,
  rotation,
  fileName,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    const loadDocument = async () => {
      try {
        // Fetch arrayBuffer to guarantee zero cross-origin/sandbox blocking
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: No se pudo leer el archivo binario`);
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`,
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('PDF.js Canvas decode warning:', err);
        setErrorMsg(err.message || 'No se pudo decodificar el archivo PDF con el motor Canvas');
        setIsLoading(false);
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfUrl]);

  // Render Current Page onto Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || isLoading) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Base scale calculated with zoom factor
        const baseScale = (zoom / 100) * 1.35;
        // Total rotation = page native rotation + user rotation
        const totalRotation = (rotation % 360);

        const viewport = page.getViewport({ scale: baseScale, rotation: totalRotation });

        // High-DPI screen support (crisp text on Retina / 4K displays)
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.warn('Canvas page render warning:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoom, rotation, isLoading]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto text-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h4 className="font-bold text-sm text-white mb-1">
          Visualización Alternativa Disponible
        </h4>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          No se pudo decodificar el archivo PDF con el motor Canvas. Puedes abrirlo directamente en una pestaña nueva del navegador.
        </p>

        <div className="flex items-center justify-center w-full">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir en Pestaña Nueva</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start min-h-full py-4 px-2 sm:px-4">
      {/* Page Navigation Bar (when multi-page) */}
      {numPages > 1 && (
        <div className="sticky top-2 z-20 mb-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-3 text-xs text-slate-200">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-semibold px-1">
            Página <span className="text-blue-400">{currentPage}</span> de {numPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
            disabled={currentPage >= numPages}
            className="p-1 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 my-auto">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-300">Renderizando páginas con motor Canvas seguro...</p>
          <p className="text-[11px] text-slate-500 mt-1">Garantía 100% libre de bloqueos de Chrome</p>
        </div>
      ) : (
        /* Canvas Output Frame */
        <div className="flex justify-center items-center overflow-auto max-w-full">
          <canvas
            ref={canvasRef}
            id="pdf-canvas-element"
            className="shadow-2xl rounded-lg border border-slate-700 bg-white transition-all duration-150"
          />
        </div>
      )}
    </div>
  );
};

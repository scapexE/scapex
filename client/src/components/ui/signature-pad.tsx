import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
  isRtl?: boolean;
}

export function SignaturePad({
  width = 500,
  height = 200,
  onSave,
  onCancel,
  className,
  isRtl = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const t = (ar: string, en: string) => (isRtl ? ar : en);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      saveSnapshot();
      const { x, y } = getPos(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getPos, saveSnapshot],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, getPos],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    saveSnapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative rounded-lg border-2 border-dashed border-primary/30 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/50 select-none">
              {t("ارسم توقيعك هنا", "Draw your signature here")}
            </p>
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[70%] border-b-2 border-gray-300 pointer-events-none" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={handleUndo}
            disabled={history.length === 0}
          >
            <Undo2 className="w-3.5 h-3.5" />
            {t("تراجع", "Undo")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleClear}
          >
            <Eraser className="w-3.5 h-3.5" />
            {t("مسح", "Clear")}
          </Button>
        </div>
        <div className="flex gap-1.5">
          {onCancel && (
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
              {t("إلغاء", "Cancel")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            disabled={!hasContent}
            onClick={handleSave}
            data-testid="button-save-signature"
          >
            <Check className="w-3.5 h-3.5" />
            {t("اعتماد التوقيع", "Confirm Signature")}
          </Button>
        </div>
      </div>
    </div>
  );
}

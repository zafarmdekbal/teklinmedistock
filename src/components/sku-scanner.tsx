import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDetected: (code: string) => void;
};

export function SkuScanner({ open, onOpenChange, onDetected }: Props) {
  const containerId = "sku-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decoded) => {
            if (cancelled) return;
            onDetected(decoded.trim());
            void stop();
            onOpenChange(false);
          },
          () => {
            // ignore per-frame decode failures
          },
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            (e as Error)?.message ||
              "Unable to access camera. Check browser permissions.",
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* noop */
      }
    };

    void start();
    return () => {
      cancelled = true;
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Scan SKU / barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at the product barcode. We&apos;ll auto-fill the SKU
            and match an existing product if found.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div
            id={containerId}
            className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden grid place-items-center text-xs text-muted-foreground"
          >
            {starting && !error && "Starting camera…"}
          </div>
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

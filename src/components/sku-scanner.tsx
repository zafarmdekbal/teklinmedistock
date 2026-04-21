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
import { Camera, X, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDetected: (code: string) => void;
};

export function SkuScanner({ open, onOpenChange, onDetected }: Props) {
  const containerId = "sku-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState("");

  // Stop on close
  useEffect(() => {
    if (!open) {
      void stopScanner();
      setError(null);
      setRunning(false);
      setStarting(false);
      setManual("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopScanner = async () => {
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

  // Must be invoked DIRECTLY from a user click for browsers to allow camera.
  const startScanner = async () => {
    if (running || starting) return;
    setError(null);

    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      setError(
        "Camera needs HTTPS. Open the site over https:// (or use the manual entry below).",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support camera access. Type the SKU manually below.",
      );
      return;
    }

    setStarting(true);
    try {
      // Touch getUserMedia inside the user gesture so the browser shows the prompt.
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      // Release the probe stream — html5-qrcode will open its own.
      probe.getTracks().forEach((t) => t.stop());

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
        { fps: 10, qrbox: { width: 240, height: 140 } },
        (decoded) => {
          onDetected(decoded.trim());
          void stopScanner();
          onOpenChange(false);
        },
        () => {
          /* per-frame failures ignored */
        },
      );
      setRunning(true);
    } catch (e) {
      const err = e as DOMException & { name?: string; message?: string };
      let msg = err?.message || "Unable to start camera.";
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        msg =
          "Camera permission was blocked. Click the lock icon in the address bar → Site settings → Allow Camera, then try again.";
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        msg = "No camera was found on this device.";
      } else if (err?.name === "NotReadableError") {
        msg = "Another app is using the camera. Close it and retry.";
      }
      setError(msg);
      await stopScanner();
    } finally {
      setStarting(false);
    }
  };

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onDetected(v);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Scan SKU / barcode
          </DialogTitle>
          <DialogDescription>
            Point the camera at the product barcode. We&apos;ll auto-fill the SKU
            and match an existing product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            id={containerId}
            className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden grid place-items-center text-xs text-muted-foreground relative"
          >
            {!running && !starting && (
              <Button
                type="button"
                onClick={() => void startScanner()}
                className="shadow-soft"
              >
                <Camera className="h-4 w-4" /> Start camera
              </Button>
            )}
            {starting && "Requesting camera…"}
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2 leading-relaxed">
              {error}
            </div>
          )}

          {/* Always-available fallback so users are never stuck */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" /> Or enter SKU manually
            </div>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Type or paste SKU / barcode"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitManual();
                  }
                }}
              />
              <Button
                type="button"
                onClick={submitManual}
                disabled={!manual.trim()}
              >
                Use
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

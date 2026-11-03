"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code vers l'APK : pour télécharger sur le téléphone depuis un ordinateur. */
export function DownloadQr({ href, size = 132 }: { href: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(href, window.location.origin).toString();
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [href]);

  return (
    <div
      className="shrink-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
      style={{ width: size + 24, height: size + 24 }}
      aria-label="QR code de téléchargement"
    >
      {svg && <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
}

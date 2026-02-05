"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import FigmaConnectionIndicator from "./figma-connection-indicator";
import FigmaFilesList from "./figma-files-list";

type Props = {
  collapsed?: boolean;
};

export default function UxExtensionsSection({ collapsed = false }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch("/api/integrations/figma/status");
      const data = await res.json();
      setIsConnected(data.connected);
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }

  if (collapsed) {
    return (
      <div className="mt-3 flex-shrink-0 border-t border-slate-200 pt-3 px-3">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={20} height={20} className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="mt-3 flex-shrink-0 border-t border-slate-200 pt-3">
      <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        UX Extensions
      </div>
      <FigmaConnectionIndicator collapsed={collapsed} />
      
      {!loading && isConnected && (
        <div className="mt-3 px-3">
          <FigmaFilesList />
        </div>
      )}
    </div>
  );
}

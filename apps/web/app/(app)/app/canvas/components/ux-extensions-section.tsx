"use client";

import Image from "next/image";
import FigmaConnectionIndicator from "./figma-connection-indicator";

type Props = {
  collapsed?: boolean;
};

export default function UxExtensionsSection({ collapsed = false }: Props) {
  if (collapsed) {
    return (
      <div className="mt-3 border-t border-slate-200 pt-3 px-3">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={20} height={20} className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        UX Extensions
      </div>
      <FigmaConnectionIndicator collapsed={collapsed} />
    </div>
  );
}

// src/components/FabCabinet.tsx
"use client";

import Link from "next/link";

export default function FabCabinet() {
  return (
    <Link
      href="/cabinet"
      aria-label="Кабінет"
      className="fixed md:hidden right-4 bottom-4 z-50 rounded-full bg-white text-[#0b3b22] shadow-xl px-5 py-3 font-medium"
    >
      Кабінет
    </Link>
  );
}

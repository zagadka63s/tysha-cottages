"use client";

import { useState } from "react";

export default function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-sm opacity-80">{label}</span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className={[
            "flex-1 rounded-xl bg-white/8 border border-white/15 px-3 py-2",
            "text-white selection:bg-white/20",
            mono ? "font-mono" : "",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={doCopy}
          className="btn btn-ghost whitespace-nowrap"
          aria-label="Скопіювати"
          title="Скопіювати"
        >
          {copied ? "Скопійовано" : "Копіювати"}
        </button>
      </div>
    </label>
  );
}

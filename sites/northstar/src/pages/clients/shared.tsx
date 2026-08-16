import type { ReactNode } from "react";

export function ActionButton({
  label,
  icon,
  onClick,
  primary = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#173244]/30 ${primary ? "border-[#173244] bg-[#173244] text-white hover:bg-[#24495d] dark:border-[#9cc4c9] dark:bg-[#9cc4c9] dark:text-[#10262f]" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"}`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return <p className="px-3 py-5 text-sm text-neutral-500 dark:text-neutral-400">{label}</p>;
}

export function EmptyPanel({ label }: { label: string }) {
  return <p className="px-3 py-8 text-center text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>;
}

export function ErrorPanel({ message }: { message: string }) {
  return <p className="m-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{message}</p>;
}

export function Notice({ message }: { message: string }) {
  return <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{message}</p>;
}

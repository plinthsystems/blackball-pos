import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-neutral-800">{label}</span>
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function textInputProps(): InputHTMLAttributes<HTMLInputElement> {
  return {
    className: "h-10 w-full rounded-material border border-outline bg-surface px-3 text-sm text-neutral-900"
  };
}

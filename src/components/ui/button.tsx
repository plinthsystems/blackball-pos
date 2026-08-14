import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "border border-lime-300/50 bg-lime-400 text-slate-950 shadow-[0_0_20px_rgba(132,204,22,0.25)] hover:bg-lime-300",
  secondary: "border border-slate-600 bg-slate-950 text-slate-100 hover:border-lime-300/60 hover:bg-slate-900",
  danger: "border border-rose-300/50 bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.22)] hover:bg-rose-400",
  ghost: "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
};

export function Button({ className, variant = "secondary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-material px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

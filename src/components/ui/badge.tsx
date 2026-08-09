import { cn } from "@/lib/cn";

const tones = {
  neutral: "border border-slate-600 bg-slate-800 text-slate-200",
  success: "border border-lime-300/40 bg-lime-300/10 text-lime-200",
  warning: "border border-amber-300/40 bg-amber-300/10 text-amber-200",
  danger: "border border-rose-300/40 bg-rose-400/10 text-rose-200",
  info: "border border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-bold", tones[tone])}>{children}</span>;
}

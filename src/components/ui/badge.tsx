import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-emerald-50 text-success",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-danger",
  info: "bg-yellow-50 text-brass"
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

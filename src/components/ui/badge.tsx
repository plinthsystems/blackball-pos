import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-danger",
  info: "bg-blue-50 text-primary"
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

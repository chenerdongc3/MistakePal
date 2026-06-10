import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type AlertVariant = "info" | "success" | "warning" | "destructive";

const variants: Record<AlertVariant, string> = {
  destructive: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function Alert({
  className,
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      className={cn("rounded-md border px-3 py-2 text-sm leading-6", variants[variant], className)}
      {...props}
    />
  );
}

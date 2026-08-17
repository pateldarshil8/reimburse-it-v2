import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-violet-500/30 bg-violet-500/10 text-violet-300",
        secondary: "border-neutral-700 bg-neutral-800 text-neutral-300",
        outline: "border-neutral-700 text-neutral-300",
        success: "border-green-500/30 bg-green-500/10 text-green-400",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

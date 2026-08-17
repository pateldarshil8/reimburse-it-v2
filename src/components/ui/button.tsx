import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-violet-500 text-neutral-950 shadow-[0_0_0_1px_rgba(167,139,250,0.4)] hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-[0_0_20px_rgba(167,139,250,0.35)]",
        destructive:
          "bg-red-500 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-400 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]",
        outline:
          "border border-neutral-700 bg-transparent text-neutral-200 hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300",
        secondary:
          "bg-neutral-800 text-neutral-100 hover:-translate-y-0.5 hover:bg-neutral-700",
        ghost: "text-neutral-200 hover:bg-violet-500/10 hover:text-violet-300",
        link: "text-violet-400 underline-offset-4 hover:underline hover:text-violet-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-100 shadow-sm transition-colors duration-150 placeholder:text-neutral-600 hover:border-neutral-600 focus-visible:outline-none focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

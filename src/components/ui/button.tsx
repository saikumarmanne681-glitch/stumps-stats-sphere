import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.28)]",
  {
    variants: {
      variant: {
        default: "border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)),rgba(96,165,250,0.92))] text-primary-foreground hover:brightness-105",
        destructive: "border border-destructive/20 bg-gradient-to-r from-destructive to-rose-400 text-destructive-foreground hover:brightness-105",
        outline: "border border-border/80 bg-white/80 text-foreground hover:bg-primary/5 hover:text-primary",
        secondary: "border border-sky-200 bg-gradient-to-r from-sky-100 to-cyan-100 text-secondary-foreground hover:from-sky-200 hover:to-cyan-100",
        ghost: "bg-transparent text-foreground hover:bg-primary/10 hover:text-primary shadow-none",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || "Working on it..."}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

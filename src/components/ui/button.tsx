import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-glow",
        premium:
          "bg-gradient-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:shadow-elevated before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-gold-light/45 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
        gold:
          "bg-gradient-gold text-accent-foreground shadow-gold hover:-translate-y-0.5 hover:brightness-105",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/16 hover:-translate-y-0.5",
        glass:
          "border border-primary/15 bg-card/70 text-foreground backdrop-blur-md shadow-soft hover:-translate-y-0.5 hover:border-primary/30",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:-translate-y-0.5",
        outline:
          "border border-primary/20 bg-card/70 text-foreground hover:border-primary/40 hover:bg-primary/8 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5",
        ghost: "text-foreground hover:bg-primary/10 hover:text-primary",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4 text-xs sm:text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
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
  autoLoading?: boolean;
  minLoadingMs?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    loadingText,
    autoLoading = true,
    minLoadingMs = 600,
    children,
    disabled,
    onClick,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [internalLoading, setInternalLoading] = React.useState(false);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick) return;

      const result = onClick(event) as unknown;
      if (event.defaultPrevented) return;

      if (!autoLoading) {
        return;
      }

      if (result && typeof result === "object" && result !== null && "then" in result && typeof (result as any).then === "function") {
        try {
          setInternalLoading(true);
          const startedAt = Date.now();
          await (result as Promise<unknown>);
          const elapsed = Date.now() - startedAt;
          if (elapsed < minLoadingMs) {
            await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed));
          }
        } finally {
          setInternalLoading(false);
        }
        return;
      }

      setInternalLoading(true);
      window.setTimeout(() => setInternalLoading(false), minLoadingMs);
    };

    const isLoading = loading || internalLoading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || "Loading, please wait..."}</span>
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

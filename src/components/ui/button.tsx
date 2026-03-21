import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.95rem] font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5 active:translate-y-0",
  {
    variants: {
      variant: {
        default: "border border-primary/30 bg-primary text-primary-foreground shadow-[0_16px_30px_-20px_rgba(22,101,52,0.6)] hover:brightness-110",
        destructive: "border border-destructive/30 bg-destructive text-destructive-foreground shadow-[0_16px_30px_-20px_rgba(220,38,38,0.55)] hover:brightness-110",
        outline: "border border-primary/15 bg-white text-foreground shadow-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30",
        secondary: "border border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-muted",
        ghost: "bg-transparent text-foreground hover:bg-primary/8 hover:text-primary shadow-none",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 rounded-2xl",
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

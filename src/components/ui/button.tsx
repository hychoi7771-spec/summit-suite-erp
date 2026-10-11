import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-b-4 border-primary-depth hover:brightness-105 active:border-b-2",
        destructive: "bg-destructive text-destructive-foreground border-b-4 border-destructive-depth hover:brightness-105 active:border-b-2",
        outline: "border-2 border-input border-b-4 bg-background hover:bg-accent hover:text-accent-foreground active:border-b-2",
        secondary: "bg-secondary text-secondary-foreground border-b-4 border-border hover:bg-secondary/80 active:border-b-2",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-2xl px-8",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, onPointerDown, ...props }, ref) => {
    const [burst, setBurst] = React.useState(false);
    const Comp = asChild ? Slot : "button";
    const showEffect = !asChild && (variant === undefined || variant === 'default');
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}
        onPointerDown={(event) => {
          if (showEffect && !props.disabled) setBurst(true);
          onPointerDown?.(event);
        }}>
        {children}
        {showEffect && burst && (
          <svg className="button-burst" viewBox="0 0 100 40" aria-hidden="true" focusable="false"
            onAnimationEnd={() => setBurst(false)}>
            <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 8 3 3M5 20H0M8 32l-5 5M92 8l5-5M95 20h5M92 32l5 5" />
            </g>
            <circle cx="15" cy="2" r="2" fill="currentColor" />
            <circle cx="85" cy="38" r="2" fill="currentColor" />
          </svg>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

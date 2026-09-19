import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * JourneyX button (Design System §13). Ink = primary, Signal Teal = the single
 * accent CTA per view, plus secondary / ghost / destructive / link.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-colors duration-100 ease-jx-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary:
          "border border-input bg-surface text-foreground hover:bg-surface-alt",
        ghost:
          "text-text-secondary hover:bg-surface-alt hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        link: "text-info underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-11 px-5",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

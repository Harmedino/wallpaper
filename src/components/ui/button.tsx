import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const styles = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300",
  {
    variants: {
      variant: {
        default: "bg-teal-300 text-slate-950 hover:bg-teal-200",
        outline:
          "border border-white/20 bg-white/5 text-white hover:bg-white/10",
        ghost: "text-slate-300 hover:text-white",
      },
      size: { default: "px-5 py-3 text-sm", sm: "px-4 py-2 text-xs" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof styles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={twMerge(clsx(styles({ variant, size, className })))}
      {...props}
    />
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Pill actions (plan 16): primary is an ember gradient with an inner top highlight (dark hover adds the
 * ember glow); secondary is a panel with a 1px hairline (a flat control); quiet is text only; ink is a solid
 * foreground fill (onboarding). Press scales to 0.97.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent text-[0.8125rem] font-medium leading-tight text-center select-none transition-[background-color,transform,box-shadow] duration-[120ms] outline-none active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "ember-button text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28)] hover:brightness-95 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),var(--ember-glow)] focus-visible:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),var(--ember-glow)] dark:hover:brightness-110 disabled:opacity-100 disabled:bg-none disabled:bg-shoal disabled:text-chart-grey disabled:shadow-none disabled:hover:brightness-100",
        secondary: "border-hairline bg-panel text-foreground hover:bg-shoal",
        quiet: "text-chart-grey hover:text-foreground hover:underline underline-offset-4",
        // Solid ink, no gradient and no glow: onboarding's primary action (its one ember mark is the progress segment).
        ink: "bg-foreground text-background hover:bg-foreground/85 disabled:opacity-100 disabled:bg-shoal disabled:text-chart-grey",
      },
      size: {
        md: "h-10 min-w-40 px-5",
        sm: "h-9 px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

import * as React from "react";
import { Card, CardProps } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GlassCardProps = CardProps & {
  tilt?: boolean;
};

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className, children, tilt = false, ...props },
  ref,
) {
  return (
    <Card
      ref={ref}
      {...props}
      className={cn(
        "relative overflow-hidden border-white/10 bg-white/4 text-slate-50 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent",
        tilt ? "transition-transform duration-500 ease-out will-change-transform" : "",
        className,
      )}
    >
      {children}
    </Card>
  );
});


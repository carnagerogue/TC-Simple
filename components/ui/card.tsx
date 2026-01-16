import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-white/20 bg-white/5 text-white shadow-[0_25px_45px_rgba(15,23,42,0.25)] backdrop-blur-[50px]",
        className,
      )}
      {...props}
    />
  );
});


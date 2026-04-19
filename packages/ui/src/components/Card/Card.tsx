"use client";

import * as React from "react";
import clsx from "clsx";

export function Card({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={ref}
      className={clsx("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}
Card.displayName = "Card";

export function CardHeader({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) {
  return <div ref={ref} className={clsx("flex flex-col space-y-1.5 p-4", className)} {...props} />;
}
CardHeader.displayName = "CardHeader";

export function CardTitle({ className, ref, ...props }: React.ComponentPropsWithRef<"h3">) {
  return (
    <h3 ref={ref} className={clsx("text-sm font-semibold leading-none", className)} {...props} />
  );
}
CardTitle.displayName = "CardTitle";

export function CardDescription({ className, ref, ...props }: React.ComponentPropsWithRef<"p">) {
  return <p ref={ref} className={clsx("text-sm text-muted-foreground", className)} {...props} />;
}
CardDescription.displayName = "CardDescription";

export function CardContent({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) {
  return <div ref={ref} className={clsx("p-4 pt-0", className)} {...props} />;
}
CardContent.displayName = "CardContent";

export function CardFooter({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) {
  return <div ref={ref} className={clsx("flex items-center p-4 pt-0", className)} {...props} />;
}
CardFooter.displayName = "CardFooter";

export type {};

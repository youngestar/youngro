"use client";

import React from "react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  className,
  children,
  ...props
}) => {
  return (
    <select
      {...props}
      className={clsx(
        // Align with chat style like Input/Textarea
        "h-10 rounded-md px-3 py-2 text-sm font-medium outline-none bg-primary-200/20 dark:bg-primary-400/20 text-primary-500 placeholder-primary-400 dark:text-primary-300/50 dark:placeholder-primary-300/50 focus-visible:ring-2 focus-visible:ring-primary-400/60",
        className
      )}
    >
      {options.length > 0
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
};

export default Select;

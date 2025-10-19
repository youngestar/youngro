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
      className={clsx("h-10 rounded-md border px-3 py-2 text-sm", className)}
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

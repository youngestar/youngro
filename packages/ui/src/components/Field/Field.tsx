"use client";

import React from "react";
import clsx from "clsx";

export interface FieldProps {
  label?: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  help,
  error,
  className,
  children,
}) => {
  return (
    <div className={clsx("space-y-1", className)}>
      {label && (
        <label className="block text-sm font-medium text-primary-600 dark:text-primary-300">
          {label}
        </label>
      )}
      {children}
      {help && (
        <p className="text-xs text-primary-400 dark:text-primary-300/70">
          {help}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Field;

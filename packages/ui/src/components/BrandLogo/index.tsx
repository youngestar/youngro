"use client";

import * as React from "react";

export interface BrandLogoProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  srcLight: string;
  srcDark?: string;
  alt: string;
}

// Framework-agnostic logo: supports light/dark via <picture>,
// favors a single source when only srcLight is provided.
export const BrandLogo: React.FC<BrandLogoProps> = ({
  srcLight,
  srcDark,
  alt,
  className,
  loading,
  width,
  height,
  ...rest
}) => {
  if (srcDark) {
    return (
      <picture className={className}>
        <source media="(prefers-color-scheme: dark)" srcSet={srcDark} />
        <img
          src={srcLight}
          alt={alt}
          loading={loading}
          width={width}
          height={height}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      src={srcLight}
      alt={alt}
      className={className}
      loading={loading}
      width={width}
      height={height}
      {...rest}
    />
  );
};

export default BrandLogo;

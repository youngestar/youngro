"use client";

import * as React from "react";
import clsx from "clsx";
import { BrandLogo } from "../BrandLogo";

export interface HeaderLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href?: string;
  title?: string;
  /** Light theme logo src */
  logoLightSrc?: string;
  /** Dark theme logo src (optional) */
  logoDarkSrc?: string;
  /** Apply hue-rotate using CSS variable --chromatic-hue */
  hueRotate?: boolean;
  /** Class for the logo element */
  logoClassName?: string;
  /** Class for the text title */
  titleClassName?: string;
}

/**
 * HeaderLink
 * - A simple brand link with optional light/dark logo and hue rotate.
 * - Framework-agnostic (uses <a> instead of Next Link). Consumers can wrap with Link if needed.
 */
export const HeaderLink: React.FC<HeaderLinkProps> = ({
  href = "/",
  title,
  logoLightSrc,
  logoDarkSrc,
  hueRotate = true,
  className,
  logoClassName,
  titleClassName,
  ...rest
}) => {
  const logoStyle: React.CSSProperties | undefined = hueRotate
    ? { filter: "hue-rotate(calc(var(--chromatic-hue, 0) * 1deg))" }
    : undefined;

  return (
    <a
      href={href}
      className={clsx(
        "inline-flex items-center gap-2 px-2 text-2xl outline-none text-nowrap",
        className,
      )}
      {...rest}
    >
      {logoLightSrc ? (
        <BrandLogo
          srcLight={logoLightSrc}
          srcDark={logoDarkSrc}
          alt={title || "brand"}
          className={clsx("h-8 w-8", logoClassName)}
          style={logoStyle}
        />
      ) : null}

      {title ? (
        <span className={clsx("font-semibold select-none", titleClassName)}>
          {title}
        </span>
      ) : null}
    </a>
  );
};

export default HeaderLink;

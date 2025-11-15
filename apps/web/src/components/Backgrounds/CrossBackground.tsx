import React, { PropsWithChildren } from "react";
import "./cross-background.css";

/**
 * CrossBackground replicates AIRI's cross-pattern background.
 * Dark mode is handled by a global .dark class on <html> or a parent container.
 */
export function CrossBackground({ children }: PropsWithChildren) {
  return <div className="cross-background-container">{children}</div>;
}

export default CrossBackground;

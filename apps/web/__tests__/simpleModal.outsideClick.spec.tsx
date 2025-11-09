// Using a lightweight shim around the vitest API so that missing types in this package don't block compilation.
// If vitest is added as a devDependency here later, this directive can be removed.
// @ts-expect-error vitest types may not be present in this sub-package
import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { SimpleModal } from "../app/settings/youngro-card/components/SimpleModal";

// NOTE: Using react-dom test-utils directly (no testing-library) to keep deps minimal.

function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root, cleanup: () => container.remove() };
}

describe("SimpleModal outside click safeguard", () => {
  it("does not close when pointerdown inside and mouseup outside", () => {
    let closed = false;
    const { container, cleanup } = render(
      <SimpleModal
        open
        title="Test"
        onClose={() => {
          closed = true;
        }}
      >
        <div data-testid="content" style={{ padding: 20 }}>
          Content
        </div>
      </SimpleModal>
    );

    const overlay = container.querySelector('[role="dialog"]')
      ?.parentElement as HTMLElement; // parent div is overlay
    const content = overlay.querySelector(
      '[data-testid="content"]'
    ) as HTMLElement;

    // Simulate pointerdown inside content
    act(() => {
      content.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    // Simulate mouseup + click on overlay (outside) after drag
    act(() => {
      overlay.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(closed).toBe(false);
    cleanup();
  });

  it("closes when genuine click on overlay (pointerdown & up both on overlay)", () => {
    let closed = false;
    const { container, cleanup } = render(
      <SimpleModal
        open
        title="Test"
        onClose={() => {
          closed = true;
        }}
      >
        <div data-testid="content" style={{ padding: 20 }}>
          Content
        </div>
      </SimpleModal>
    );

    const overlay = container.querySelector('[role="dialog"]')
      ?.parentElement as HTMLElement;

    act(() => {
      overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      overlay.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(closed).toBe(true);
    cleanup();
  });
});

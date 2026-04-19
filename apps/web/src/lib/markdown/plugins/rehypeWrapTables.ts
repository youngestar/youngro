import type { Element as HastElement, Root as HastRoot } from "hast";
import type { Plugin } from "unified";

function isHastElement(node: unknown): node is HastElement {
  return !!node && typeof node === "object" && (node as { type?: unknown }).type === "element";
}

function wrapTablesInParent(parent: HastRoot | HastElement) {
  parent.children = parent.children.map((child) => {
    if (!isHastElement(child)) return child;

    wrapTablesInParent(child);

    if (child.tagName !== "table") return child;

    return {
      type: "element",
      tagName: "div",
      properties: { className: ["md-table-wrap"] },
      children: [child],
    } satisfies HastElement;
  }) as typeof parent.children;
}

/** 将 markdown 产出的 table 包装到滚动容器里，避免窄气泡布局被撑开。 */
export const rehypeWrapTables: Plugin<[], HastRoot, HastRoot> = () => {
  return (tree: HastRoot) => {
    wrapTablesInParent(tree);
  };
};

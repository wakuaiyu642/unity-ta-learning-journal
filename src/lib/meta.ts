import { useEffect } from "react";

/** 轻量页面级 meta：设置标题与描述（含 og:title / og:description）。 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    const ensure = (key: string, attr: "name" | "property") => {
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`
      );
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      return element;
    };
    ensure("description", "name").setAttribute("content", description);
    ensure("og:title", "property").setAttribute("content", title);
    ensure("og:description", "property").setAttribute("content", description);
  }, [title, description]);
}

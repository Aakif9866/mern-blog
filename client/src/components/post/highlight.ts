import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

/** Highlights every <pre><code> inside root. Loaded lazily, only for posts that contain code. */
export function highlightAll(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("pre code").forEach((el) => {
    if (el.dataset.highlighted) return;
    const lang = [...el.classList].find((c) => c.startsWith("language-"))?.slice(9);
    const text = el.textContent ?? "";
    try {
      const tree = lang && lowlight.registered(lang) ? lowlight.highlight(lang, text) : lowlight.highlightAuto(text);
      el.innerHTML = toHtml(tree);
      el.classList.add("hljs");
      el.dataset.highlighted = "1";
    } catch {
      /* leave the block unhighlighted */
    }
  });
}

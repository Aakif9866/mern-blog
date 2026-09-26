import sanitizeHtml from "sanitize-html";

/** Allow-list for post HTML produced by the Tiptap editor (and v1 Quill posts). */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr", "blockquote", "pre", "code", "strong", "b", "em", "i", "u", "s",
    "del", "mark", "sub", "sup", "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead",
    "tbody", "tr", "th", "td", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
    span: ["class", "data-type", "data-id", "data-label"],
    div: ["class"],
    ol: ["start"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    // Quill v1 alignment/indent classes and inline mentions
    p: ["class"],
    li: ["class"],
    h1: ["class", "id"],
    h2: ["class", "id"],
    h3: ["class", "id"],
  },
  allowedClasses: {
    code: [/^language-[\w-]+$/],
    pre: ["ql-syntax", /^language-[\w-]+$/],
    span: ["mention"],
    p: [/^ql-[\w-]+$/],
    li: [/^ql-[\w-]+$/],
    h1: [/^ql-[\w-]+$/],
    h2: [/^ql-[\w-]+$/],
    h3: [/^ql-[\w-]+$/],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
  },
};

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, options);
}

export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

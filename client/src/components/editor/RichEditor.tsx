import { useEffect, useRef, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { uploadImage } from "./upload";
import { errorMessage } from "@/lib/api";

const lowlight = createLowlight(common);
const LANGS = ["plaintext", "javascript", "typescript", "python", "java", "go", "rust", "c", "cpp", "csharp", "bash", "json", "html", "css", "sql", "yaml", "markdown"];

function Tool({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40", active ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200" : "text-ink-soft hover:bg-muted hover:text-ink")}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      language: (e.getAttributes("codeBlock").language as string | undefined) ?? "plaintext",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return chain().extendMarkRange("link").unsetLink().run();
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) return toast.error("Links must start with https:// or mailto:");
    chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  return (
    <div className="scrollbar-none flex items-center gap-0.5 overflow-x-auto" role="toolbar" aria-label="Formatting">
      <Tool label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></Tool>
      <Tool label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></Tool>
      <Tool label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Tool>
      <Tool label="Inline code" active={s.code} onClick={() => chain().toggleCode().run()}><Code className="h-4 w-4" /></Tool>
      <Tool label="Link" active={s.link} onClick={setLink}><Link2 className="h-4 w-4" /></Tool>
      <span className="mx-1 h-6 w-px shrink-0 bg-line" />
      <Tool label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Tool>
      <Tool label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Tool>
      <Tool label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></Tool>
      <Tool label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Tool>
      <Tool label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Tool>
      <Tool label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></Tool>
      <Tool label="Divider" onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Tool>
      <Tool label="Insert image" onClick={onImage}><ImagePlus className="h-4 w-4" /></Tool>
      {s.codeBlock && (
        <select
          value={s.language}
          onChange={(e) => chain().updateAttributes("codeBlock", { language: e.target.value }).run()}
          className="ml-1 h-8 shrink-0 rounded-md border border-line bg-surface px-2 text-xs"
          aria-label="Code language"
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      )}
      <span className="mx-1 h-6 w-px shrink-0 bg-line" />
      <Tool label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()}><Undo2 className="h-4 w-4" /></Tool>
      <Tool label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()}><Redo2 className="h-4 w-4" /></Tool>
    </div>
  );
}

const MARKDOWN_HINT = /(^|\n)(#{1,6} |[-*+] |\d+\. |> |```)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/;

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  toolbarSlot?: (toolbar: ReactNode) => ReactNode;
}

/**
 * Tiptap editor with Markdown shortcuts (## heading, ``` code, **bold**),
 * Markdown paste, syntax-highlighted code blocks and image uploads.
 */
export function RichEditor({ content, onChange, toolbarSlot }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const insertImage = async (file: File, ed: Editor) => {
    const id = toast.loading("Uploading image…");
    try {
      const url = await uploadImage(file);
      ed.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
      toast.success("Image added", { id });
    } catch (e) {
      toast.error(errorMessage(e), { id });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Tell your story… Markdown works: ## heading, ``` code, **bold**" }),
      Markdown,
    ],
    content,
    immediatelyRender: true,
    editorProps: {
      attributes: { class: "klyro-prose focus:outline-none", "aria-label": "Post content", role: "textbox", "aria-multiline": "true" },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (files[0] && editor) {
          event.preventDefault();
          void insertImage(files[0], editor);
          return true;
        }
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (!html && editor && MARKDOWN_HINT.test(text)) {
          event.preventDefault();
          editor.chain().focus().insertContent(text, { contentType: "markdown" }).run();
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const file = [...(event.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
        if (file && editor) {
          event.preventDefault();
          void insertImage(file, editor);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current(e.isEmpty ? "" : e.getHTML()),
  });

  if (!editor) return null;
  const toolbar = <Toolbar editor={editor} onImage={() => fileRef.current?.click()} />;
  return (
    <div className="klyro-editor">
      {toolbarSlot ? toolbarSlot(toolbar) : toolbar}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void insertImage(f, editor);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

type InsertPanel = "link" | null;

type ContextMenuState = {
  x: number;
  y: number;
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  maxLength?: number;
};

function isSafeEditorUrl(value: string): boolean {
  return (
    (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) ||
    value.startsWith("https://")
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownInlineToHtml(value: string): string {
  const placeholders: string[] = [];
  const protect = (html: string) => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };
  let html = escapeHtml(value);

  html = html.replace(
    /\[([^\]\n]+)\]\((https:\/\/[^)\s]+|\/(?!\/)[^)\s]*)\)/g,
    (_, label: string, href: string) => protect(
      `<a href="${escapeHtml(href)}">${label}</a>`,
    ),
  );
  html = html.replace(/`([^`\n]+)`/g, (_, text: string) => protect(`<code>${text}</code>`));
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/~~([^~\n]+)~~/g, "<s>$1</s>");
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  return html.replace(/\u0000(\d+)\u0000/g, (_, index: string) => placeholders[Number(index)]);
}

function legacyMarkdownToHtml(value: string): string {
  const lines = value.split(/\r?\n/);
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.map(markdownInlineToHtml).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${list.items.map((item) => `<li><p>${markdownInlineToHtml(item)}</p></li>`).join("")}</${tag}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const item = /^\s*([-*]|\d+\.)\s+(.+)$/.exec(line);
    if (item) {
      flushParagraph();
      const ordered = /^\d/.test(item[1]);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[2]);
    } else if (line.trim()) {
      flushList();
      paragraph.push(line);
    } else {
      flushParagraph();
      flushList();
    }
  }
  flushParagraph();
  flushList();
  return blocks.join("");
}

function editorContentFromValue(value: string): string {
  if (!value.trim()) return "";
  if (/<\/?(?:p|h[1-6]|ul|ol|blockquote|table|div|img|iframe|pre|br|hr|strong|em|u|s|a)\b/i.test(value)) {
    return value;
  }
  return legacyMarkdownToHtml(value);
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`rich-editor-toolbar-button${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <ToolbarGlyph name={label} />
    </button>
  );
}

function ToolbarGlyph({ name }: { name: string }) {
  if (name === "Bold") return <strong aria-hidden="true" className="rich-editor-letter-icon">B</strong>;
  if (name === "Italic") return <em aria-hidden="true" className="rich-editor-letter-icon">I</em>;
  if (name === "Underline") return <span aria-hidden="true" className="rich-editor-letter-icon underline">U</span>;
  if (name === "Strikethrough") return <span aria-hidden="true" className="rich-editor-letter-icon strike">S</span>;
  if (name === "Highlight") return <span aria-hidden="true" className="rich-editor-letter-icon highlight">H</span>;
  const paths: Record<string, ReactNode> = {
    "Bulleted list": <><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /><path d="M9 6h11M9 12h11M9 18h11" /></>,
    "Numbered list": <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3 4h2v4M3 10h2l-2 3h2M3 16h2l-2 3h2" /></>,
    "Task list": <><rect x="2.5" y="3" width="5" height="5" rx="1" /><path d="m3.5 5.5 1 1 2-2M10 5.5h11M2.5 13h5v5h-5zM10 15.5h11" /></>,
    Quote: <><path d="M4 5h16M4 10h11M4 15h13M4 20h8" /><path d="M2 3v18" /></>,
    "Code block": <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" /></>,
    "Align left": <><path d="M3 5h18M3 9h12M3 13h18M3 17h12M3 21h18" /></>,
    "Align centre": <><path d="M3 5h18M6 9h12M3 13h18M6 17h12M3 21h18" /></>,
    "Align right": <><path d="M3 5h18M9 9h12M3 13h18M9 17h12M3 21h18" /></>,
    "Insert link": <><path d="m9 15 6-6m-8 9H5a4 4 0 0 1 0-8h4m6-4h4a4 4 0 0 1 0 8h-4" /></>,
    "Insert table": <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></>,
    "Add table row": <><path d="M4 6h16M4 12h16M4 18h16M8 3v6m-3-3h6" /></>,
    "Add table column": <><path d="M6 4v16M12 4v16M18 4v16M15 8h6m-3-3v6" /></>,
    "Remove table row": <><path d="M4 6h16M4 12h16M4 18h16M5 3h6" /></>,
    "Remove table column": <><path d="M6 4v16M12 4v16M18 4v16M15 5h6" /></>,
    "Delete table": <><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8-6v6" /><path d="m9 14 6 6m0-6-6 6" /></>,
    Undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h9a7 7 0 0 1 7 7v2" /></>,
    Redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9h-9a7 7 0 0 0-7 7v2" /></>,
  };
  return (
    <svg aria-hidden="true" className="rich-editor-glyph" fill="none" viewBox="0 0 24 24">
      {paths[name] ?? null}
    </svg>
  );
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = "Write your content here…",
  maxLength = 4000,
}: RichTextEditorProps) {
  const [insertPanel, setInsertPanel] = useState<InsertPanel>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [insertError, setInsertError] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" },
        isAllowedUri: (url, { defaultValidate }) =>
          isSafeEditorUrl(url) && (url.startsWith("/") || defaultValidate(url)),
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Image.configure({ allowBase64: false }),
      TableKit,
      Youtube.configure({ nocookie: true, controls: true }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: editorContentFromValue(value),
    editorProps: {
      attributes: {
        "aria-label": label,
        class: "rich-editor-content",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
  });

  useEffect(() => {
    if (!contextMenu) return;
    contextMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function closeOnPointer(event: PointerEvent) {
      if (event.target instanceof Node && !contextMenuRef.current?.contains(event.target)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("pointerdown", closeOnPointer);
    return () => document.removeEventListener("pointerdown", closeOnPointer);
  }, [contextMenu]);

  function openInsertPanel(panel: Exclude<InsertPanel, null>) {
    setInsertError(null);
    setInsertPanel((current) => current === panel ? null : panel);
    if (panel === "link") {
      setLinkUrl(editor?.getAttributes("link").href ?? "");
    }
  }

  function insertLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkUrl.trim();
    if (!editor || !isSafeEditorUrl(href)) {
      setInsertError("Use an HTTPS address or a path on this website.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setInsertPanel(null);
  }

  function setContextMenuAt(x: number, y: number) {
    const width = 244;
    const height = 340;
    setContextMenu({
      x: Math.max(12, Math.min(x, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(y, window.innerHeight - height - 12)),
    });
  }

  function showContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuAt(event.clientX, event.clientY);
  }

  function closeContextMenu(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu(null);
      editor?.commands.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    const activeElement = document.activeElement;
    const current = activeElement instanceof HTMLButtonElement
      ? items.indexOf(activeElement)
      : -1;
    const next = event.key === "ArrowDown"
      ? (current + 1 + items.length) % items.length
      : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  }

  function runContextCommand(command: () => void) {
    command();
    setContextMenu(null);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      event.stopPropagation();
      setContextMenuAt(28, 72);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openInsertPanel("link");
    }
  }

  if (!editor) {
    return <div aria-label={`${label} editor loading`} className="rich-editor-loading" />;
  }

  return (
    <div className="rich-editor-shell">
      <div aria-label="Text formatting" className="rich-editor-toolbar" role="toolbar">
        <select
          aria-label="Text style"
          className="rich-editor-style-select"
          onChange={(event) => {
            if (event.target.value === "paragraph") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(event.target.value) as 1 | 2 | 3 }).run();
          }}
          value={editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "paragraph"}
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <span aria-hidden="true" className="rich-editor-divider" />
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <ToolbarButton label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
        <span aria-hidden="true" className="rich-editor-divider" />
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton label="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <span aria-hidden="true" className="rich-editor-divider" />
        <ToolbarButton label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
        <ToolbarButton label="Align centre" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
        <ToolbarButton label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
        <span aria-hidden="true" className="rich-editor-divider" />
        <ToolbarButton label="Insert link" active={editor.isActive("link")} onClick={() => openInsertPanel("link")} />
        <ToolbarButton label="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <ToolbarButton label="Add table row" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().addRowAfter().run()} />
        <ToolbarButton label="Add table column" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().addColumnAfter().run()} />
        <ToolbarButton label="Remove table row" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().deleteRow().run()} />
        <ToolbarButton label="Remove table column" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().deleteColumn().run()} />
        <ToolbarButton label="Delete table" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().deleteTable().run()} />
        <span aria-hidden="true" className="rich-editor-divider" />
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      </div>

      {insertPanel && (
        <form
          className="rich-editor-insert-panel"
          onSubmit={insertLink}
        >
          <label className="editor-field">
            <span>Link address</span>
            <input autoFocus onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://… or /page" type="text" inputMode="url" value={linkUrl} />
          </label>
          <button className="editor-menu-apply" type="submit">Apply link</button>
          {insertError && <span className="editor-link-error" role="alert">{insertError}</span>}
          <button className="editor-menu-cancel" onClick={() => setInsertPanel(null)} type="button">Cancel</button>
        </form>
      )}

      <div
        className="rich-editor-surface"
        onContextMenu={showContextMenu}
        onKeyDown={handleEditorKeyDown}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="rich-editor-footer">
        <span className={editor.getHTML().length > maxLength ? "is-over-limit" : ""}>
          {editor.getHTML().length.toLocaleString()} / {maxLength.toLocaleString()} stored characters
        </span>
        <span>Right-click for editing tools</span>
      </div>

      {contextMenu && (
        <div
          aria-label="Text editor tools"
          className="editor-context-menu rich-editor-context-menu"
          ref={contextMenuRef}
          onKeyDown={closeContextMenu}
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <span className="editor-menu-title">Text editor tools</span>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleBold().run())} role="menuitem" type="button"><strong>B</strong><span>Bold</span><kbd>Ctrl+B</kbd></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleItalic().run())} role="menuitem" type="button"><em>I</em><span>Italic</span><kbd>Ctrl+I</kbd></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleUnderline().run())} role="menuitem" type="button"><u>U</u><span>Underline</span></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleStrike().run())} role="menuitem" type="button"><s>S</s><span>Strikethrough</span><kbd>Ctrl+Shift+X</kbd></button>
          <span className="editor-menu-divider" />
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleBulletList().run())} role="menuitem" type="button"><span>Bulleted list</span></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().toggleOrderedList().run())} role="menuitem" type="button"><span>Numbered list</span></button>
          <button className="editor-menu-item" onClick={() => { setContextMenu(null); openInsertPanel("link"); }} role="menuitem" type="button"><span>Insert link</span><kbd>Ctrl+K</kbd></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().undo().run())} role="menuitem" type="button"><span>Undo</span><kbd>Ctrl+Z</kbd></button>
          <button className="editor-menu-item" onClick={() => runContextCommand(() => editor.chain().focus().redo().run())} role="menuitem" type="button"><span>Redo</span><kbd>Ctrl+Y</kbd></button>
        </div>
      )}
    </div>
  );
}

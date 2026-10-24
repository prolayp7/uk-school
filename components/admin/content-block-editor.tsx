"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

type EditorBlockType =
  | "paragraph"
  | "heading"
  | "quote"
  | "image"
  | "link"
  | "table-of-contents"
  | "video"
  | "callout";

type VideoProvider = "youtube" | "vimeo" | "uploaded";
type BlockLayout = "full" | "side-by-side";
type MediaSide = "left" | "right";
type CalloutTone = "paper" | "sage" | "rose" | "burgundy";

export type EditorialBlock = {
  id: string;
  type: EditorBlockType;
  text?: string;
  level?: 2 | 3 | 4;
  citation?: string;
  url?: string;
  alt?: string;
  caption?: string;
  label?: string;
  title?: string;
  provider?: VideoProvider;
  layout?: BlockLayout;
  mediaSide?: MediaSide;
  tone?: CalloutTone;
};

type ContentBlockEditorProps = {
  initialValue?: string;
  onChange?: (blocks: EditorialBlock[]) => void;
};

type EditorMenuState = {
  x: number;
  y: number;
};

const addableBlocks: Array<{ type: EditorBlockType; label: string }> = [
  { type: "table-of-contents", label: "Table of contents" },
  { type: "heading", label: "Heading" },
  { type: "paragraph", label: "Text content" },
  { type: "image", label: "Image" },
  { type: "video", label: "Video" },
  { type: "callout", label: "Callout box" },
  { type: "quote", label: "Quote" },
  { type: "link", label: "Link" },
];

const apiBlockTypes = new Set(["paragraph", "heading", "quote", "image", "link"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readEditorialBlocks(value?: string): EditorialBlock[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown, index: number): EditorialBlock[] => {
      if (!isRecord(item) || typeof item.type !== "string") return [];
      const base = { id: `existing-${index}` };
      if (item.type === "paragraph" && typeof item.text === "string") {
        return [{ ...base, type: "paragraph" as const, text: item.text }];
      }
      if (item.type === "heading" && typeof item.text === "string") {
        const level = item.level === 3 || item.level === 4 ? item.level : 2;
        return [{ ...base, type: "heading" as const, text: item.text, level }];
      }
      if (item.type === "quote" && typeof item.text === "string") {
        return [{
          ...base,
          type: "quote" as const,
          text: item.text,
          ...(typeof item.citation === "string" ? { citation: item.citation } : {}),
        }];
      }
      if (item.type === "image" && typeof item.url === "string") {
        return [{
          ...base,
          type: "image" as const,
          url: item.url,
          alt: typeof item.alt === "string" ? item.alt : "",
        }];
      }
      if (item.type === "link" && typeof item.url === "string") {
        return [{
          ...base,
          type: "link" as const,
          url: item.url,
          label: typeof item.label === "string" ? item.label : "",
        }];
      }
      if (item.type === "table-of-contents") {
        return [{ ...base, type: "table-of-contents" as const, title: "On this page" }];
      }
      if (item.type === "video" && typeof item.url === "string") {
        return [{
          ...base,
          type: "video" as const,
          url: item.url,
          provider: item.provider === "vimeo" || item.provider === "uploaded" ? item.provider : "youtube",
          layout: item.layout === "side-by-side" ? "side-by-side" : "full",
          mediaSide: item.mediaSide === "right" ? "right" : "left",
          text: typeof item.text === "string" ? item.text : "",
        }];
      }
      if (item.type === "callout") {
        return [{
          ...base,
          type: "callout" as const,
          title: typeof item.title === "string" ? item.title : "",
          text: typeof item.text === "string" ? item.text : "",
          tone: item.tone === "sage" || item.tone === "rose" || item.tone === "burgundy"
            ? item.tone
            : "paper",
        }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function createBlock(type: EditorBlockType, id: string): EditorialBlock {
  if (type === "heading") return { id, type, level: 2, text: "" };
  if (type === "image") return { id, type, url: "", alt: "", layout: "full", mediaSide: "left" };
  if (type === "video") {
    return { id, type, provider: "youtube", url: "", layout: "full", mediaSide: "left", text: "" };
  }
  if (type === "table-of-contents") return { id, type, title: "On this page" };
  if (type === "callout") return { id, type, title: "", text: "", tone: "paper" };
  if (type === "quote") return { id, type, text: "", citation: "" };
  if (type === "link") return { id, type, url: "", label: "" };
  return { id, type, text: "" };
}

function editorialPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasUnsupportedEditorialBlocks(blocks: EditorialBlock[]): boolean {
  return blocks.some((block) =>
    !apiBlockTypes.has(block.type) ||
    ((block.type === "image" || block.type === "video") &&
      (block.layout === "side-by-side" || Boolean(block.text?.trim()))),
  );
}

export function hasEditorialTextOverLimit(blocks: EditorialBlock[]): boolean {
  return blocks.some((block) =>
    (block.type === "heading" && (block.text?.length ?? 0) > 1000) ||
    ((block.type === "paragraph" || block.type === "quote") &&
      (block.text?.length ?? 0) > 4000),
  );
}

function Icon({ name }: { name: "plus" | "arrow-up" | "arrow-down" | "close" }) {
  const path = {
    plus: <path d="M12 5v14M5 12h14" />,
    "arrow-up": <path d="m7 14 5-5 5 5" />,
    "arrow-down": <path d="m7 10 5 5 5-5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }[name];
  return (
    <svg aria-hidden="true" className="editor-icon" viewBox="0 0 24 24" fill="none">
      {path}
    </svg>
  );
}

export function ContentBlockEditor({ initialValue, onChange }: ContentBlockEditorProps) {
  const [blocks, setBlocks] = useState(() => readEditorialBlocks(initialValue));
  const [menu, setMenu] = useState<EditorMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const menuReturnFocus = useRef<HTMLElement | null>(null);
  const nextId = useRef(0);
  const headingBlocks = blocks.filter(
    (block) => block.type === "heading" && editorialPlainText(block.text ?? ""),
  );

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function closeMenu(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenu(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  function commit(nextBlocks: EditorialBlock[]) {
    setBlocks(nextBlocks);
    onChange?.(nextBlocks);
  }

  function openMenuAt(x: number, y: number) {
    const menuHeight = Math.min(340, window.innerHeight - 24);
    const menuWidth = 224;
    setMenu({
      x: Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12)),
      y: Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12)),
    });
  }

  function openMenuFromPointer(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    menuReturnFocus.current = event.currentTarget;
    openMenuAt(event.clientX, event.clientY);
  }

  function addBlock(type: EditorBlockType) {
    nextId.current += 1;
    commit([...blocks, createBlock(type, `new-${nextId.current}`)]);
    setMenu(null);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }

  function updateBlock(id: string, patch: Partial<EditorialBlock>) {
    commit(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[destination]] = [next[destination], next[index]];
    commit(next);
  }

  function removeBlock(id: string) {
    commit(blocks.filter((block) => block.id !== id));
  }

  function addMenuItems() {
    return addableBlocks.map((item) => (
      <button
        className="editor-menu-item"
        key={item.type}
        onClick={() => addBlock(item.type)}
        role="menuitem"
        type="button"
      >
        <span>{item.label}</span>
        <span aria-hidden="true">+</span>
      </button>
    ));
  }

  function renderBlockFields(block: EditorialBlock) {
    if (block.type === "table-of-contents") {
      return (
        <div className="editor-toc-preview">
          <label className="editor-field">
            <span>Section title</span>
            <input
              onChange={(event) => updateBlock(block.id, { title: event.target.value })}
              value={block.title ?? ""}
            />
          </label>
          <div aria-label="Table of contents preview" className="editor-toc-links">
            {headingBlocks.length ? headingBlocks.map((heading) => (
              <span key={heading.id}>{editorialPlainText(heading.text ?? "")}</span>
            )) : <span>Add headings to populate this table of contents.</span>}
          </div>
        </div>
      );
    }

    if (block.type === "heading") {
      return (
        <div className="editor-block-fields">
          <label className="editor-field editor-field-compact">
            <span>Heading level</span>
            <select
              onChange={(event) =>
                updateBlock(block.id, { level: Number(event.target.value) as 2 | 3 | 4 })
              }
              value={block.level ?? 2}
            >
              <option value={2}>Heading 2</option>
              <option value={3}>Heading 3</option>
              <option value={4}>Heading 4</option>
            </select>
          </label>
          <label className="editor-field editor-field-wide">
            <span>Heading text</span>
            <input
              maxLength={1000}
              onChange={(event) => updateBlock(block.id, { text: event.target.value })}
              required
              value={block.text ?? ""}
            />
          </label>
        </div>
      );
    }

    if (block.type === "paragraph" || block.type === "quote") {
      return (
        <div className="editor-block-fields">
          <div className="editor-field editor-field-wide">
            <span>{block.type === "quote" ? "Quote" : "Text"}</span>
            <RichTextEditor
              label={block.type === "quote" ? "Quote text" : "Text content"}
              maxLength={4000}
              onChange={(text) => updateBlock(block.id, { text })}
              placeholder={block.type === "paragraph" ? "Write your content here…" : undefined}
              value={block.text ?? ""}
            />
          </div>
          {block.type === "quote" && (
            <label className="editor-field">
              <span>Attribution <small>(optional)</small></span>
              <input
                maxLength={200}
                onChange={(event) => updateBlock(block.id, { citation: event.target.value })}
                value={block.citation ?? ""}
              />
            </label>
          )}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div className="editor-block-fields">
          <label className="editor-field">
            <span>Image URL</span>
            <input
              onChange={(event) => updateBlock(block.id, { url: event.target.value })}
              placeholder="https://…"
              required
              value={block.url ?? ""}
            />
          </label>
          <label className="editor-field">
            <span>Alternative text</span>
            <input
              maxLength={300}
              onChange={(event) => updateBlock(block.id, { alt: event.target.value })}
              placeholder="Describe the image for screen readers"
              required
              value={block.alt ?? ""}
            />
          </label>
          <MediaLayoutFields block={block} updateBlock={updateBlock} />
        </div>
      );
    }

    if (block.type === "video") {
      return (
        <div className="editor-block-fields">
          <label className="editor-field editor-field-compact">
            <span>Video source</span>
            <select
              onChange={(event) =>
                updateBlock(block.id, { provider: event.target.value as VideoProvider })
              }
              value={block.provider ?? "youtube"}
            >
              <option value="youtube">YouTube link</option>
              <option value="vimeo">Vimeo link</option>
              <option value="uploaded">Uploaded video link</option>
            </select>
          </label>
          <label className="editor-field">
            <span>{block.provider === "uploaded" ? "Video URL" : `${block.provider === "vimeo" ? "Vimeo" : "YouTube"} URL`}</span>
            <input
              onChange={(event) => updateBlock(block.id, { url: event.target.value })}
              placeholder="https://…"
              type="url"
              required
              value={block.url ?? ""}
            />
          </label>
          <MediaLayoutFields block={block} updateBlock={updateBlock} />
        </div>
      );
    }

    if (block.type === "callout") {
      return (
        <div className={`editor-callout-preview tone-${block.tone ?? "paper"}`}>
          <div className="editor-block-fields">
            <label className="editor-field">
              <span>Box heading <small>(optional)</small></span>
              <input
                onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                value={block.title ?? ""}
              />
            </label>
            <div className="editor-field editor-field-wide">
              <span>Box content</span>
              <RichTextEditor
                label="Callout box content"
                onChange={(text) => updateBlock(block.id, { text })}
                placeholder="Add the text to sit beside this media…"
                value={block.text ?? ""}
              />
            </div>
            <label className="editor-field editor-field-compact">
              <span>Background</span>
              <select
                onChange={(event) => updateBlock(block.id, { tone: event.target.value as CalloutTone })}
                value={block.tone ?? "paper"}
              >
                <option value="paper">Warm white</option>
                <option value="sage">Soft sage</option>
                <option value="rose">Pale rose</option>
                <option value="burgundy">Burgundy</option>
              </select>
            </label>
          </div>
        </div>
      );
    }

    return (
      <div className="editor-block-fields">
        <label className="editor-field">
          <span>Link label</span>
          <input
            maxLength={200}
            onChange={(event) => updateBlock(block.id, { label: event.target.value })}
            required
            value={block.label ?? ""}
          />
        </label>
        <label className="editor-field">
          <span>Link URL</span>
          <input
            onChange={(event) => updateBlock(block.id, { url: event.target.value })}
            placeholder="https://… or /page"
            required
            value={block.url ?? ""}
          />
        </label>
      </div>
    );
  }

  return (
    <section aria-label="Content editor" className="content-builder">
      <div className="content-builder-heading">
        <div>
          <h2>Content</h2>
          <p>Add sections, then arrange them in the order they should appear.</p>
        </div>
        <button
          className="editor-add-button"
          onClick={openMenuFromPointer}
          ref={addButtonRef}
          type="button"
        >
          <Icon name="plus" />
          Add section
        </button>
      </div>
      <div
        className="content-builder-canvas"
        onContextMenu={openMenuFromPointer}
        onKeyDown={(event) => {
          const target = event.target;
          if (
            !(target instanceof HTMLElement && target.isContentEditable) &&
            !(target instanceof HTMLInputElement) &&
            !(target instanceof HTMLSelectElement) &&
            (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
          ) {
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            menuReturnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            openMenuAt(bounds.left + 24, bounds.top + 48);
          }
        }}
      >
        {blocks.length === 0 ? (
          <div className="editor-empty-state">
            <span className="editor-empty-mark" aria-hidden="true">
              <Icon name="plus" />
            </span>
            <strong>Start building your content</strong>
            <span>Use Add section, or right-click here to insert a section.</span>
          </div>
        ) : (
          <ol className="editor-block-list">
            {blocks.map((block, index) => {
              const title = addableBlocks.find((item) => item.type === block.type)?.label ?? "Section";
              return (
                <li className="editor-block" key={block.id}>
                  <div className="editor-block-heading">
                    <div className="editor-block-name">
                      <span className="editor-block-grip" aria-hidden="true">••</span>
                      <strong>{title}</strong>
                    </div>
                    <div className="editor-block-actions" aria-label={`${title} actions`}>
                      <button
                        aria-label={`Move ${title.toLowerCase()} up`}
                        className="editor-icon-button"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                        type="button"
                      >
                        <Icon name="arrow-up" />
                      </button>
                      <button
                        aria-label={`Move ${title.toLowerCase()} down`}
                        className="editor-icon-button"
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        type="button"
                      >
                        <Icon name="arrow-down" />
                      </button>
                      <button
                        aria-label={`Remove ${title.toLowerCase()}`}
                        className="editor-icon-button editor-remove-button"
                        onClick={() => removeBlock(block.id)}
                        type="button"
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  </div>
                  <div className="editor-block-body">{renderBlockFields(block)}</div>
                </li>
              );
            })}
          </ol>
        )}
        {menu && (
          <div
            aria-label="Add content section"
            className="editor-context-menu"
            ref={menuRef}
            role="menu"
            style={{ "--menu-x": `${menu.x}px`, "--menu-y": `${menu.y}px` } as CSSProperties}
            onKeyDown={(event) => {
              const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
              );
              const activeElement = document.activeElement;
              const current = activeElement instanceof HTMLButtonElement
                ? items.indexOf(activeElement)
                : -1;
              const nextIndex = items.length === 0 ? -1 :
                event.key === "ArrowDown" ? (current + 1 + items.length) % items.length :
                event.key === "ArrowUp" ? (current - 1 + items.length) % items.length :
                event.key === "Home" ? 0 :
                event.key === "End" ? items.length - 1 : -1;
              if (nextIndex >= 0 && items.length) {
                event.preventDefault();
                items[nextIndex]?.focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setMenu(null);
                menuReturnFocus.current?.focus();
              }
            }}
          >
            <span className="editor-menu-title">Insert section</span>
            {addMenuItems()}
          </div>
        )}
      </div>
    </section>
  );
}

function MediaLayoutFields({
  block,
  updateBlock,
}: {
  block: EditorialBlock;
  updateBlock: (id: string, patch: Partial<EditorialBlock>) => void;
}) {
  return (
    <>
      <label className="editor-field editor-field-compact">
        <span>Layout</span>
        <select
          onChange={(event) => updateBlock(block.id, {
            layout: event.target.value as BlockLayout,
            ...(event.target.value === "full" ? { text: "" } : {}),
          })}
          value={block.layout ?? "full"}
        >
          <option value="full">Media only</option>
          <option value="side-by-side">Media beside text</option>
        </select>
      </label>
      {block.layout === "side-by-side" && (
        <>
          <label className="editor-field editor-field-compact">
            <span>Media position</span>
            <select
              onChange={(event) => updateBlock(block.id, { mediaSide: event.target.value as MediaSide })}
              value={block.mediaSide ?? "left"}
            >
              <option value="left">Media on the left</option>
              <option value="right">Media on the right</option>
            </select>
          </label>
          <div className="editor-field editor-field-wide">
            <span>Paired text</span>
            <RichTextEditor
              label="Text beside media"
              onChange={(text) => updateBlock(block.id, { text })}
              value={block.text ?? ""}
            />
          </div>
        </>
      )}
    </>
  );
}

export function editorialBlocksToJson(blocks: EditorialBlock[]): string {
  return JSON.stringify(blocks.map((block) => {
    if (block.type === "heading") {
      return { type: block.type, text: block.text ?? "", level: block.level ?? 2 };
    }
    if (block.type === "image") {
      return { type: block.type, url: block.url ?? "", alt: block.alt ?? "" };
    }
    if (block.type === "link") {
      return { type: block.type, url: block.url ?? "", label: block.label ?? "" };
    }
    if (block.type === "quote") {
      return {
        type: block.type,
        text: block.text ?? "",
        ...(block.citation ? { citation: block.citation } : {}),
      };
    }
    if (block.type === "paragraph") {
      return { type: block.type, text: block.text ?? "" };
    }
    return Object.fromEntries(Object.entries(block).filter(([key]) => key !== "id"));
  }));
}

"use client";

import { Node, isNodeSelection, mergeAttributes } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImagePreview from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type MenuMode =
  | "blocks"
  | "format"
  | "image"
  | "video"
  | "image-text"
  | "video-text"
  | "link";
type ContextMenuState = { left: number; top: number; mode: MenuMode };
type HoveredBlock = {
  left: number;
  top: number;
  index: number;
  textFrom: number;
  textTo: number;
  kind: "text" | "image" | "video" | "callout" | "toc" | "other";
};
type VideoSource = { provider: "youtube" | "vimeo" | "hosted"; src: string };
type TocItem = { id: string; label: string };
type SchemaType = "BlogPosting" | "Article" | "NewsArticle";
type SchemaCopyStatus = "idle" | "copied" | "error";
type SelectedImage = { fileName: string; src: string };

const MAX_LOCAL_IMAGE_SIZE = 10 * 1024 * 1024;
const LOCAL_IMAGE_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);

const BlogVideo = Node.create({
  name: "blogVideo",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null, rendered: false },
      provider: { default: "hosted", rendered: false },
      title: { default: "Embedded video", rendered: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-blog-video]",
        getAttrs: (element) => {
          const figure = element as HTMLElement;
          const media = figure.querySelector("iframe, video");
          const src = media?.getAttribute("src") ?? media?.querySelector("source")?.getAttribute("src");
          if (!src) return false;
          return {
            src,
            provider: figure.getAttribute("data-provider") ?? "hosted",
            title: media?.getAttribute("title") ?? "Embedded video",
          };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const provider = node.attrs.provider as VideoSource["provider"];
    const title = node.attrs.title as string;
    const media =
      provider === "hosted"
        ? [
            "video",
            {
              src: node.attrs.src,
              controls: "",
              preload: "metadata",
              "aria-label": title,
            },
          ]
        : [
            "iframe",
            {
              src: node.attrs.src,
              title,
              loading: "lazy",
              tabindex: "-1",
              allowfullscreen: "true",
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            },
          ];
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-blog-video": "",
        "data-provider": provider,
      }),
      media,
    ];
  },
});

const BlogHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).id || null,
        renderHTML: (attributes) => (attributes.id ? { id: attributes.id } : {}),
      },
    };
  },
});

const BlogCallout = Node.create({
  name: "blogCallout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: "cream",
        parseHTML: (element) => (element as HTMLElement).getAttribute("data-tone") ?? "cream",
        renderHTML: (attributes) => ({ "data-tone": attributes.tone }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "aside[data-blog-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-blog-callout": "" }),
      ["div", { "data-callout-body": "" }, 0],
    ];
  },
});

const BlogMediaSlot = Node.create({
  name: "blogMediaSlot",
  content: "image | blogVideo",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-blog-media-slot]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-blog-media-slot": "" }), 0];
  },
});

const BlogTextSlot = Node.create({
  name: "blogTextSlot",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-blog-text-slot]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-blog-text-slot": "" }), 0];
  },
});

const BlogSideBySide = Node.create({
  name: "blogSideBySide",
  group: "block",
  content: "blogMediaSlot blogTextSlot",
  defining: true,
  addAttributes() {
    return {
      mediaPosition: {
        default: "left",
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-media-position") ?? "left",
        renderHTML: (attributes) => ({ "data-media-position": attributes.mediaPosition }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "section[data-blog-side-by-side]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-blog-side-by-side": "" }),
      0,
    ];
  },
});

const BlogTableOfContents = Node.create({
  name: "blogTableOfContents",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      items: {
        default: [],
        rendered: false,
        parseHTML: (element) => {
          const rawItems = (element as HTMLElement).getAttribute("data-toc-items");
          if (!rawItems) return [];
          try {
            const items: unknown = JSON.parse(rawItems);
            return Array.isArray(items)
              ? items.filter(
                  (item): item is TocItem =>
                    typeof item === "object" &&
                    item !== null &&
                    "id" in item &&
                    "label" in item &&
                    typeof item.id === "string" &&
                    typeof item.label === "string",
                )
              : [];
          } catch {
            return [];
          }
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "nav[data-blog-toc]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const items = node.attrs.items as TocItem[];
    return [
      "nav",
      mergeAttributes(HTMLAttributes, {
        "data-blog-toc": "",
        "data-toc-items": JSON.stringify(items),
        "aria-label": "Table of contents",
      }),
      ["strong", {}, "Contents"],
      items.length
        ? [
            "ol",
            {},
            ...items.map((item) => ["li", {}, ["a", { href: `#${item.id}` }, item.label]]),
          ]
        : ["p", {}, "Add headings to build the contents list."],
    ];
  },
});

function isSafeEditorUrl(value: string): boolean {
  return (
    (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) ||
    value.startsWith("https://")
  );
}

function getVideoSource(value: string): VideoSource | null {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return { provider: "hosted", src: value };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtu.be" || hostname === "youtube.com" || hostname === "m.youtube.com") {
    const id =
      hostname === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1);
    return id && /^[\w-]{11}$/.test(id)
      ? { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    return id && /^\d+$/.test(id)
      ? { provider: "vimeo", src: `https://player.vimeo.com/video/${id}` }
      : null;
  }
  return { provider: "hosted", src: url.href };
}

function VideoUrlPreview({ source, title }: { source: VideoSource; title: string }) {
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  return (
    <div aria-label="Video preview" className="blog-video-url-preview" role="group">
      {source.provider === "hosted" ? (
        <video
          aria-label={title}
          controls
          onError={() => setHasPlaybackError(true)}
          playsInline
          preload="metadata"
          src={source.src}
        />
      ) : (
        <iframe
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          src={source.src}
          title={title}
        />
      )}
      {hasPlaybackError && (
        <p role="status">This video could not be previewed. Check that the URL points to a playable video.</p>
      )}
    </div>
  );
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    back: <><path d="m14 18-6-6 6-6" /><path d="M20 12H8" /></>,
    save: <><path d="M5 3h12l4 4v14H3V3h2Z" /><path d="M7 3v6h10V3M7 21v-8h10v8" /></>,
    bold: <><path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" /></>,
    italic: <><path d="M19 4h-9M14 20H5M15 4 9 20" /></>,
    heading: <><path d="M5 5v14M19 5v14M5 12h14" /></>,
    link: <><path d="m9 15 6-6m-8 9H5a4 4 0 0 1 0-8h4m6-4h4a4 4 0 0 1 0 8h-4" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
    video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></>,
    quote: <><path d="M5 6h14M5 12h10M5 18h14M3 3v18" /></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></>,
    side: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M12 4v16M6 8h3m-3 4h3m-3 4h3m6-8h3m-3 4h3m-3 4h3" /></>,
    contents: <><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" /></>,
    box: <><path d="M4 5h16v14H4zM8 9h8M8 13h5" /></>,
    up: <><path d="m6 14 6-6 6 6" /></>,
    down: <><path d="m6 10 6 6 6-6" /></>,
    remove: <><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  };
  return (
    <svg aria-hidden="true" className="blog-editor-icon" fill="none" viewBox="0 0 24 24">
      {paths[name] ?? null}
    </svg>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="blog-editor-tool"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon name={icon} />
    </button>
  );
}

export function BlogPostEditor({ postId }: { postId?: string }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogUrl, setOgUrl] = useState("");
  const [ogSiteName, setOgSiteName] = useState("");
  const [twitterCard, setTwitterCard] = useState<"summary" | "summary_large_image">("summary_large_image");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [twitterImage, setTwitterImage] = useState("");
  const [twitterSite, setTwitterSite] = useState("");
  const [schemaType, setSchemaType] = useState<SchemaType>("BlogPosting");
  const [schemaCopyStatus, setSchemaCopyStatus] = useState<SchemaCopyStatus>("idle");
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [mediaPosition, setMediaPosition] = useState<"left" | "right">("left");
  const [linkUrl, setLinkUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toolbarDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localImageUrlsRef = useRef(new Set<string>());
  const pendingMediaFocusRef = useRef<number | null>(null);
  const popupDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const schemaHeadline = seoTitle || title;
  const schemaKeywords = keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  const schemaMarkup = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": schemaType,
      ...(schemaHeadline ? { headline: schemaHeadline } : {}),
      ...(description ? { description } : {}),
      ...(schemaKeywords.length ? { keywords: schemaKeywords } : {}),
      ...(ogImage ? { image: ogImage } : {}),
      ...(ogUrl ? { mainEntityOfPage: ogUrl } : {}),
    },
    null,
    2,
  );
  const videoPreviewSource =
    menu?.mode === "video" || menu?.mode === "video-text"
      ? getVideoSource(mediaUrl.trim())
      : null;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, link: false, underline: false }),
      BlogHeading,
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" },
        isAllowedUri: (url, { defaultValidate }) =>
          isSafeEditorUrl(url) && (url.startsWith("/") || defaultValidate(url)),
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Image.configure({ allowBase64: false }),
      TableKit,
      BlogVideo,
      BlogMediaSlot,
      BlogTextSlot,
      BlogSideBySide,
      BlogCallout,
      BlogTableOfContents,
      Placeholder.configure({ placeholder: "Start writing. Press Enter to begin a new paragraph…" }),
    ],
    editorProps: {
      attributes: {
        "aria-label": "Blog post content",
        class: "blog-post-prosemirror",
        spellcheck: "true",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Escape") {
          setMenu(null);
          return false;
        }
        const selection = view.state.selection;
        if (
          event.key === "Enter" &&
          isNodeSelection(selection) &&
          (selection.node.type.name === "blogVideo" || selection.node.type.name === "image")
        ) {
          const document = view.state.doc;
          let nextTextblockPosition: number | null = null;
          document.descendants((node, position) => {
            if (node.isTextblock && position >= selection.to) {
              nextTextblockPosition = position;
              return false;
            }
          });
          if (nextTextblockPosition !== null) {
            event.preventDefault();
            editor?.commands.setTextSelection(nextTextblockPosition + 1);
            editor?.view.focus();
            return true;
          }
        }
        if (
          (event.key === "F10" && event.shiftKey) ||
          (event.key === "/" &&
            view.state.selection.empty &&
            view.state.selection.$from.parent.textContent.trim() === "")
        ) {
          if (event.key === "/") event.preventDefault();
          const rect = view.coordsAtPos(view.state.selection.from);
          setMenu({
            left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
            top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 350)),
            mode: view.state.selection.empty ? "blocks" : "format",
          });
            return true;
        }
        return false;
      },
    },
  });

  const discardSelectedImage = useCallback(() => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.src);
      localImageUrlsRef.current.delete(selectedImage.src);
    }
    const fileInput = menuRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) fileInput.value = "";
    setSelectedImage(null);
  }, [selectedImage]);

  async function copySchemaMarkup() {
    try {
      await navigator.clipboard.writeText(schemaMarkup);
      setSchemaCopyStatus("copied");
    } catch {
      setSchemaCopyStatus("error");
    }
  }

  const menuOpen = menu !== null;
  const menuMode = menu?.mode;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (!(event.target instanceof globalThis.Node) || !menuRef.current?.contains(event.target)) {
        setMenu(null);
        discardSelectedImage();
        setMediaUrl("");
        setFormError(null);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        discardSelectedImage();
        setMediaUrl("");
        setFormError(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const firstInput = menuRef.current?.querySelector<HTMLInputElement>("input");
    if (firstInput) firstInput.focus();
    else menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [discardSelectedImage, menuMode, menuOpen]);

  useEffect(() => {
    const position = pendingMediaFocusRef.current;
    if (!editor || menu || position === null) return;
    const timeout = window.setTimeout(() => {
      if (editor.isDestroyed) {
        pendingMediaFocusRef.current = null;
        return;
      }
      editor.commands.setTextSelection(position);
      editor.view.focus();
      if (pendingMediaFocusRef.current === position) pendingMediaFocusRef.current = null;
    });
    return () => window.clearTimeout(timeout);
  }, [editor, menu]);

  useEffect(
    () => () => {
      if (toolbarDismissTimerRef.current) clearTimeout(toolbarDismissTimerRef.current);
    },
    [],
  );

  useEffect(
    () => () => {
      for (const imageUrl of localImageUrlsRef.current) URL.revokeObjectURL(imageUrl);
    },
    [],
  );

  function cancelToolbarDismiss() {
    if (!toolbarDismissTimerRef.current) return;
    clearTimeout(toolbarDismissTimerRef.current);
    toolbarDismissTimerRef.current = null;
  }

  function scheduleToolbarDismiss() {
    cancelToolbarDismiss();
    toolbarDismissTimerRef.current = setTimeout(() => {
      setHoveredBlock(null);
      toolbarDismissTimerRef.current = null;
    }, 500);
  }

  function openContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (!editor) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".ProseMirror")) return;
    event.preventDefault();
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " ",
    );
    setFormError(null);
    setMenu({
      left: Math.max(12, Math.min(event.clientX, window.innerWidth - 332)),
      top: Math.max(12, Math.min(event.clientY, window.innerHeight - 350)),
      mode: selectedText.trim() ? "format" : "blocks",
    });
  }

  const movePopupTo = useCallback((left: number, top: number) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const popupBounds = menuRef.current?.getBoundingClientRect();
    if (!canvasBounds || !popupBounds) return;

    const minLeft = Math.max(8, canvasBounds.left) + 8;
    const maxLeft = Math.max(
      minLeft,
      Math.min(window.innerWidth, canvasBounds.right) - popupBounds.width - 8,
    );
    const minTop = Math.max(8, canvasBounds.top) + 8;
    const maxTop = Math.max(
      minTop,
      Math.min(window.innerHeight, canvasBounds.bottom) - popupBounds.height - 8,
    );
    const position = {
      left: Math.min(maxLeft, Math.max(minLeft, left)),
      top: Math.min(maxTop, Math.max(minTop, top)),
    };
    setMenu((current) =>
      current && (current.left !== position.left || current.top !== position.top)
        ? { ...current, ...position }
        : current,
    );
  }, []);

  function startPopupDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!menu) return;
    event.preventDefault();
    popupDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: menu.left,
      startTop: menu.top,
    };
  }

  useEffect(() => {
    const movePopupDrag = (event: globalThis.PointerEvent) => {
      const drag = popupDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      movePopupTo(
        drag.startLeft + event.clientX - drag.startX,
        drag.startTop + event.clientY - drag.startY,
      );
    };
    const stopPopupDrag = (event: globalThis.PointerEvent) => {
      if (popupDragRef.current?.pointerId === event.pointerId) popupDragRef.current = null;
    };
    window.addEventListener("pointermove", movePopupDrag);
    window.addEventListener("pointerup", stopPopupDrag);
    window.addEventListener("pointercancel", stopPopupDrag);
    return () => {
      window.removeEventListener("pointermove", movePopupDrag);
      window.removeEventListener("pointerup", stopPopupDrag);
      window.removeEventListener("pointercancel", stopPopupDrag);
    };
  }, [movePopupTo]);

  function movePopupWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!menu) return;
    const step = event.shiftKey ? 32 : 12;
    const offset =
      event.key === "ArrowLeft"
        ? [-step, 0]
        : event.key === "ArrowRight"
          ? [step, 0]
          : event.key === "ArrowUp"
            ? [0, -step]
            : event.key === "ArrowDown"
              ? [0, step]
              : null;
    if (!offset) return;
    event.preventDefault();
    movePopupTo(menu.left + offset[0], menu.top + offset[1]);
  }

  function openHoveredVideo() {
    if (!editor || !hoveredBlock) return;
    const block = editor.state.doc.child(hoveredBlock.index);
    const videos: VideoSource[] = [];
    const readVideo = (node: typeof block) => {
      if (
        node.type.name === "blogVideo" &&
        typeof node.attrs.src === "string" &&
        (node.attrs.provider === "youtube" ||
          node.attrs.provider === "vimeo" ||
          node.attrs.provider === "hosted")
      ) {
        videos.push({ provider: node.attrs.provider, src: node.attrs.src });
      }
    };
    readVideo(block);
    if (videos.length === 0) block.descendants(readVideo);
    const video = videos[0];
    if (!video) return;
    const videoUrl =
      video.provider === "youtube"
        ? `https://www.youtube.com/watch?v=${video.src.split("/").at(-1)}`
        : video.provider === "vimeo"
          ? `https://vimeo.com/${video.src.split("/").filter(Boolean).at(-1)}`
          : video.src;
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  }

  function trackHoveredBlock(event: MouseEvent<HTMLDivElement>) {
    if (!editor || !canvasRef.current) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".blog-editor-hover-tools")) {
      cancelToolbarDismiss();
      return;
    }
    const block = target.closest<HTMLElement>(
      "[data-blog-video], [data-blog-callout], [data-blog-toc], [data-blog-side-by-side] img, [data-blog-side-by-side] [data-blog-video], [data-blog-text-slot] p, [data-blog-text-slot] h1, [data-blog-text-slot] h2, [data-blog-text-slot] h3, .blog-post-prosemirror p, .blog-post-prosemirror h1, .blog-post-prosemirror h2, .blog-post-prosemirror h3, .blog-post-prosemirror > blockquote, .blog-post-prosemirror > pre, .blog-post-prosemirror > ul, .blog-post-prosemirror > ol, .blog-post-prosemirror > img, .blog-post-prosemirror > table",
    );
    if (!block || !canvasRef.current.contains(block)) {
      scheduleToolbarDismiss();
      return;
    }
    const topLevelBlock = block.closest<HTMLElement>(".blog-post-prosemirror > *");
    if (!topLevelBlock) {
      scheduleToolbarDismiss();
      return;
    }
    cancelToolbarDismiss();
    const blockRect = block.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const domPosition = editor.view.posAtDOM(block, 0);
    const resolvedPosition = editor.state.doc.resolve(domPosition);
    const index = Array.from(editor.view.dom.children).indexOf(topLevelBlock);
    if (index < 0) {
      scheduleToolbarDismiss();
      return;
    }
    const kind: HoveredBlock["kind"] = block.matches("[data-blog-video]")
      ? "video"
      : block.matches("img")
        ? "image"
        : block.matches("[data-blog-callout]")
          ? "callout"
          : block.matches("[data-blog-toc]")
            ? "toc"
            : block.matches("p, h1, h2, h3") ||
                Boolean(block.closest("[data-blog-callout]"))
              ? "text"
              : "other";
    const textFrom = resolvedPosition.parent.type.isTextblock
      ? domPosition - resolvedPosition.parentOffset
      : domPosition;
    setHoveredBlock({
      left: Math.max(12, Math.min(blockRect.left - canvasRect.left, canvasRect.width - 220)),
      top: Math.max(8, blockRect.top - canvasRect.top - 42),
      index,
      textFrom,
      textTo: textFrom + resolvedPosition.parent.content.size,
      kind,
    });
  }

  function focusHoveredText() {
    if (!editor || !hoveredBlock) return null;
    const { from, to } = editor.state.selection;
    const selectionIsInHoveredText =
      !editor.state.selection.empty &&
      from >= hoveredBlock.textFrom &&
      to <= hoveredBlock.textTo;
    const chain = editor.chain().focus();
    return selectionIsInHoveredText
      ? chain
      : chain.setTextSelection(hoveredBlock.textFrom);
  }

  function focusAfterMedia(
    type: "image" | "blogVideo",
    src: string,
    insertionPosition: number,
  ): number | undefined {
    if (!editor) return;
    let mediaPosition: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== type || node.attrs.src !== src) return;
      const distance = Math.abs(position - insertionPosition);
      if (distance < nearestDistance) {
        mediaPosition = position;
        nearestDistance = distance;
      }
    });
    if (mediaPosition === null) return;

    const afterMediaPosition = mediaPosition + 1;
    let nextTextblockPosition: number | null = null;
    editor.state.doc.descendants((node, position) => {
      if (node.isTextblock && position >= afterMediaPosition) {
        nextTextblockPosition = position;
        return false;
      }
    });
    if (nextTextblockPosition !== null) {
      return nextTextblockPosition + 1;
    }
  }

  function performMediaInsert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    let focusPosition: number | undefined;
    setFormError(null);
    const isImage = menu?.mode === "image" || menu?.mode === "image-text";
    const isSideBySide = menu?.mode === "image-text" || menu?.mode === "video-text";
    if (isImage) {
      const imageSrc = selectedImage?.src ?? mediaUrl.trim();
      if (!selectedImage && !isSafeEditorUrl(imageSrc)) {
        setFormError("Choose an image from your device or enter a secure image URL.");
        return;
      }
      const mediaNode = {
        type: "image",
        attrs: { src: imageSrc, alt: mediaAlt.trim() },
      };
      const insertionPosition = editor.state.selection.from;
      if (isSideBySide) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "blogSideBySide",
            attrs: { mediaPosition },
            content: [
              { type: "blogMediaSlot", content: [mediaNode] },
              { type: "blogTextSlot", content: [{ type: "paragraph" }] },
            ],
          })
          .run();
      } else {
        editor.chain().focus().setImage({ src: imageSrc, alt: mediaAlt.trim() }).run();
      }
      focusPosition = focusAfterMedia("image", imageSrc, insertionPosition);
    } else if (menu?.mode === "video" || menu?.mode === "video-text") {
      const source = getVideoSource(mediaUrl.trim());
      if (!source) {
        setFormError("Enter a valid YouTube, Vimeo, or secure video URL.");
        return;
      }
      const insertionPosition = editor.state.selection.from;
      const mediaNode = {
        type: "blogVideo",
        attrs: { ...source, title: mediaAlt.trim() || "Embedded school video" },
      };
      editor
        .chain()
        .focus()
        .insertContent(
          isSideBySide
            ? {
                type: "blogSideBySide",
                attrs: { mediaPosition },
                content: [
                  { type: "blogMediaSlot", content: [mediaNode] },
                  { type: "blogTextSlot", content: [{ type: "paragraph" }] },
                ],
              }
            : mediaNode,
        )
        .run();
      focusPosition = focusAfterMedia("blogVideo", source.src, insertionPosition);
    } else if (menu?.mode === "link") {
      if (!isSafeEditorUrl(linkUrl.trim())) {
        setFormError("Use a secure web address or a path on this website.");
        return;
      }
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setMediaUrl("");
    setMediaAlt("");
    setSelectedImage(null);
    setMediaPosition("left");
    setLinkUrl("");
    if (focusPosition !== undefined) pendingMediaFocusRef.current = focusPosition;
    setMenu(null);
    if (focusPosition === undefined) window.setTimeout(() => editor.view.focus(), 0);
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormError(null);
    if (!LOCAL_IMAGE_TYPES.has(file.type)) {
      setFormError("Choose a PNG, JPEG, WebP, GIF, or AVIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOCAL_IMAGE_SIZE) {
      setFormError("Choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }
    discardSelectedImage();
    const src = URL.createObjectURL(file);
    localImageUrlsRef.current.add(src);
    setSelectedImage({ fileName: file.name, src });
  }

  function insertCallout() {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "blogCallout",
        attrs: { tone: "cream" },
        content: [{ type: "paragraph" }],
      })
      .run();
    setMenu(null);
  }

  function insertTableOfContents() {
    if (!editor) return;
    const items: TocItem[] = [];
    const transaction = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        const label = node.textContent.trim();
        if (label) {
          const baseId = slugify(label) || `section-${items.length + 1}`;
          let id = baseId;
          let suffix = 2;
          while (items.some((item) => item.id === id)) {
            id = `${baseId}-${suffix}`;
            suffix += 1;
          }
          items.push({ id, label });
          if (node.attrs.id !== id) {
            transaction.setNodeMarkup(position, undefined, { ...node.attrs, id });
          }
        }
      }
    });
    if (transaction.docChanged) editor.view.dispatch(transaction);
    editor.chain().focus().insertContent({ type: "blogTableOfContents", attrs: { items } }).run();
    setMenu(null);
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setMenu(null);
  }

  function moveHoveredBlock(direction: -1 | 1) {
    if (!editor || !hoveredBlock) return;
    const { doc } = editor.state;
    const fromIndex = hoveredBlock.index;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= doc.childCount) return;
    const documentJson = editor.getJSON();
    const nodes = documentJson.content ?? [];
    [nodes[fromIndex], nodes[toIndex]] = [nodes[toIndex], nodes[fromIndex]];
    editor.commands.setContent({ ...documentJson, content: nodes });
    setHoveredBlock(null);
  }

  function removeHoveredBlock() {
    if (!editor || !hoveredBlock) return;
    const { doc } = editor.state;
    const fromIndex = hoveredBlock.index;
    const from = Array.from({ length: fromIndex }, (_, index) => doc.child(index).nodeSize).reduce(
      (sum, size) => sum + size,
      0,
    );
    editor.view.dispatch(editor.state.tr.delete(from, from + doc.child(fromIndex).nodeSize));
    setHoveredBlock(null);
  }

  function toggleCalloutTone() {
    if (!editor || !hoveredBlock) return;
    const node = editor.state.doc.child(hoveredBlock.index);
    if (node.type.name !== "blogCallout") return;
    const tone = node.attrs.tone === "cream" ? "rose" : node.attrs.tone === "rose" ? "sage" : "cream";
    const from = Array.from({ length: hoveredBlock.index }, (_, index) =>
      editor.state.doc.child(index).nodeSize,
    ).reduce((sum, size) => sum + size, 0);
    editor.view.dispatch(editor.state.tr.setNodeMarkup(from, undefined, { ...node.attrs, tone }));
  }

  function toggleMediaPosition() {
    if (!editor || !hoveredBlock) return;
    const node = editor.state.doc.child(hoveredBlock.index);
    if (node.type.name !== "blogSideBySide") return;
    const from = Array.from({ length: hoveredBlock.index }, (_, index) =>
      editor.state.doc.child(index).nodeSize,
    ).reduce((sum, size) => sum + size, 0);
    const mediaPosition = node.attrs.mediaPosition === "left" ? "right" : "left";
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(from, undefined, { ...node.attrs, mediaPosition }),
    );
  }

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  const hoveredBlockNode =
    editor && hoveredBlock ? editor.state.doc.child(hoveredBlock.index) : null;
  const hoveredVideoSources: VideoSource[] = [];
  if (hoveredBlockNode) {
    const readVideo = (node: typeof hoveredBlockNode) => {
      if (
        node?.type.name === "blogVideo" &&
        typeof node.attrs.src === "string" &&
        (node.attrs.provider === "youtube" ||
          node.attrs.provider === "vimeo" ||
          node.attrs.provider === "hosted")
      ) {
        hoveredVideoSources.push({ provider: node.attrs.provider, src: node.attrs.src });
      }
    };
    readVideo(hoveredBlockNode);
    if (hoveredVideoSources.length === 0) hoveredBlockNode.descendants(readVideo);
  }
  const hoveredVideoSource = hoveredVideoSources[0] ?? null;

  return (
    <main className="blog-editor-page">
      <div className="blog-editor-layout">
        <section className="blog-editor-workspace" aria-label="Blog post editor">
          <div className="blog-editor-post-header">
            <label className="blog-editor-title-field">
              <span className="sr-only">Blog post title</span>
              <input
                autoComplete="off"
                maxLength={120}
                onChange={(event) => updateTitle(event.target.value)}
                placeholder="Add a title"
                value={title}
              />
            </label>
          </div>

          <div
            className="blog-editor-canvas"
            onContextMenuCapture={openContextMenu}
            onMouseLeave={scheduleToolbarDismiss}
            onMouseMove={trackHoveredBlock}
            ref={canvasRef}
          >
            {hoveredBlock && editor && (
              <div
                aria-label="Block tools"
                className="blog-editor-hover-tools"
                onMouseEnter={cancelToolbarDismiss}
                onMouseLeave={scheduleToolbarDismiss}
                role="toolbar"
                style={{ left: hoveredBlock.left, top: hoveredBlock.top }}
              >
                {hoveredVideoSource && (
                  <ToolbarButton
                    icon="video"
                    label="Open video in a new tab"
                    onClick={openHoveredVideo}
                  />
                )}
                {hoveredBlock.kind === "text" && (
                  <>
                    <ToolbarButton
                      icon="bold"
                      label="Bold"
                      onClick={() => focusHoveredText()?.toggleBold().run()}
                    />
                    <ToolbarButton
                      icon="italic"
                      label="Italic"
                      onClick={() => focusHoveredText()?.toggleItalic().run()}
                    />
                    <ToolbarButton
                      icon="heading"
                      label="Toggle heading"
                      onClick={() => focusHoveredText()?.toggleHeading({ level: 2 }).run()}
                    />
                    <ToolbarButton
                      icon="quote"
                      label="Toggle quote"
                      onClick={() => focusHoveredText()?.toggleBlockquote().run()}
                    />
                  </>
                )}
                <ToolbarButton icon="up" label="Move block up" onClick={() => moveHoveredBlock(-1)} />
                <ToolbarButton icon="down" label="Move block down" onClick={() => moveHoveredBlock(1)} />
                {editor.state.doc.child(hoveredBlock.index)?.type.name === "blogCallout" && (
                  <ToolbarButton icon="box" label="Change callout background" onClick={toggleCalloutTone} />
                )}
                {editor.state.doc.child(hoveredBlock.index)?.type.name === "blogSideBySide" && (
                  <ToolbarButton icon="side" label="Move media to the other side" onClick={toggleMediaPosition} />
                )}
                <ToolbarButton icon="remove" label="Remove block" onClick={removeHoveredBlock} />
              </div>
            )}
            <EditorContent editor={editor} />
          </div>

          <div className="blog-editor-footnote">
            <span className="blog-editor-key">↵</span>
            <span>Press Enter to continue in a new paragraph</span>
            <span className="blog-editor-footnote-divider" />
            <span>Right-click or type / for block tools</span>
          </div>

          <div className="blog-editor-api-notice" role="note">
            <Icon name="info" />
            <span>
              {postId
                ? "This is an editor preview. Blog content is not connected to the API, so changes cannot be saved."
                : "This is an editor preview. Blog content is not connected to the API, so this post cannot be saved."}
            </span>
          </div>
        </section>

        <aside className="blog-seo-panel" aria-labelledby="blog-seo-title">
          <div className="blog-seo-heading">
            <div className="blog-context-actions">
              <h2 id="blog-seo-title">SEO</h2>
              <p>Preview how this post may appear in search.</p>
            </div>
            <span className="blog-seo-icon"><Icon name="contents" /></span>
          </div>
          <div className="blog-search-preview">
            <span className="blog-search-preview-label">Search preview</span>
            <strong>{seoTitle || title || "Post title"}</strong>
            <span>school.example/blog/{slug || "post-title"}</span>
            <p>{description || "Your meta description will appear here."}</p>
          </div>
          <label className="blog-seo-field">
            <span>SEO title</span>
            <input
              maxLength={70}
              onChange={(event) => setSeoTitle(event.target.value)}
              placeholder="Post title"
              value={seoTitle}
            />
            <small>{seoTitle.length}/60 characters recommended</small>
          </label>
          <label className="blog-seo-field">
            <span>Meta description</span>
            <textarea
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe this post for search results"
              rows={4}
              value={description}
            />
            <small>{description.length}/160 characters recommended</small>
          </label>
          <label className="blog-seo-field">
            <span>URL slug</span>
            <div className="blog-seo-slug">
              <span>/blog/</span>
              <input
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="post-title"
                value={slug}
              />
            </div>
          </label>
          <label className="blog-seo-field">
            <span>Meta keywords</span>
            <input
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="school news, learning, community"
              value={keywords}
            />
            <small>Separate keywords with commas.</small>
          </label>
          <details className="blog-seo-group">
            <summary>Open Graph tags</summary>
            <label className="blog-seo-field">
              <span>og:title</span>
              <input
                onChange={(event) => setOgTitle(event.target.value)}
                placeholder={seoTitle || title || "Post title"}
                value={ogTitle}
              />
            </label>
            <label className="blog-seo-field">
              <span>og:description</span>
              <textarea
                onChange={(event) => setOgDescription(event.target.value)}
                placeholder={description || "Description for social sharing"}
                rows={3}
                value={ogDescription}
              />
            </label>
            <label className="blog-seo-field">
              <span>og:image URL</span>
              <input
                onChange={(event) => setOgImage(event.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
                value={ogImage}
              />
            </label>
            <label className="blog-seo-field">
              <span>og:url</span>
              <input
                onChange={(event) => setOgUrl(event.target.value)}
                placeholder="https://example.com/blog/post"
                type="url"
                value={ogUrl}
              />
            </label>
            <label className="blog-seo-field">
              <span>og:site_name</span>
              <input
                onChange={(event) => setOgSiteName(event.target.value)}
                placeholder="School name"
                value={ogSiteName}
              />
            </label>
            <p className="blog-seo-hint">og:type is set to article for blog posts.</p>
          </details>
          <details className="blog-seo-group">
            <summary>Twitter tags</summary>
            <label className="blog-seo-field">
              <span>Card type</span>
              <select
                onChange={(event) =>
                  setTwitterCard(event.target.value === "summary" ? "summary" : "summary_large_image")
                }
                value={twitterCard}
              >
                <option value="summary_large_image">Summary with large image</option>
                <option value="summary">Summary</option>
              </select>
            </label>
            <label className="blog-seo-field">
              <span>twitter:title</span>
              <input
                onChange={(event) => setTwitterTitle(event.target.value)}
                placeholder={seoTitle || title || "Post title"}
                value={twitterTitle}
              />
            </label>
            <label className="blog-seo-field">
              <span>twitter:description</span>
              <textarea
                onChange={(event) => setTwitterDescription(event.target.value)}
                placeholder={description || "Description for Twitter"}
                rows={3}
                value={twitterDescription}
              />
            </label>
            <label className="blog-seo-field">
              <span>twitter:image URL</span>
              <input
                onChange={(event) => setTwitterImage(event.target.value)}
                placeholder={ogImage || "https://example.com/image.jpg"}
                type="url"
                value={twitterImage}
              />
            </label>
            <label className="blog-seo-field">
              <span>twitter:site</span>
              <input
                onChange={(event) => setTwitterSite(event.target.value)}
                placeholder="@schoolhandle"
                value={twitterSite}
              />
            </label>
          </details>
          <details className="blog-seo-group" open>
            <summary>Schema generation</summary>
            <label className="blog-seo-field">
              <span>Structured data type</span>
              <select
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "BlogPosting" || value === "Article" || value === "NewsArticle") {
                    setSchemaType(value);
                  }
                }}
                value={schemaType}
              >
                <option value="BlogPosting">Blog posting</option>
                <option value="Article">Article</option>
                <option value="NewsArticle">News article</option>
              </select>
            </label>
            <div className="blog-schema-output">
              <div className="blog-schema-toolbar">
                <span>Generated JSON-LD</span>
                <button onClick={copySchemaMarkup} type="button">Copy JSON</button>
              </div>
              <pre aria-label="Generated structured data" tabIndex={0}>{schemaMarkup}</pre>
              <p aria-live="polite" className="blog-schema-status">
                {schemaCopyStatus === "copied"
                  ? "Schema copied to clipboard."
                  : schemaCopyStatus === "error"
                    ? "Could not access the clipboard. Select and copy the JSON directly."
                    : "Generated from the SEO fields above. Changes are not saved to the API."}
              </p>
            </div>
          </details>
        </aside>
      </div>

      {menu && (
        <div
          aria-label={
            menu.mode === "format"
              ? "Text formatting"
              : menu.mode === "blocks"
                ? "Insert content block"
                : `Insert ${menu.mode.replace("-", " ")}`
          }
          className="blog-editor-context-menu"
          ref={menuRef}
          role={
            menu.mode === "image" ||
            menu.mode === "video" ||
            menu.mode === "image-text" ||
            menu.mode === "video-text" ||
            menu.mode === "link"
              ? "dialog"
              : "group"
          }
          style={{ left: menu.left, top: menu.top }}
        >
          {menu.mode === "blocks" && (
            <>
              <span className="blog-context-title">Insert at cursor</span>
              <button onClick={() => setMenu({ ...menu, mode: "image" })} type="button"><Icon name="image" /> Image</button>
              <button onClick={() => setMenu({ ...menu, mode: "video" })} type="button"><Icon name="video" /> Video</button>
              <button onClick={() => setMenu({ ...menu, mode: "image-text" })} type="button"><Icon name="image" /> Image with text</button>
              <button onClick={() => setMenu({ ...menu, mode: "video-text" })} type="button"><Icon name="video" /> Video with text</button>
              <button onClick={insertTable} type="button"><Icon name="table" /> Table</button>
              <button onClick={insertTableOfContents} type="button"><Icon name="contents" /> Table of contents</button>
              <button onClick={insertCallout} type="button"><Icon name="box" /> Highlighted text box</button>
              <button onClick={() => setMenu({ ...menu, mode: "link" })} type="button"><Icon name="link" /> Add link</button>
            </>
          )}
          {menu.mode === "format" && editor && (
            <>
              <span className="blog-context-title">Format selection</span>
              <button onClick={() => { editor.chain().focus().toggleBold().run(); setMenu(null); }} type="button"><Icon name="bold" /> Bold</button>
              <button onClick={() => { editor.chain().focus().toggleItalic().run(); setMenu(null); }} type="button"><Icon name="italic" /> Italic</button>
              <button onClick={() => { editor.chain().focus().toggleUnderline().run(); setMenu(null); }} type="button"><span className="blog-context-underline">U</span> Underline</button>
              <button onClick={() => setMenu({ ...menu, mode: "link" })} type="button"><Icon name="link" /> Add link</button>
            </>
          )}
          {(menu.mode === "image" ||
            menu.mode === "video" ||
            menu.mode === "image-text" ||
            menu.mode === "video-text") && (
            <form className="blog-context-form" onSubmit={performMediaInsert}>
              <div
                aria-label="Move popup"
                className="blog-context-drag-handle"
                onKeyDown={movePopupWithKeyboard}
                onPointerDown={startPopupDrag}
                role="group"
                tabIndex={0}
                title="Drag to move; use the arrow keys to reposition"
              >
                <strong>
                  {menu.mode.startsWith("image")
                    ? menu.mode === "image" ? "Insert image" : "Image with text"
                    : menu.mode === "video" ? "Insert video" : "Video with text"}
                </strong>
              </div>
              <label>
                <span>{menu.mode.startsWith("image") ? "Image URL (optional)" : "Video URL"}</span>
                <input
                  autoFocus
                  onChange={(event) => {
                    setMediaUrl(event.target.value);
                    if (event.target.value) discardSelectedImage();
                  }}
                  placeholder={menu.mode.startsWith("image") ? "https://…" : "YouTube, Vimeo or video URL"}
                  required={!menu.mode.startsWith("image")}
                  value={mediaUrl}
                />
              </label>
              {videoPreviewSource && (
                <VideoUrlPreview
                  key={videoPreviewSource.src}
                  source={videoPreviewSource}
                  title={mediaAlt.trim() || "Video URL preview"}
                />
              )}
              {menu.mode.startsWith("image") && (
                <>
                  <div className="blog-image-upload">
                    <span>Or browse for an image from your device</span>
                    <label className="blog-image-file-picker" htmlFor="blog-image-file">
                      <span className="blog-image-browse-button">Browse...</span>
                      <span className="blog-image-file-name">
                        {selectedImage?.fileName ?? "No file selected"}
                      </span>
                    </label>
                    <input
                      accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                      aria-label="Choose image file"
                      className="blog-image-file-input"
                      id="blog-image-file"
                      onChange={handleImageFileChange}
                      type="file"
                    />
                    <small>PNG, JPEG, WebP, GIF or AVIF. Maximum 10 MB.</small>
                  </div>
                  {selectedImage && (
                    <div
                      className="blog-image-preview-selection"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr)",
                        width: "100%",
                      }}
                    >
                      <div className="blog-image-preview-frame">
                        <ImagePreview
                          alt={`Preview of ${selectedImage.fileName}`}
                          className="blog-image-selection-preview"
                          height={148}
                          unoptimized
                          src={selectedImage.src}
                          width={320}
                        />
                        <button
                          aria-label={`Remove selected image ${selectedImage.fileName}`}
                          className="blog-image-remove"
                          onClick={discardSelectedImage}
                          onMouseDown={(event) => event.preventDefault()}
                          title="Remove image"
                          type="button"
                        >
                          <Icon name="remove" />
                        </button>
                      </div>
                      <span
                        className="blog-image-preview-name"
                        style={{ display: "block", width: "100%", whiteSpace: "normal" }}
                        title={selectedImage.fileName}
                      >
                        {selectedImage.fileName}
                      </span>
                    </div>
                  )}
                  <p className="blog-image-upload-note">
                    The selected image is only used in this editor preview. It is not uploaded or saved to the API.
                  </p>
                </>
              )}
              <label>
                <span>{menu.mode.startsWith("image") ? "Alternative text" : "Accessible title"}</span>
                <input
                  onChange={(event) => setMediaAlt(event.target.value)}
                  placeholder={menu.mode.startsWith("image") ? "Describe the image" : "Describe the video"}
                  value={mediaAlt}
                />
              </label>
              {(menu.mode === "image-text" || menu.mode === "video-text") && (
                <label>
                  <span>Media position</span>
                  <select
                    onChange={(event) => setMediaPosition(event.target.value as "left" | "right")}
                    value={mediaPosition}
                  >
                    <option value="left">Media on the left</option>
                    <option value="right">Media on the right</option>
                  </select>
                </label>
              )}
              {formError && <p className="blog-context-error" role="alert">{formError}</p>}
              <div className="blog-context-actions">
                <button
                  className="blog-context-cancel"
                  onClick={() => {
                    setMenu(null);
                    discardSelectedImage();
                    setMediaUrl("");
                    setFormError(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button className="blog-context-submit" type="submit">Insert</button>
              </div>
            </form>
          )}
          {menu.mode === "link" && (
            <form className="blog-context-form" onSubmit={performMediaInsert}>
              <strong>Add link</strong>
              <label>
                <span>Web address</span>
                <input
                  autoFocus
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://…"
                  required
                  value={linkUrl}
                />
              </label>
              {formError && <p className="blog-context-error" role="alert">{formError}</p>}
              <div>
                <button className="blog-context-cancel" onClick={() => setMenu(null)} type="button">Cancel</button>
                <button className="blog-context-submit" type="submit">Apply</button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

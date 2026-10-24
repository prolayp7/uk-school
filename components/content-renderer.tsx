import Image from "next/image";
import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { createElement, Fragment, type CSSProperties, type ReactNode } from "react";
import type { ContentBlock, WebsiteContent, WebsiteProjection } from "@/lib/api/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeHref(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) ||
    value.startsWith("https://")
  );
}

function safeYoutubeEmbed(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.youtube-nocookie.com" &&
      /^\/embed\/[\w-]{11}$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

const richTextTags = new Set([
  "a", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "iframe", "img", "input", "li", "mark", "ol", "p", "pre", "s",
  "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]);

const inlineRichTextTags = new Set([
  "a", "br", "code", "del", "em", "mark", "s", "strong", "sub", "sup", "u",
]);

function safeAlignment(value: string | undefined): CSSProperties | undefined {
  if (!value) return undefined;
  const match = /(?:^|;)\s*text-align\s*:\s*(left|right|center|justify)\s*(?:;|$)/i.exec(value);
  return match ? { textAlign: match[1].toLowerCase() as CSSProperties["textAlign"] } : undefined;
}

function renderRichHtml(html: string, inlineOnly = false): ReactNode {
  const options: HTMLReactParserOptions = {
    replace(domNode, index) {
      if (!(domNode instanceof Element)) return;
      const tag = domNode.name.toLowerCase();
      if (inlineOnly && !inlineRichTextTags.has(tag)) {
        return createElement(
          Fragment,
          { key: `rich-${index}` },
          domToReact(domNode.children as DOMNode[], options),
        );
      }
      if (!richTextTags.has(tag)) {
        return createElement(
          Fragment,
          { key: `rich-${index}` },
          domToReact(domNode.children as DOMNode[], options),
        );
      }
      const children = domToReact(domNode.children as DOMNode[], options);
      const props: Record<string, string | number | boolean | CSSProperties> = {
        key: `rich-${index}`,
      };
      const alignment = safeAlignment(domNode.attribs.style);
      if (alignment) props.style = alignment;

      if (tag === "a") {
        const href = domNode.attribs.href;
        if (!isSafeHref(href)) return createElement(Fragment, { key: `rich-${index}` }, children);
        props.href = href;
        if (href.startsWith("https://")) {
          props.target = "_blank";
          props.rel = "noreferrer noopener";
        }
      } else if (tag === "img") {
        const src = domNode.attribs.src;
        if (!isSafeHref(src)) return createElement(Fragment, { key: `rich-${index}` });
        return (
          <Image
            alt={domNode.attribs.alt ?? ""}
            className="content-rich-image"
            height={720}
            key={`rich-${index}`}
            src={src}
            unoptimized
            width={1200}
          />
        );
      } else if (tag === "iframe") {
        const src = domNode.attribs.src;
        if (!safeYoutubeEmbed(src)) return createElement(Fragment, { key: `rich-${index}` });
        return (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="content-rich-video"
            key={`rich-${index}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={src}
            title={domNode.attribs.title || "Embedded YouTube video"}
          />
        );
      } else if (tag === "input") {
        if (domNode.attribs.type !== "checkbox") return createElement(Fragment, { key: `rich-${index}` });
        return (
          <input
            checked={domNode.attribs.checked !== undefined}
            disabled
            key={`rich-${index}`}
            readOnly
            type="checkbox"
          />
        );
      } else if (tag === "td" || tag === "th") {
        for (const attribute of ["colspan", "rowspan"] as const) {
          const value = Number(domNode.attribs[attribute]);
          if (Number.isInteger(value) && value >= 1 && value <= 20) {
            props[attribute === "colspan" ? "colSpan" : "rowSpan"] = value;
          }
        }
      }

      return createElement(tag as keyof React.JSX.IntrinsicElements, props, children);
    },
  };
  return parse(html, options);
}

function isContentBlock(value: unknown): value is ContentBlock {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "paragraph" || value.type === "heading" || value.type === "quote") {
    return typeof value.text === "string";
  }
  if (value.type === "image") {
    return typeof value.url === "string" && typeof value.alt === "string";
  }
  return value.type === "link" && typeof value.url === "string" && typeof value.label === "string";
}

function renderInlineMarkup(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern =
    /\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|\[[^\]\n]+\]\((?:https:\/\/[^)\s]+|\/(?!\/)[^)\s]*)\)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const key = `${keyPrefix}-${tokenIndex++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{renderInlineMarkup(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith("~~")) {
      nodes.push(<s key={key}>{renderInlineMarkup(token.slice(2, -2), key)}</s>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{renderInlineMarkup(token.slice(1, -1), key)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+|\/(?!\/)[^)\s]*)\)$/.exec(token);
      if (link && isSafeHref(link[2])) {
        nodes.push(
          <a
            href={link[2]}
            key={key}
            rel={link[2].startsWith("https://") ? "noreferrer" : undefined}
            target={link[2].startsWith("https://") ? "_blank" : undefined}
          >
            {renderInlineMarkup(link[1], key)}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    cursor = start + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderTextMarkup(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const listMatch = /^(\s*)([-*]|\d+\.)\s+(.+)$/.exec(lines[index]);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[2]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = /^(\s*)([-*]|\d+\.)\s+(.+)$/.exec(lines[index]);
        if (!item || /^\d/.test(item[2]) !== ordered) break;
        items.push(item[3]);
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      nodes.push(
        <List key={`${keyPrefix}-list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${keyPrefix}-item-${itemIndex}`}>
              {renderInlineMarkup(item, `${keyPrefix}-item-${itemIndex}`)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && !/^(\s*)([-*]|\d+\.)\s+(.+)$/.test(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    nodes.push(
      <p key={`${keyPrefix}-paragraph-${index}`}>
        {paragraphLines.map((line, lineIndex) => (
          <Fragment key={`${keyPrefix}-line-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkup(line, `${keyPrefix}-line-${lineIndex}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return nodes;
}

export function ContentBody({ content }: { content: WebsiteContent }) {
  const blocks = Array.isArray(content.body) ? content.body.filter(isContentBlock) : [];
  const renderText = (text: string, key: string) =>
    /<\/?[a-z][\s\S]*>/i.test(text)
      ? <Fragment key={key}>{renderRichHtml(text)}</Fragment>
      : <Fragment key={key}>{renderTextMarkup(text, key)}</Fragment>;
  return (
    <div className="content-body">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return renderText(block.text, `${block.type}-${index}`);
        }
        if (block.type === "heading") {
          const Heading = block.level === 2 ? "h2" : block.level === 3 ? "h3" : "h4";
          const headingText = /<\/?[a-z][\s\S]*>/i.test(block.text)
            ? renderRichHtml(block.text, true)
            : renderInlineMarkup(block.text, `heading-${index}`);
          return <Heading key={`${block.type}-${index}`}>{headingText}</Heading>;
        }
        if (block.type === "quote") {
          return (
            <figure className="content-quote" key={`${block.type}-${index}`}>
              <blockquote>{renderText(block.text, `quote-${index}`)}</blockquote>
              {block.citation && <figcaption>{block.citation}</figcaption>}
            </figure>
          );
        }
        if (block.type === "image") {
          if (!isSafeHref(block.url)) return null;
          return (
            <figure className="content-image" key={`${block.type}-${index}`}>
              <Image alt={block.alt} height={720} src={block.url} unoptimized width={1200} />
            </figure>
          );
        }
        if (!isSafeHref(block.url)) return null;
        return (
          <p className="content-link" key={`${block.type}-${index}`}>
            <a href={block.url}>{block.label}</a>
          </p>
        );
      })}
    </div>
  );
}

export function CmsImage({
  url,
  alt,
  className,
  priority = false,
}: {
  url: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!isSafeHref(url)) return null;
  return (
    <Image
      alt={alt}
      className={className}
      height={720}
      priority={priority}
      src={url}
      unoptimized
      width={1200}
    />
  );
}

export function PageIntro({ page }: { page: WebsiteProjection }) {
  const intro = typeof page.content.intro === "string" ? page.content.intro : null;
  return (
    <header className="page-intro">
      <h1>{page.content.heading && typeof page.content.heading === "string" ? page.content.heading : page.title}</h1>
      {intro && <p>{intro}</p>}
    </header>
  );
}

export function PageContent({ page }: { page: WebsiteProjection }) {
  return (
    <>
      <PageIntro page={page} />
      <ContentBody content={page.content} />
    </>
  );
}

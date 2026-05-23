import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders AI / user markdown cleanly.
 * Strips stray ** wrappers that sometimes come back from models,
 * normalizes spacing, and themes via design tokens.
 */
export function Markdown({ children, className }: MarkdownProps) {
  const cleaned = (children ?? "")
    // remove a leading "** Title **" pattern that some models emit
    .replace(/^\s*\*\*\s*([^*\n]+?)\s*\*\*\s*$/gm, "### $1")
    // collapse 3+ newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none text-foreground",
        "prose-headings:text-foreground prose-headings:font-semibold",
        "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
        "prose-p:text-foreground prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-li:text-foreground prose-li:marker:text-primary",
        "prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-a:text-primary hover:prose-a:underline",
        "prose-hr:border-border",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleaned}</ReactMarkdown>
    </div>
  );
}

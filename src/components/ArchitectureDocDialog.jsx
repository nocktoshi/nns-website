import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { ExternalLink, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ARCHITECTURE_URL = "/docs/ARCHITECTURE.md";
const GITHUB_BLOB =
  "https://github.com/nocktoshi/nns-vesl/blob/dev/ARCHITECTURE.md";
const GITHUB_RAW =
  "https://raw.githubusercontent.com/nocktoshi/nns-vesl/refs/heads/dev/ARCHITECTURE.md";

function useDocumentDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return dark;
}

function configureMermaid(dark) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: dark ? "dark" : "base",
    themeVariables: dark
      ? {
          darkMode: true,
          background: "#14151a",
          primaryColor: "#ea580c",
          primaryTextColor: "#f4f4f5",
          secondaryColor: "#1e293b",
          tertiaryColor: "#334155",
          lineColor: "#94a3b8",
          mainBkg: "#1e293b",
          nodeBorder: "#64748b",
          clusterBkg: "#0f172a",
          titleColor: "#f8fafc",
          edgeLabelBackground: "#1e293b",
          actorBkg: "#1e293b",
          actorBorder: "#475569",
          actorTextColor: "#f1f5f9",
          signalColor: "#cbd5e1",
          sequenceNumberColor: "#0f172a",
        }
      : {
          background: "#f4faf9",
          primaryColor: "#ea580c",
          primaryTextColor: "#0f172a",
          secondaryColor: "#e2e8f0",
          tertiaryColor: "#f1f5f9",
          lineColor: "#64748b",
          mainBkg: "#ffffff",
          nodeBorder: "#cbd5e1",
          clusterBkg: "#f8fafc",
          titleColor: "#0f172a",
          edgeLabelBackground: "#ffffff",
          actorBkg: "#ffffff",
          actorBorder: "#cbd5e1",
          actorTextColor: "#0f172a",
          signalColor: "#334155",
          sequenceNumberColor: "#f8fafc",
        },
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      padding: 16,
      nodeSpacing: 56,
      rankSpacing: 56,
      useMaxWidth: true,
    },
    sequence: {
      actorMargin: 28,
      boxMargin: 12,
      messageMargin: 40,
      mirrorActors: false,
      useMaxWidth: true,
    },
  });
}

function MermaidBlock({ source, dark }) {
  const reactId = useId().replace(/:/g, "");
  const renderSeq = useRef(0);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError(null);
      setSvg("");
      try {
        configureMermaid(dark);
        renderSeq.current += 1;
        const id = `mmd-${reactId}-${renderSeq.current}`;
        const { svg: out } = await mermaid.render(id, source);
        if (!cancelled) setSvg(out);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [source, dark, reactId]);

  if (error) {
    return (
      <div className="architecture-mermaid architecture-mermaid--error not-prose rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Could not render diagram</p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs opacity-90">
          {error}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="architecture-mermaid architecture-mermaid--loading not-prose flex min-h-[120px] items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="architecture-mermaid not-prose flex justify-center overflow-x-auto rounded-lg border border-border bg-card px-3 py-4 shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function MarkdownPre({ children, dark }) {
  const childArr = Children.toArray(children);
  const only = childArr.length === 1 ? childArr[0] : null;

  if (isValidElement(only) && only.type === "code") {
    const cls = only.props.className || "";
    if (cls.includes("language-mermaid")) {
      const text = String(only.props.children ?? "").replace(/\n$/, "");
      return <MermaidBlock source={text} dark={dark} />;
    }
  }

  return (
    <pre className="not-prose mb-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
      {children}
    </pre>
  );
}

export default function ArchitectureDocDialog({ open, onOpenChange }) {
  const dark = useDocumentDark();
  const [markdown, setMarkdown] = useState("");
  const [loadState, setLoadState] = useState("idle");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoadState("loading");
      setMarkdown("");
      try {
        const res = await fetch(ARCHITECTURE_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const text = await res.text();
        if (!cancelled) {
          setMarkdown(text);
          setLoadState("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setLoadState("error");
          setMarkdown(
            e instanceof Error ? e.message : "Failed to load architecture document."
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const markdownComponents = useMemo(
    () => ({
      pre: (props) => <MarkdownPre {...props} dark={dark} />,
      code({ className, children, ...rest }) {
        const match = /language-(\w+)/.exec(className || "");
        const inline = !match;
        if (!inline && match[1] === "mermaid") {
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        }
        if (inline) {
          return (
            <code
              className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground [text-wrap:wrap] before:content-none after:content-none"
              {...rest}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={cn("font-mono text-sm", className)} {...rest}>
            {children}
          </code>
        );
      },
      a: ({ href, children, ...rest }) => (
        <a
          href={href}
          className="font-medium text-primary underline-offset-4 hover:underline"
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noreferrer" : undefined}
          {...rest}
        >
          {children}
        </a>
      ),
      table: ({ children, ...rest }) => (
        <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
          <table
            className="w-full min-w-[32rem] border-collapse text-left text-sm"
            {...rest}
          >
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...rest }) => (
        <thead className="border-b border-border bg-muted/50" {...rest}>
          {children}
        </thead>
      ),
      th: ({ children, ...rest }) => (
        <th className="border border-border px-3 py-2 font-semibold text-foreground" {...rest}>
          {children}
        </th>
      ),
      td: ({ children, ...rest }) => (
        <td
          className="border border-border px-3 py-2 align-top text-muted-foreground"
          {...rest}
        >
          {children}
        </td>
      ),
      tr: ({ children, ...rest }) => (
        <tr className="even:bg-muted/20" {...rest}>
          {children}
        </tr>
      ),
    }),
    [dark]
  );

  const handleOpenChange = useCallback(
    (next) => {
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,920px)] w-[min(94vw,56rem)] max-w-[56rem] flex-col gap-0 overflow-hidden",
          "border-border bg-background p-0 sm:max-w-[56rem]"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 text-left">
          <DialogTitle className="font-mono text-base tracking-tight">
            ARCHITECTURE.md
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            NNS architecture, proof model, and roadmap — same source as the nns-vesl repo.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[min(calc(92vh-11rem),760px)] min-h-[240px] w-full overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="px-6 py-4">
            {loadState === "loading" && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading document…</span>
              </div>
            )}
            {loadState === "error" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Could not load {ARCHITECTURE_URL}</p>
                <p className="mt-2 text-muted-foreground">{markdown}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Try the raw file on GitHub or ensure <code className="rounded bg-muted px-1">public/docs/ARCHITECTURE.md</code>{" "}
                  is present after build.
                </p>
              </div>
            )}
            {loadState === "ok" && (
              <article
                className={cn(
                  "architecture-doc prose prose-sm max-w-none pb-6",
                  "prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
                  "prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3",
                  "prose-h2:text-xl prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:pt-2",
                  "prose-h3:text-lg prose-h3:text-foreground",
                  "prose-p:text-muted-foreground prose-p:leading-relaxed",
                  "prose-strong:text-foreground prose-strong:font-semibold",
                  "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
                  "prose-hr:border-border",
                  "prose-li:text-muted-foreground prose-li:marker:text-primary",
                  "dark:prose-invert dark:prose-p:text-muted-foreground"
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {markdown}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <a
              href={GITHUB_BLOB}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              View on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-border">·</span>
            <a
              href={GITHUB_RAW}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              Raw
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

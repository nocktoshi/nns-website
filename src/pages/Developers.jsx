import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  Coins,
  ExternalLink,
  Globe,
  Loader2,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import logoMark from "@/assets/nns-mark.png";
import {
  API_DOCS_BASE_URL,
  API_DOCS_PAYMENT_ADDRESS,
  API_DOCS_DEMO_NAME,
  apiDocsEndpoints,
  apiDocsQuickstartSnippets,
} from "@/config/apiEndpoints";

const API_BASE = API_DOCS_BASE_URL;
const PAYMENT_ADDRESS = API_DOCS_PAYMENT_ADDRESS;
const DEMO_NAME = API_DOCS_DEMO_NAME;

function methodClasses(method) {
  switch (method) {
    case "GET":
      return "bg-chart-2/15 text-chart-2 border-chart-2/30";
    case "POST":
      return "bg-primary/15 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function CodeBlock({ code, language = "bash", className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-chart-2" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
        <span className="sr-only">{language}</span>
      </button>
    </div>
  );
}

function EndpointHeader({ method, path, description }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className={`font-mono text-xs px-2 py-1 ${methodClasses(method)}`}
        >
          {method}
        </Badge>
        <span className="font-mono text-base md:text-lg font-semibold">
          {path}
        </span>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function ParamTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Parameter</TableHead>
            <TableHead className="w-[20%]">Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-mono text-sm">
                {row.name}
                {row.required && (
                  <span className="ml-1 text-destructive text-xs">*</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.type}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const endpoints = apiDocsEndpoints;

const pricing = [
  { rule: "Label length ≥ 10 characters", fee: "100 $NOCK" },
  { rule: "Label length 5 – 9 characters", fee: "500 $NOCK" },
  { rule: "Label length 1 – 4 characters", fee: "5,000 $NOCK" },
];

const errorCodes = [
  { code: 400, meaning: "Bad Request", examples: "Invalid name, invalid address, missing params, name already registered." },
  { code: 404, meaning: "Not Found", examples: "Name or address has no registration on /resolve." },
  { code: 500, meaning: "Internal Server Error", examples: "Unexpected server failure; includes an error string in the body." },
];

const quickstartSnippets = apiDocsQuickstartSnippets;

function LiveResolveDemo() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/resolve?name=${encodeURIComponent(DEMO_NAME)}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", data, error: `HTTP ${res.status}` });
        } else {
          setState({ status: "ok", data, error: null });
        }
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", data: null, error: err.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pretty =
    state.status === "loading"
      ? "// fetching…"
      : JSON.stringify(state.data, null, 2);

  return (
    <Card className="glassmorphism">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <Terminal className="h-3 w-3" />
            Live call · GET /resolve?name={DEMO_NAME}
          </div>
          {state.status === "loading" && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {state.status === "ok" && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono bg-chart-2/10 text-chart-2 border-chart-2/30"
            >
              200
            </Badge>
          )}
          {state.status === "error" && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono bg-destructive/10 text-destructive border-destructive/30"
            >
              {state.error || "error"}
            </Badge>
          )}
        </div>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono whitespace-pre">
          <code>{pretty}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function Endpoint({ endpoint }) {
  return (
    <Card id={endpoint.id} className="glassmorphism scroll-mt-24">
      <CardHeader>
        <EndpointHeader
          method={endpoint.method}
          path={endpoint.path}
          description={endpoint.description}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        {endpoint.params && endpoint.params.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Query parameters
            </div>
            <ParamTable rows={endpoint.params} />
            <p className="text-xs text-muted-foreground">
              Provide exactly one of the listed parameters unless noted.
            </p>
          </div>
        )}

        {endpoint.body && endpoint.body.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              JSON body
            </div>
            <ParamTable rows={endpoint.body} />
          </div>
        )}

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Examples
          </div>
          <Tabs defaultValue={endpoint.examples[0].label}>
            <TabsList className="flex-wrap h-auto">
              {endpoint.examples.map((ex) => (
                <TabsTrigger key={ex.label} value={ex.label} className="text-xs">
                  {ex.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {endpoint.examples.map((ex) => (
              <TabsContent key={ex.label} value={ex.label} className="space-y-3 mt-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    Request
                  </div>
                  <CodeBlock code={ex.request} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground font-medium">
                      Response
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs font-mono ${
                        ex.status >= 400
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-chart-2/10 text-chart-2 border-chart-2/30"
                      }`}
                    >
                      {ex.status}
                    </Badge>
                  </div>
                  <CodeBlock code={ex.response} language="json" />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Developers() {
  return (
    <div className="min-h-screen bg-background no-default-hover-elevate">
      <header className="border-b border-border sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img
                src={logoMark}
                alt="NNS"
                className="h-10 w-auto object-contain"
              />
              <span className="text-xl font-bold web3-gradient-text">
                API
              </span>
              <Badge variant="secondary" className="text-xs">
                Developers
              </Badge>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/playground">
                <Button className="gap-2 web3-gradient text-primary-foreground border-0">
                  <Terminal className="h-4 w-4" />
                  Playground
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 border-b border-border nns-circuit-bg">
        <div className="container mx-auto max-w-5xl">
          <Badge className="mb-4 web3-gradient text-primary-foreground border-0 uppercase tracking-[0.12em] text-[10px]">
            <Code2 className="h-3 w-3 mr-1" />
            API Reference
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 web3-gradient-text">
            NNS API
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-8">
            A restful JSON API for resolving, searching, and registering{" "}
            <span className="font-mono text-primary">.nock</span> names on
            Nockchain. No authentication. CORS enabled. STARK proofs coming soon!
          </p>

          <div className="grid md:grid-cols-[1fr_1.2fr] gap-4">
            <Card className="glassmorphism">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  <Globe className="h-3 w-3" />
                  Base URL
                </div>
                <div className="font-mono text-lg font-semibold break-all">
                  {API_BASE}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  All endpoints are served over HTTPS with permissive CORS.
                  Anonymous access; no API keys to manage.
                </p>
              </CardContent>
            </Card>
            <Card className="glassmorphism">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  <Terminal className="h-3 w-3" />
                  Quickstart
                </div>
                <Tabs defaultValue="curl">
                  <TabsList className="h-auto">
                    <TabsTrigger value="curl" className="text-xs">
                      curl
                    </TabsTrigger>
                    <TabsTrigger value="javascript" className="text-xs">
                      JavaScript
                    </TabsTrigger>
                    <TabsTrigger value="node" className="text-xs">
                      Node
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-3">
                    <CodeBlock code={quickstartSnippets.curl} />
                  </TabsContent>
                  <TabsContent value="javascript" className="mt-3">
                    <CodeBlock
                      code={quickstartSnippets.javascript}
                      language="javascript"
                    />
                  </TabsContent>
                  <TabsContent value="node" className="mt-3">
                    <CodeBlock
                      code={quickstartSnippets.node}
                      language="javascript"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <LiveResolveDemo />
          </div>
        </div>
      </section>

      {/* Endpoints index */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-[220px_1fr] gap-8">
            <aside className="md:sticky md:top-24 h-fit">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                Endpoints
              </div>
              <nav className="flex flex-col gap-1">
                {endpoints.map((ep) => (
                  <a
                    key={ep.id}
                    href={`#${ep.id}`}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover-elevate hover:bg-muted/50 transition-colors"
                  >
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] px-1.5 py-0 ${methodClasses(ep.method)}`}
                    >
                      {ep.method}
                    </Badge>
                    <span className="font-mono">{ep.path}</span>
                  </a>
                ))}
                <div className="h-px bg-border my-2" />
                <a
                  href="#pricing"
                  className="rounded-md px-3 py-2 text-sm hover-elevate hover:bg-muted/50 transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#errors"
                  className="rounded-md px-3 py-2 text-sm hover-elevate hover:bg-muted/50 transition-colors"
                >
                  Errors
                </a>
              </nav>
            </aside>

            <div className="space-y-10">
              <div className="space-y-6">
                {endpoints.map((ep) => (
                  <Endpoint key={ep.id} endpoint={ep} />
                ))}
              </div>

              {/* Pricing */}
              <section id="pricing" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Pricing</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registration fees are determined by the length of the label
                  (the part before <span className="font-mono">.nock</span>).
                  Payments are sent in $NOCK to the NNS payment address.
                </p>
                <Card className="glassmorphism overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricing.map((row) => (
                        <TableRow key={row.rule}>
                          <TableCell className="text-sm">{row.rule}</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {row.fee}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
                <Card className="glassmorphism">
                  <CardContent className="p-5 space-y-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Payment address
                    </div>
                    <CodeBlock code={PAYMENT_ADDRESS} />
                  </CardContent>
                </Card>
              </section>

              {/* Errors */}
              <section id="errors" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Errors</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Errors are returned as JSON with an{" "}
                  <span className="font-mono text-foreground">error</span>{" "}
                  string and a standard HTTP status code.
                </p>
                <Card className="glassmorphism overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[25%]">Meaning</TableHead>
                        <TableHead>Examples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorCodes.map((row) => (
                        <TableRow key={row.code}>
                          <TableCell className="font-mono font-medium">
                            {row.code}
                          </TableCell>
                          <TableCell>{row.meaning}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.examples}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
                <CodeBlock
                  code={`{\n  "error": "Invalid blockchain address"\n}`}
                  language="json"
                />
              </section>

              {/* Resources */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Resources</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <a
                    href="https://github.com/nocktoshi"
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <Card className="glassmorphism web3-glow-hover h-full">
                      <CardContent className="p-5 flex items-start gap-3">
                        <ExternalLink className="h-4 w-4 mt-1 text-primary shrink-0" />
                        <div>
                          <div className="font-semibold mb-1">GitHub</div>
                          <p className="text-sm text-muted-foreground">
                            Source, issues, and contributions.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                  <Link href="/grant" className="block">
                    <Card className="glassmorphism web3-glow-hover h-full">
                      <CardContent className="p-5 flex items-start gap-3">
                        <ExternalLink className="h-4 w-4 mt-1 text-primary shrink-0" />
                        <div>
                          <div className="font-semibold mb-1">NNS Grant</div>
                          <p className="text-sm text-muted-foreground">
                            Roadmap for the full NNS protocol, marketplace, and
                            resolver infrastructure.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 nockchain.net, LLC. Built on Nockchain.</p>
        </div>
      </footer>
    </div>
  );
}

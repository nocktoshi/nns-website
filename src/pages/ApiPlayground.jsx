import { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import logoMark from "@/assets/nns-mark.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPlaygroundFetchBaseUrl,
  PLAYGROUND_TESTNET_BASE_URL,
  playgroundEndpointGroups,
} from "@/config/apiEndpoints";

/** Shared demo data so quick picks tell a single coherent story: register -> claim -> resolve -> proof. */
const PLAYGROUND_DEMO = {
  address: "8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5",
  name: "nns.nock",
  txHash: "8PidkepBqDU1ibGPikevtU5F51hYyfLhKrPgWD7K7y2RG5EuZoJEaex",
};

const QUICK_SCENARIOS = [
  {
    id: "dev-register",
    label: "Register a new name",
    query: {},
    getBody: () => ({
      address: PLAYGROUND_DEMO.address,
      name: PLAYGROUND_DEMO.name,
    }),
  },
  {
    id: "dev-claim",
    label: "Claim (confirm payment)",
    query: {},
    getBody: () => ({
      address: PLAYGROUND_DEMO.address,
      name: PLAYGROUND_DEMO.name,
      txHash: PLAYGROUND_DEMO.txHash,
    }),
  },
  {
    id: "dev-resolve",
    label: "Resolve the name",
    query: { name: PLAYGROUND_DEMO.name, address: "" },
    getBody: null,
  },
  {
    id: "dev-proof",
    label: "Merkle proof",
    query: {
      name: PLAYGROUND_DEMO.name,
      address: PLAYGROUND_DEMO.address,
    },
    getBody: null,
  },
];

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

function joinUrl(base, path) {
  return `${base.replace(/\/$/, "")}${path}`;
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

/** Re-indent pasted or minified JSON; returns input unchanged if not valid JSON. */
function tryPrettyJsonText(text) {
  if (text == null) return "";
  const t = String(text).trim();
  if (t === "") return "";
  try {
    return prettyJson(JSON.parse(t));
  } catch {
    return String(text);
  }
}

/**
 * Prettier display for response: pretty JSON, or string content that is JSON, or plain text.
 * @param {{ isJson: boolean, body: unknown } | null} result
 */
function formatResponseBodyForDisplay(result) {
  if (!result) {
    return "// Send a request to see the response.";
  }
  const { isJson, body } = result;
  if (isJson) {
    if (body === null || body === undefined) {
      return "null";
    }
    if (typeof body === "string") {
      return tryPrettyJsonText(body);
    }
    return prettyJson(body);
  }
  if (body === null || body === undefined) {
    return "";
  }
  if (typeof body === "string") {
    return tryPrettyJsonText(body);
  }
  return String(body);
}

/** Pretty JSON for POST request body, or first line / raw if not parseable. */
function getPrettyPostBodyForSnippet(bodyText) {
  try {
    return prettyJson(JSON.parse(bodyText === "" || bodyText == null ? "{}" : String(bodyText)));
  } catch {
    return bodyText === "" || bodyText == null ? "{}" : String(bodyText);
  }
}

function buildInitialQuery(query = []) {
  return query.reduce((acc, item) => {
    acc[item.name] = "";
    return acc;
  }, {});
}

function buildPlaygroundUrls(endpointPath, queryValues) {
  const uPublic = new URL(joinUrl(PLAYGROUND_TESTNET_BASE_URL, endpointPath));
  const fetchBase = getPlaygroundFetchBaseUrl();
  const uRequest = import.meta.env.DEV
    ? new URL(joinUrl(fetchBase, endpointPath), window.location.origin)
    : new URL(joinUrl(fetchBase, endpointPath));
  for (const [name, value] of Object.entries(queryValues)) {
    if (value == null) continue;
    const s = String(value).trim();
    if (s === "") continue;
    uPublic.searchParams.set(name, s);
    uRequest.searchParams.set(name, s);
  }
  return { publicUrl: uPublic, requestUrl: uRequest };
}

function getPlaygroundStatusRequestUrl() {
  const base = getPlaygroundFetchBaseUrl();
  if (import.meta.env.DEV) {
    return new URL(joinUrl(base, "/status"), window.location.origin).toString();
  }
  return new URL(joinUrl(base, "/status")).toString();
}

function NetworkStat({ label, value, loading }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular-nums">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        ) : value === null || value === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          String(value)
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-2">
      {copied ? <Check className="h-3.5 w-3.5 text-chart-2" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export default function ApiPlayground() {
  const endpointOptions = useMemo(
    () =>
      playgroundEndpointGroups.flatMap((group) =>
        group.endpoints.map((endpoint) => ({
          ...endpoint,
          groupId: group.id,
          groupLabel: group.label,
        }))
      ),
    []
  );

  const [endpointId, setEndpointId] = useState(endpointOptions[0]?.id || "");
  const endpoint = useMemo(
    () => endpointOptions.find((item) => item.id === endpointId) || endpointOptions[0],
    [endpointId, endpointOptions]
  );

  const [queryValues, setQueryValues] = useState(() =>
    buildInitialQuery(endpointOptions[0]?.query)
  );
  const [bodyText, setBodyText] = useState(() =>
    prettyJson(endpointOptions[0]?.bodyTemplate ?? {})
  );
  const [isSending, setIsSending] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [result, setResult] = useState(null);

  const [networkStatus, setNetworkStatus] = useState(null);
  const [networkStatusError, setNetworkStatusError] = useState(null);
  const [networkStatusLoading, setNetworkStatusLoading] = useState(true);

  const fetchNetworkStatus = useCallback(async () => {
    setNetworkStatusLoading(true);
    setNetworkStatusError(null);
      fetch(getPlaygroundStatusRequestUrl()).then(res => res.json())
      .then(data => setNetworkStatus(data))
      .catch(err => setNetworkStatusError(err.message))
      .finally(() => setNetworkStatusLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      // eslint-disable-next-line
      void fetchNetworkStatus();
    }
    return () => {
      ignore = true;
    };
  }, [fetchNetworkStatus]);

  const { publicUrl, requestUrl } = useMemo(() => {
    if (!endpoint) {
      const fallback = new URL(PLAYGROUND_TESTNET_BASE_URL);
      return { publicUrl: fallback, requestUrl: fallback };
    }
    return buildPlaygroundUrls(endpoint.path, queryValues);
  }, [endpoint, queryValues]);

  if (!endpoint) return null;

  const anchorTipHeight = networkStatus?.anchor?.tip_height;
  const followerChainTipHeight = networkStatus?.follower?.chain_tip_height;
  const blocksBehindRaw =
    anchorTipHeight != null && followerChainTipHeight != null
      ? Number(followerChainTipHeight) - Number(anchorTipHeight)
      : null;
  const blocksBehind = Number.isFinite(blocksBehindRaw) ? blocksBehindRaw : null;
  const registeredCount = networkStatus?.registered_count;
  const pendingCount = networkStatus?.pending_count;
  const namesCount = networkStatus?.names_count;

  const onEndpointChange = (nextId) => {
    const nextEndpoint =
      endpointOptions.find((item) => item.id === nextId) || endpointOptions[0];
    setEndpointId(nextId);
    setQueryValues(buildInitialQuery(nextEndpoint.query));
    setBodyText(
      nextEndpoint.method === "POST"
        ? prettyJson(nextEndpoint.bodyTemplate ?? {})
        : ""
    );
    setRequestError("");
    setResult(null);
  };

  const applyQuickScenario = (scenario) => {
    const next = endpointOptions.find((item) => item.id === scenario.id);
    if (!next) return;
    setEndpointId(scenario.id);
    const q = buildInitialQuery(next.query);
    if (scenario.query) {
      for (const [key, value] of Object.entries(scenario.query)) {
        if (key in q) {
          q[key] = value;
        }
      }
    }
    setQueryValues(q);
    if (next.method === "POST" && scenario.getBody) {
      setBodyText(prettyJson(scenario.getBody()));
    } else if (next.method === "POST") {
      setBodyText(prettyJson(next.bodyTemplate ?? {}));
    } else {
      setBodyText("");
    }
    setRequestError("");
    setResult(null);
  };

  const prettyPostBody = getPrettyPostBodyForSnippet(bodyText);

  const curlSnippet =
    endpoint.method === "GET"
      ? `curl '${publicUrl.toString()}'`
      : `curl -X POST '${publicUrl.toString()}' \\
  -H 'Content-Type: application/json' \\
  --data-binary @- <<'NNSJSON'
${prettyPostBody}
NNSJSON`;

  const fetchSnippet =
    endpoint.method === "GET"
      ? `const res = await fetch("${publicUrl.toString()}");\nconst data = await res.json();\nconsole.log(data);`
      : `const res = await fetch("${publicUrl.toString()}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: ${JSON.stringify(prettyPostBody)},
});
const data = await res.json();
console.log(data);`;

  const executeRequest = async () => {
    setRequestError("");
    setIsSending(true);

    try {
      if (endpoint.query?.length) {
        const missing = endpoint.query
          .filter((field) => field.required && !queryValues[field.name]?.trim())
          .map((field) => field.name);
        if (missing.length > 0) {
          throw new Error(`Missing required query field(s): ${missing.join(", ")}`);
        }
      }

      let parsedBody;
      if (endpoint.method === "POST") {
        parsedBody = bodyText?.trim() ? JSON.parse(bodyText) : {};
        const missingBody = (endpoint.requiredBodyFields || []).filter((field) => {
          const value = parsedBody?.[field];
          return typeof value !== "string" || value.trim() === "";
        });
        if (missingBody.length > 0) {
          throw new Error(`Missing required body field(s): ${missingBody.join(", ")}`);
        }
      }

      const response = await fetch(requestUrl.toString(), {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: endpoint.method === "POST" ? JSON.stringify(parsedBody) : undefined,
      });

      const rawText = await response.text();
      let parsed;
      let isJson = false;
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
        isJson = true;
      } catch {
        parsed = rawText;
      }

      setResult({
        ok: response.ok,
        status: response.status,
        durationMs: null,
        isJson,
        body: parsed,
      });
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  };

  const onSend = async () => {
    if (endpoint.dangerous) {
      setPendingConfirm(true);
      return;
    }
    await executeRequest();
  };

  return (
    <div className="min-h-screen bg-background no-default-hover-elevate">
      <header className="border-b border-border sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoMark} alt="NNS" className="h-10 w-auto object-contain" />
              <span className="text-xl font-bold web3-gradient-text">Playground</span>
              <Badge variant="secondary" className="text-xs">
                Testnet
              </Badge>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/developers">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Docs
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

      <main className="py-10 px-4 nns-circuit-bg">
        <div className="container mx-auto max-w-6xl space-y-6">
          <Card className="glassmorphism">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <FlaskConical className="h-3 w-3" />
                Active testnet base URL
              </div>
              <div className="font-mono text-sm md:text-base break-all">
                {PLAYGROUND_TESTNET_BASE_URL}
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  <Terminal className="h-3 w-3" />
                  Network
                  <Badge variant="outline" className="text-[10px] font-mono font-normal">
                    GET /status
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground"
                  onClick={fetchNetworkStatus}
                  disabled={networkStatusLoading}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${networkStatusLoading ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Refresh
                </Button>
              </div>
              {networkStatusError && (
                <p className="text-xs text-destructive" role="status">
                  {networkStatusError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <NetworkStat
                  label="Anchor tip height"
                  value={anchorTipHeight}
                  loading={networkStatusLoading}
                />
                <NetworkStat
                  label="Follower chain tip height"
                  value={followerChainTipHeight}
                  loading={networkStatusLoading}
                />
                <NetworkStat
                  label="Blocks Back"
                  value={blocksBehind}
                  loading={networkStatusLoading}
                />
                <NetworkStat
                  label="Registered"
                  value={registeredCount}
                  loading={networkStatusLoading}
                />
                <NetworkStat
                  label="Pending"
                  value={pendingCount}
                  loading={networkStatusLoading}
                />
                <NetworkStat
                  label="Names (total)"
                  value={namesCount}
                  loading={networkStatusLoading}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card className="glassmorphism">
              <CardHeader className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Quick start
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_SCENARIOS.map((scenario) => (
                      <Button
                        key={scenario.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto min-h-9 max-w-full justify-start text-left text-xs font-medium whitespace-normal web3-glow-hover border border-border/80"
                        onClick={() => applyQuickScenario(scenario)}
                      >
                        {scenario.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <CardTitle className="text-xl">Request builder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Endpoint
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <div className="min-w-0 flex-1">
                      <Select value={endpoint.id} onValueChange={onEndpointChange}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select endpoint" />
                        </SelectTrigger>
                        <SelectContent>
                          {playgroundEndpointGroups.map((group) => (
                            <div key={group.id}>
                              {group.endpoints.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  [{item.method}] {item.path}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      onClick={onSend}
                      disabled={isSending}
                      className="h-9 shrink-0 gap-2 whitespace-nowrap web3-gradient text-primary-foreground border-0 sm:px-4"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Send request
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={methodClasses(endpoint.method)}>
                      {endpoint.method}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {endpoint.groupLabel}
                    </Badge>
                    {endpoint.adminOnly && (
                      <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
                  {endpoint.compatibilityNote && (
                    <p className="text-xs text-muted-foreground">{endpoint.compatibilityNote}</p>
                  )}
                </div>

                {endpoint.query?.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Query parameters
                    </div>
                    {endpoint.query.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="text-sm font-mono">
                          {field.name}
                          {field.required ? <span className="text-destructive ml-1">*</span> : null}
                        </label>
                        <Input
                          value={queryValues[field.name] || ""}
                          placeholder={field.placeholder || ""}
                          onChange={(event) =>
                            setQueryValues((current) => ({
                              ...current,
                              [field.name]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {endpoint.method === "POST" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        JSON body
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => setBodyText((prev) => tryPrettyJsonText(prev))}
                      >
                        Format JSON
                      </Button>
                    </div>
                    <Textarea
                      value={bodyText}
                      onChange={(event) => setBodyText(event.target.value)}
                      onBlur={() => setBodyText((prev) => tryPrettyJsonText(prev))}
                      spellCheck={false}
                      className="min-h-[180px] font-mono text-xs"
                    />
                  </div>
                )}

                {endpoint.dangerous && (
                  <Alert className="border-destructive/30 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertTitle>Mutating endpoint</AlertTitle>
                    <AlertDescription>
                      This request may create or mutate testnet state. A confirmation prompt appears before sending.
                    </AlertDescription>
                  </Alert>
                )}

                {endpoint.adminOnly && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Admin-gated route</AlertTitle>
                    <AlertDescription>
                      This endpoint returns 404 unless admin routes are enabled server-side (`NNS_ENABLE_ADMIN=1`).
                    </AlertDescription>
                  </Alert>
                )}

                {requestError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request blocked</AlertTitle>
                    <AlertDescription>{requestError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {import.meta.env.DEV ? "Request URL (browser, via dev proxy)" : "Request URL"}
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-mono break-all">
                    {requestUrl.toString()}
                  </div>
                  {import.meta.env.DEV && (
                    <p className="text-[11px] text-muted-foreground">
                      Same call against testnet directly:{" "}
                      <span className="font-mono break-all">{publicUrl.toString()}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Copy as
                  </div>
                  <Tabs defaultValue="curl">
                    <TabsList>
                      <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                      <TabsTrigger value="fetch" className="text-xs">fetch</TabsTrigger>
                    </TabsList>
                    <TabsContent value="curl" className="mt-3 space-y-2">
                      <div className="flex justify-end">
                        <CopyButton text={curlSnippet} />
                      </div>
                      <pre className="max-w-full overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[min(50vh,24rem)]">
                        <code>{curlSnippet}</code>
                      </pre>
                    </TabsContent>
                    <TabsContent value="fetch" className="mt-3 space-y-2">
                      <div className="flex justify-end">
                        <CopyButton text={fetchSnippet} />
                      </div>
                      <pre className="max-w-full overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[min(50vh,24rem)]">
                        <code>{fetchSnippet}</code>
                      </pre>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphism w-full max-w-2xl lg:max-w-3xl">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xl">Response</CardTitle>
                {result && (
                  <Badge
                    variant="outline"
                    className={
                      result.ok
                        ? "bg-chart-2/10 text-chart-2 border-chart-2/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    }
                  >
                    {result.status}
                    {result.durationMs !== null ? ` · ${Math.round(result.durationMs)}ms` : ""}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-end">
                  <CopyButton
                    text={result ? formatResponseBodyForDisplay(result) : ""}
                  />
                </div>
                <pre className="max-w-full overflow-x-auto overflow-y-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-h-[300px] max-h-[min(70vh,32rem)]">
                  <code>{result ? formatResponseBodyForDisplay(result) : formatResponseBodyForDisplay(null)}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={pendingConfirm} onOpenChange={setPendingConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send mutating request?</DialogTitle>
            <DialogDescription>
              You are about to call <span className="font-mono">{endpoint.method} {endpoint.path}</span> on testnet.
              This may change server state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setPendingConfirm(false);
                await executeRequest();
              }}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              Confirm and send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

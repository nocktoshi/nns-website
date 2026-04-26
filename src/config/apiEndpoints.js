const API_DOCS_BASE_URL = "https://api.nocknames.com";
const API_DOCS_PAYMENT_ADDRESS =
  "8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5";
const API_DOCS_DEMO_NAME = "nocktoshi.nock";

/** Canonical testnet API origin (docs, curl snippets, production playground fetch). */
const PLAYGROUND_TESTNET_BASE_URL =
  import.meta.env.VITE_TESTNET_API_URL || "https://testnet.nns.id";

/**
 * Base URL (path or full origin) used for `fetch` from the playground.
 * In `vite` dev, use a same-origin prefix proxied to testnet to avoid browser CORS
 * when the testnet response sends duplicate `Access-Control-Allow-Origin` headers.
 */
function getPlaygroundFetchBaseUrl() {
  if (import.meta.env.DEV) {
    return "/__playground-testnet";
  }
  return PLAYGROUND_TESTNET_BASE_URL;
}

const apiDocsEndpoints = [
  {
    id: "resolve",
    method: "GET",
    path: "/resolve",
    description:
      "Bidirectional resolution: name -> address or address -> name. Provide exactly one of name or address.",
    params: [
      {
        name: "name",
        type: "string",
        description:
          "Full .nock domain, e.g. logan.nock. Must match /^[a-z0-9]+\\.nock$/.",
      },
      {
        name: "address",
        type: "string",
        description: "Nockchain wallet address (base58).",
      },
    ],
    examples: [
      {
        label: "name -> address",
        request: `curl '${API_DOCS_BASE_URL}/resolve?name=logan.nock'`,
        response: `{\n  "address": "8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5"\n}`,
        status: 200,
      },
      {
        label: "address -> name",
        request: `curl '${API_DOCS_BASE_URL}/resolve?address=8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5'`,
        response: `{\n  "name": "logan.nock"\n}`,
        status: 200,
      },
      {
        label: "Not found",
        request: `curl '${API_DOCS_BASE_URL}/resolve?name=notfound.nock'`,
        response: `{\n  "error": "Name not registered"\n}`,
        status: 404,
      },
    ],
  },
  {
    id: "search",
    method: "GET",
    path: "/search",
    description:
      "Check availability and status for a name, or list all registrations for an address.",
    params: [
      {
        name: "name",
        type: "string",
        description:
          "Label or full .nock domain. Both 'logan' and 'logan.nock' are accepted.",
      },
      {
        name: "address",
        type: "string",
        description:
          "Wallet address - returns all pending and verified registrations for it.",
      },
    ],
    examples: [
      {
        label: "Search a name",
        request: `curl '${API_DOCS_BASE_URL}/search?name=logan.nock'`,
        response: `{\n  "name": "logan.nock",\n  "price": 500,\n  "status": "registered",\n  "owner": "8s29XU...TT5",\n  "registeredAt": 1730000000000\n}`,
        status: 200,
      },
      {
        label: "Search by address",
        request: `curl '${API_DOCS_BASE_URL}/search?address=8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5'`,
        response: `{\n  "address": "8s29XU...TT5",\n  "pending": [\n    { "address": "...", "name": "soon.nock", "status": "pending", "timestamp": 1730000000000 }\n  ],\n  "verified": [\n    {\n      "address": "...",\n      "name": "logan.nock",\n      "status": "registered",\n      "timestamp": 1730000000000,\n      "date": "2026-01-01T00:00:00.000Z",\n      "txHash": "..."\n    }\n  ]\n}`,
        status: 200,
      },
    ],
  },
  {
    id: "pending",
    method: "GET",
    path: "/pending",
    description: "List all pending registrations, most recent first.",
    params: [],
    examples: [
      {
        label: "Request",
        request: `curl '${API_DOCS_BASE_URL}/pending'`,
        response: `[\n  {\n    "address": "8s29XU...TT5",\n    "name": "logan.nock",\n    "status": "pending",\n    "timestamp": 1730000000000\n  }\n]`,
        status: 200,
      },
    ],
  },
  {
    id: "verified",
    method: "GET",
    path: "/verified",
    description: "List all registered (verified) names, most recent first.",
    params: [],
    examples: [
      {
        label: "Request",
        request: `curl '${API_DOCS_BASE_URL}/verified'`,
        response: `[\n  {\n    "address": "8s29XU...TT5",\n    "name": "logan.nock",\n    "status": "registered",\n    "timestamp": 1730000000000,\n    "date": "2026-01-01T00:00:00.000Z",\n    "txHash": "..."\n  }\n]`,
        status: 200,
      },
    ],
  },
  {
    id: "register",
    method: "POST",
    path: "/register",
    description:
      "Create a payment-pending registration reserving a name for an address. The client has 7 days to send the fee on-chain to the NNS payment address and call /verify.",
    body: [
      {
        name: "address",
        type: "string",
        required: true,
        description: "Nockchain wallet address that will own the name.",
      },
      {
        name: "name",
        type: "string",
        required: true,
        description: "Lowercase alphanumeric label ending in .nock.",
      },
    ],
    examples: [
      {
        label: "Request",
        request: `curl -X POST '${API_DOCS_BASE_URL}/register' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"address":"8s29XU...TT5","name":"logan.nock"}'`,
        response: `{\n  "address": "8s29XU...TT5",\n  "name": "logan.nock",\n  "status": "pending"\n}`,
        status: 200,
      },
      {
        label: "Validation error",
        request: "# invalid name",
        response: `{\n  "error": "Name must be alphanumeric lowercase and end with .nock"\n}`,
        status: 400,
      },
    ],
  },
  {
    id: "verify",
    method: "POST",
    path: "/verify",
    description:
      "Verify the on-chain payment and finalize registration. The new `nns-vesl` API uses `/claim` for this kernel-authoritative step.",
    body: [
      {
        name: "address",
        type: "string",
        required: true,
        description: "The same address used in /register.",
      },
      {
        name: "name",
        type: "string",
        required: true,
        description: "The .nock name to finalize.",
      },
    ],
    examples: [
      {
        label: "Success",
        request: `curl -X POST '${API_DOCS_BASE_URL}/verify' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"address":"8s29XU...TT5","name":"logan.nock"}'`,
        response: `{\n  "message": "Registration successful!",\n  "registration": {\n    "address": "8s29XU...TT5",\n    "name": "logan.nock",\n    "status": "registered",\n    "timestamp": 1730000000000,\n    "date": "2026-01-01T00:00:00.000Z",\n    "txHash": "..."\n  }\n}`,
        status: 200,
      },
      {
        label: "No payment found",
        request: "# no matching tx on-chain yet",
        response: `{\n  "error": "No valid payment transaction found for this address."\n}`,
        status: 400,
      },
    ],
  },
];

const apiDocsQuickstartSnippets = {
  curl: `curl '${API_DOCS_BASE_URL}/resolve?name=logan.nock'`,
  javascript: `const res = await fetch(
  '${API_DOCS_BASE_URL}/resolve?name=logan.nock'
);
const { address } = await res.json();
console.log(address);`,
  node: `import { request } from 'undici';

const { body } = await request(
  '${API_DOCS_BASE_URL}/resolve?name=logan.nock'
);
const { address } = await body.json();`,
};

const playgroundEndpointGroups = [
  {
    id: "dev",
    label: "NNS VESL API (testnet)",
    endpoints: [
      { id: "dev-health", method: "GET", path: "/health", summary: "Service liveness." },
      { id: "dev-status", method: "GET", path: "/status", summary: "Diagnostic status view." },
      { id: "dev-anchor", method: "GET", path: "/anchor", summary: "Anchor + follower observability." },
      { id: "dev-pending", method: "GET", path: "/pending", summary: "List pending reservations." },
      { id: "dev-verified", method: "GET", path: "/verified", summary: "List registered names." },
      { id: "dev-pending-batch", method: "GET", path: "/pending-batch", summary: "Preview settle batch." },
      {
        id: "dev-claim-status",
        method: "GET",
        path: "/claim-status",
        summary: "Read asynchronous claim lifecycle status.",
        query: [{ name: "claim_id", required: true, placeholder: "claim-id-hex-or-string" }],
      },
      {
        id: "dev-snapshot",
        method: "GET",
        path: "/snapshot",
        summary: "Current commitment (claim_id, hull, root).",
      },
      {
        id: "dev-proof",
        method: "GET",
        path: "/proof",
        summary: "Merkle inclusion bundle for name ownership.",
        query: [
          { name: "name", required: true, placeholder: "logan.nock" },
          { name: "address", required: false, placeholder: "8s29XU..." },
        ],
      },
      {
        id: "dev-resolve",
        method: "GET",
        path: "/resolve",
        summary: "Resolve name or address.",
        query: [
          { name: "name", required: false, placeholder: "logan.nock" },
          { name: "address", required: false, placeholder: "8s29XU..." },
        ],
      },
      {
        id: "dev-search",
        method: "GET",
        path: "/search",
        summary: "Search availability or ownership sets.",
        query: [
          { name: "name", required: false, placeholder: "logan" },
          { name: "address", required: false, placeholder: "8s29XU..." },
        ],
      },
      {
        id: "dev-register",
        method: "POST",
        path: "/register",
        summary: "Create pending reservation.",
        dangerous: true,
        bodyTemplate: { address: "", name: "" },
        requiredBodyFields: ["address", "name"],
      },
      {
        id: "dev-claim",
        method: "POST",
        path: "/claim",
        summary: "Promote pending to registered (replaces legacy /verify).",
        dangerous: true,
        bodyTemplate: { address: "", name: "", tx_hash: "" },
        requiredBodyFields: ["address", "name"],
        compatibilityNote: "This is the kernel-authoritative equivalent of legacy /verify.",
      },
      {
        id: "dev-primary",
        method: "POST",
        path: "/primary",
        summary: "Set primary name for an address.",
        dangerous: true,
        bodyTemplate: { address: "", name: "" },
        requiredBodyFields: ["address", "name"],
      },
      {
        id: "dev-settle",
        method: "POST",
        path: "/settle",
        summary: "Settle the current pending claim window.",
        dangerous: true,
        bodyTemplate: {},
        requiredBodyFields: [],
      },
      {
        id: "dev-admin-advance-tip",
        method: "POST",
        path: "/admin/advance-tip-now",
        summary: "Operator admin action (gated server-side).",
        dangerous: true,
        adminOnly: true,
        bodyTemplate: {},
        requiredBodyFields: [],
      },
    ],
  },
  {
    id: "legacy",
    label: "Legacy (Cloudflare worker)",
    endpoints: [
      {
        id: "legacy-verify",
        method: "POST",
        path: "/verify",
        summary: "Legacy payment verification (use POST /claim on VESL testnet).",
        dangerous: true,
        bodyTemplate: { address: "", name: "" },
        requiredBodyFields: ["address", "name"],
        compatibilityNote:
          "The VESL server uses POST /claim with tx_hash; /verify is for older workers only.",
      },
    ],
  },
];

export {
  API_DOCS_BASE_URL,
  API_DOCS_PAYMENT_ADDRESS,
  API_DOCS_DEMO_NAME,
  PLAYGROUND_TESTNET_BASE_URL,
  getPlaygroundFetchBaseUrl,
  apiDocsEndpoints,
  apiDocsQuickstartSnippets,
  playgroundEndpointGroups,
};

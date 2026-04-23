import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRegistrationFlow } from "./use-registration-flow";

const mockPostRegister = vi.fn();
const mockPostVerify = vi.fn();
vi.mock("@/api", () => ({
  postRegister: (...args) => mockPostRegister(...args),
  postVerify: (...args) => mockPostVerify(...args),
}));

function buildWasmMock() {
  class TxBuilder {
    constructor() {}
    simpleSpend() {}
    build() {
      return {
        id: { value: "tx123" },
        toRawTx: () => ({
          toProtobuf: () => "raw-tx",
        }),
      };
    }
    allNotes() {
      return { notes: ["note1"], spendConditions: ["sc1"] };
    }
  }

  class Digest {
    constructor(value) {
      this.value = value;
    }
  }

  return {
    Pkh: {
      single: (addr) => ({ value: addr }),
    },
    SpendCondition: {
      newPkh: (pkh) => ({
        value: `sc-${pkh.value}`,
        firstName: () => ({ value: pkh.value }),
      }),
    },
    Note: {
      // The hook calls `Note.fromProtobuf(n.note)` then reads `.assets` on the
      // result. We let callers influence the asset amount by passing an
      // `{ assets }` object as the protobuf payload; otherwise default to a
      // comfortably-funded 10,000 NOCK note (> 5000 NOCK gift + 100 NOCK
      // network-fee buffer for a 4-char .nock name like "good.nock").
      fromProtobuf: (note) => ({
        value: note,
        assets:
          note && typeof note === "object" && "assets" in note
            ? note.assets
            : BigInt(10_000) * BigInt(65536),
      }),
    },
    TxBuilder,
    Digest,
  };
}

// The hook imports these directly; mock them so tests don't try to load real WASM.
vi.mock("@nockchain/rose-wasm", () => buildWasmMock());

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ADDRESS = "addr123";
const GOOD_NAME = "good.nock"; // 4-char local part → 5000 NOCK gift
const NICKS_PER_NOCK = 65536n;

function makeProvider() {
  return {
    signRawTx: vi.fn(async () => "signed"),
  };
}

function makeRpcClient({ notes, sendResult = { ok: true } } = {}) {
  return {
    getBalanceByFirstName: vi.fn(async () => ({
      notes:
        notes ??
        [
          { note: "note" }, // default funded note (via Note mock default)
        ],
    })),
    sendTransaction: vi.fn(async () => sendResult),
  };
}

function renderFlow(opts = {}) {
  // Use `in` so callers can explicitly pass `provider: null` / `rpcClient: null`
  // to exercise the "not ready" branches without our defaults kicking in.
  const provider = "provider" in opts ? opts.provider : makeProvider();
  const rpcClient = "rpcClient" in opts ? opts.rpcClient : makeRpcClient();
  return renderHook(() => useRegistrationFlow({ provider, rpcClient }));
}

// ---------------------------------------------------------------------------

describe("useRegistrationFlow — initial state", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
    mockPostVerify.mockReset();
  });

  it("starts idle with empty status text and no hash", () => {
    const { result } = renderFlow();
    expect(result.current.status).toBe("idle");
    expect(result.current.statusText).toBe("");
    expect(result.current.transactionHash).toBeUndefined();
    expect(result.current.isProcessing).toBe(false);
  });

  it("exposes registerDomain, verifyPayment, and reset as functions", () => {
    const { result } = renderFlow();
    expect(typeof result.current.registerDomain).toBe("function");
    expect(typeof result.current.verifyPayment).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });
});

describe("useRegistrationFlow.registerDomain — validation", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
    mockPostVerify.mockReset();
  });

  it("rejects invalid names (uppercase, missing suffix, etc.)", async () => {
    const { result } = renderFlow();

    const ret = await act(() => result.current.registerDomain("BadName", ADDRESS));
    expect(ret).toEqual({ ok: false });
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("alphanumeric lowercase");
    expect(mockPostRegister).not.toHaveBeenCalled();
  });

  it("rejects empty names", async () => {
    const { result } = renderFlow();

    await act(() => result.current.registerDomain("", ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(mockPostRegister).not.toHaveBeenCalled();
  });

  it("fails when address is missing", async () => {
    const { result } = renderFlow();

    await act(() => result.current.registerDomain(GOOD_NAME, null));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("connect your wallet");
    expect(mockPostRegister).not.toHaveBeenCalled();
  });

  it("fails when provider is not ready", async () => {
    const { result } = renderFlow({ provider: null });

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("Wallet provider not ready");
    expect(mockPostRegister).not.toHaveBeenCalled();
  });

  it("fails when rpc client is not initialized", async () => {
    const { result } = renderFlow({ rpcClient: null });

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("RPC client not initialized");
    expect(mockPostRegister).not.toHaveBeenCalled();
  });
});

describe("useRegistrationFlow.registerDomain — API response handling", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
    mockPostVerify.mockReset();
  });

  it("fails on address mismatch from the server", async () => {
    mockPostRegister.mockResolvedValue({
      status: "pending",
      name: GOOD_NAME,
      address: "different-address",
    });
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret).toEqual({ ok: false });
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("Address mismatch");
  });

  it("fails on name mismatch from the server", async () => {
    mockPostRegister.mockResolvedValue({
      status: "pending",
      name: "other.nock",
      address: ADDRESS,
    });
    const { result } = renderFlow();

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("Name mismatch");
  });

  it("treats an already-confirmed response as success with no signing", async () => {
    mockPostRegister.mockResolvedValue({
      status: "confirmed",
      name: GOOD_NAME,
      address: ADDRESS,
    });
    const provider = makeProvider();
    const rpcClient = makeRpcClient();
    const { result } = renderFlow({ provider, rpcClient });

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret).toEqual({ ok: true });
    expect(result.current.status).toBe("confirmed");
    expect(result.current.statusText).toBe("Domain registered successfully!");
    // No on-chain activity should happen for an already-confirmed response.
    expect(provider.signRawTx).not.toHaveBeenCalled();
    expect(rpcClient.getBalanceByFirstName).not.toHaveBeenCalled();
    expect(rpcClient.sendTransaction).not.toHaveBeenCalled();
  });

  it("fails when the server returns an unknown status", async () => {
    mockPostRegister.mockResolvedValue({
      status: "weird",
      name: GOOD_NAME,
      address: ADDRESS,
    });
    const { result } = renderFlow();

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("Registration failed");
  });

  it("captures structured error messages from postRegister rejections", async () => {
    mockPostRegister.mockRejectedValue({
      response: { data: { error: "backend went boom" } },
      message: "fallback message",
    });
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret.ok).toBe(false);
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("backend went boom");
  });

  it("falls back to error.message when no structured error is present", async () => {
    mockPostRegister.mockRejectedValue(new Error("network offline"));
    const { result } = renderFlow();

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.statusText).toContain("network offline");
  });
});

describe("useRegistrationFlow.registerDomain — wallet / balance handling", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
    mockPostRegister.mockResolvedValue({
      status: "pending",
      name: GOOD_NAME,
      address: ADDRESS,
    });
  });

  it("fails when the wallet has no notes", async () => {
    const rpcClient = makeRpcClient({ notes: [] });
    const { result } = renderFlow({ rpcClient });

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("No funds available in wallet");
  });

  it("fails when getBalanceByFirstName throws", async () => {
    const rpcClient = makeRpcClient();
    rpcClient.getBalanceByFirstName.mockRejectedValueOnce(
      new Error("rpc unreachable")
    );
    const { result } = renderFlow({ rpcClient });

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret.ok).toBe(false);
    expect(ret.error).toBeDefined();
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("Failed to fetch wallet balance");
  });

  it("fails when the wallet holds exactly the gift amount (no room for fees)", async () => {
    // good.nock → 5000 NOCK gift. Providing a single note of exactly 5000 NOCK
    // should trip the `totalAssets <= amount` guard.
    const giftNicks = 5000n * NICKS_PER_NOCK;
    const rpcClient = makeRpcClient({
      notes: [{ note: { assets: giftNicks } }],
    });
    const { result } = renderFlow({ rpcClient });

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("Insufficient balance");
  });

  it("warns but proceeds when the balance is only a touch above the fee", async () => {
    // good.nock → 5000 NOCK gift. A note of 5001 NOCK exceeds the gift but
    // is below the 100 NOCK fee buffer, so the hook should still sign and
    // send (just log a console warning).
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tightNicks = 5001n * NICKS_PER_NOCK;
      const provider = makeProvider();
      const rpcClient = makeRpcClient({
        notes: [{ note: { assets: tightNicks } }],
      });
      const { result } = renderFlow({ provider, rpcClient });

      await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
      expect(result.current.status).toBe("pending");
      expect(provider.signRawTx).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain("wallet balance");
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("useRegistrationFlow.registerDomain — signing & sending", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
    mockPostRegister.mockResolvedValue({
      status: "pending",
      name: GOOD_NAME,
      address: ADDRESS,
    });
  });

  it("sets pending status and hash after a successful send", async () => {
    const provider = makeProvider();
    const rpcClient = makeRpcClient();
    const { result } = renderFlow({ provider, rpcClient });

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );

    expect(mockPostRegister).toHaveBeenCalledWith(GOOD_NAME, ADDRESS);
    expect(provider.signRawTx).toHaveBeenCalledWith({
      rawTx: "raw-tx",
      notes: ["note1"],
      spendConditions: ["sc1"],
    });
    expect(rpcClient.sendTransaction).toHaveBeenCalledWith("signed");
    expect(result.current.status).toBe("pending");
    expect(result.current.transactionHash).toBe("tx123");
    expect(ret).toEqual({ ok: true, hash: "tx123", result: { ok: true } });
  });

  it("fails when sendTransaction returns a falsy result", async () => {
    const rpcClient = makeRpcClient({ sendResult: null });
    const { result } = renderFlow({ rpcClient });

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret).toEqual({ ok: false });
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe(
      "Transaction send returned no result"
    );
  });

  it("surfaces provider.signRawTx errors as failed status", async () => {
    const provider = makeProvider();
    provider.signRawTx.mockRejectedValueOnce(new Error("user rejected"));
    const { result } = renderFlow({ provider });

    const ret = await act(() =>
      result.current.registerDomain(GOOD_NAME, ADDRESS)
    );
    expect(ret.ok).toBe(false);
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("user rejected");
  });

  it("clears any stale transaction hash at the start of a new attempt", async () => {
    const { result } = renderFlow();

    // First attempt: happy path → sets tx hash
    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.transactionHash).toBe("tx123");

    // Second attempt: validation failure should clear the hash.
    await act(() => result.current.registerDomain("Invalid", ADDRESS));
    expect(result.current.transactionHash).toBeUndefined();
  });
});

describe("useRegistrationFlow.registerDomain — processing state", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
  });

  it("is true during the async flow and false once resolved", async () => {
    // Use a deferred promise so we can observe the in-flight state.
    let resolvePost;
    mockPostRegister.mockImplementation(
      () =>
        new Promise((r) => {
          resolvePost = r;
        })
    );

    const { result } = renderFlow();

    let pending;
    act(() => {
      pending = result.current.registerDomain(GOOD_NAME, ADDRESS);
    });

    // Wait a microtask for the hook to flush its synchronous setStates.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isProcessing).toBe(true);
    expect(["validating", "requesting"]).toContain(result.current.status);

    await act(async () => {
      resolvePost({
        status: "pending",
        name: GOOD_NAME,
        address: ADDRESS,
      });
      await pending;
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.status).toBe("pending");
  });
});

describe("useRegistrationFlow.reset", () => {
  beforeEach(() => {
    mockPostRegister.mockReset();
  });

  it("resets status, statusText, transactionHash, and isProcessing to initial values", async () => {
    mockPostRegister.mockResolvedValue({
      status: "pending",
      name: GOOD_NAME,
      address: ADDRESS,
    });
    const { result } = renderFlow();

    await act(() => result.current.registerDomain(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("pending");
    expect(result.current.transactionHash).toBe("tx123");

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.statusText).toBe("");
    expect(result.current.transactionHash).toBeUndefined();
    expect(result.current.isProcessing).toBe(false);
  });
});

describe("useRegistrationFlow.verifyPayment", () => {
  beforeEach(() => {
    mockPostVerify.mockReset();
  });

  it("rejects invalid names without hitting the API", async () => {
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.verifyPayment("BAD", ADDRESS)
    );
    expect(ret).toEqual({ ok: false });
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("alphanumeric lowercase");
    expect(mockPostVerify).not.toHaveBeenCalled();
  });

  it("fails when the address is missing", async () => {
    const { result } = renderFlow();

    await act(() => result.current.verifyPayment(GOOD_NAME, ""));
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("connect your wallet");
    expect(mockPostVerify).not.toHaveBeenCalled();
  });

  it("fails when the server returns no registration payload", async () => {
    mockPostVerify.mockResolvedValue({
      message: "not yet observed on-chain",
    });
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.verifyPayment(GOOD_NAME, ADDRESS)
    );
    expect(ret).toEqual({ ok: false });
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toBe("not yet observed on-chain");
  });

  it("moves to confirmed when the server reports registered status", async () => {
    mockPostVerify.mockResolvedValue({
      message: "confirmed!",
      registration: {
        status: "registered",
        txHash: "hash-registered",
      },
    });
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.verifyPayment(GOOD_NAME, ADDRESS)
    );
    expect(ret.ok).toBe(true);
    expect(ret.registration.status).toBe("registered");
    expect(result.current.status).toBe("confirmed");
    expect(result.current.statusText).toBe("confirmed!");
    expect(result.current.transactionHash).toBe("hash-registered");
  });

  it("stays pending when the server reports pending status", async () => {
    mockPostVerify.mockResolvedValue({
      message: "payment seen, awaiting confirmations",
      registration: {
        status: "pending",
        txHash: "hash-pending",
      },
    });
    const { result } = renderFlow();

    await act(() => result.current.verifyPayment(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("pending");
    expect(result.current.statusText).toBe(
      "payment seen, awaiting confirmations"
    );
    expect(result.current.transactionHash).toBe("hash-pending");
  });

  it("does not set a transaction hash when the registration omits one", async () => {
    mockPostVerify.mockResolvedValue({
      registration: { status: "registered" }, // no txHash
    });
    const { result } = renderFlow();

    await act(() => result.current.verifyPayment(GOOD_NAME, ADDRESS));
    expect(result.current.status).toBe("confirmed");
    expect(result.current.transactionHash).toBeUndefined();
  });

  it("surfaces postVerify errors as failed status", async () => {
    mockPostVerify.mockRejectedValue({
      response: { data: { error: "verify boom" } },
    });
    const { result } = renderFlow();

    const ret = await act(() =>
      result.current.verifyPayment(GOOD_NAME, ADDRESS)
    );
    expect(ret.ok).toBe(false);
    expect(ret.error).toBeDefined();
    expect(result.current.status).toBe("failed");
    expect(result.current.statusText).toContain("verify boom");
  });
});

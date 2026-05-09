import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, Check, X, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import WalletConnection from "./WalletConnection";
import PendingPaymentAlert from "./PendingPaymentAlert";

export default function RegistrationModal({
  domain,
  isOpen,
  onClose,
  onConfirm,
  onVerify,
  isProcessing = false,
  transactionHash,
  transactionStatus,
  statusText,
  account,
  onAccountChange,
  provider,
  roseStatus,
  roseError,
  isRoseReady = true,
}) {
  const [confirmClickLocked, setConfirmClickLocked] = useState(false);

  // Prevent rapid double-clicks from triggering multiple registration attempts
  // before `isProcessing` flips true in parent state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setConfirmClickLocked(false);
  }, [isOpen, domain?.name]);

  if (!domain) return null;

  const status =
    domain.status ?? (domain.isAvailable ? "available" : "registered");
  const isPending = status === "pending";
  const pendingOwner = isPending ? domain.owner : null;
  const showWalletConnect = !account;

  const isConfirmDisabled =
    !isRoseReady ||
    confirmClickLocked ||
    isProcessing ||
    transactionStatus === "pending" ||
    transactionStatus === "confirmed" ||
    !account ||
    typeof onConfirm !== "function";

  const getStatusDisplay = () => {
    if (!transactionStatus || transactionStatus === "idle") return null;
    const baseStatus = {
      icon: Clock,
      color: "bg-yellow-500",
      text: statusText,
    };

    const statusConfig = {
      building: baseStatus,
      requesting: baseStatus,
      verifying: baseStatus,
      signing: { ...baseStatus, icon: Lock },
      sending: baseStatus,
      pending: { ...baseStatus, icon: AlertTriangle },
      confirmed: { icon: Check, color: "bg-green-500", text: statusText },
      failed: { icon: X, color: "bg-red-500", text: statusText },
    };

    const config = statusConfig[transactionStatus] ?? {
      icon: X,
      color: "bg-red-500",
      text: statusText,
    };
    const Icon = config.icon;

    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
        <div className={`p-2 rounded-full shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium break-words">{config.text}</p>
          {transactionHash && (
            <p className="text-sm text-muted-foreground font-mono break-all">
              {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-testid="modal-registration"
        className="sm:max-w-md web3-glow bg-background"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Register Nock Name</span>
            {status === "available" ? (
              <Badge
                variant="default"
                className="border-transparent bg-chart-2 text-white shadow-xs cursor-default transition-colors hover:bg-emerald-900/90 hover:text-white"
              >
                Available
              </Badge>
            ) : status === "pending" ? (
              <Badge
                variant="secondary"
                className="cursor-default border-transparent bg-yellow-500 text-black transition-colors hover:bg-yellow-600 hover:text-black"
              >
                Pending
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="cursor-default border border-dashed border-border bg-muted/90 text-muted-foreground opacity-90 transition-colors hover:border-border hover:bg-muted hover:text-muted-foreground"
              >
                Registered
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Domain Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-mono font-semibold">
                {domain.name}
              </span>
            </div>
            {!isPending && (
              <div className="space-y-3 p-4 rounded-lg bg-muted">
                <div className="flex justify-between">
                  <span className="text-sm">Price</span>
                  <span className="font-mono">{domain.price} NOCK</span>
                </div>
                <Separator />
                <label className="text-sm">Address:</label>
                {status === "pending" && pendingOwner ? (
                  <div className="text-xs text-muted-foreground">
                    Pending address:{" "}
                    <span className="font-mono">
                      {pendingOwner.slice(0, 6)}...{pendingOwner.slice(-4)}
                    </span>
                  </div>
                ) : null}
                {status === "pending" && showWalletConnect ? (
                  <p className="text-xs text-muted-foreground">
                    Connect your wallet to complete payment.
                  </p>
                ) : showWalletConnect ? (
                  <WalletConnection
                    provider={provider}
                    onAccountChange={onAccountChange}
                  />
                ) : (
                  <div className="font-mono text-sm bg-background px-3 py-2 rounded border">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Payment instructions (pending) */}
          {isPending && (
            <PendingPaymentAlert
              price={domain.price}
              name={domain.name}
              createdAt={domain.registeredAt ?? domain.timestamp}
            />
          )}

          {/* Transaction Status */}
          {getStatusDisplay()}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === "pending" ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () =>
                await onVerify?.(domain.name, pendingOwner ?? null)
              }
              disabled={
                !isRoseReady ||
                isProcessing ||
                !pendingOwner ||
                !onVerify
              }
              data-testid="button-verify-payment"
            >
              Verify Payment
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isProcessing && transactionStatus === "pending"}
              data-testid="button-cancel-registration"
            >
              {transactionStatus === "confirmed" ? "Close" : "Cancel"}
            </Button>
          )}
          {status === "pending" && showWalletConnect ? (
            <div className="flex-1">
              <WalletConnection
                provider={provider}
                onAccountChange={onAccountChange}
              />
            </div>
          ) : (
            <Button
              className="flex-1 web3-gradient text-primary-foreground no-default-hover-elevate no-default-active-elevate enabled:hover:!bg-[#333333]"
              disabled={isConfirmDisabled}
              onClick={async () => {
                if (isConfirmDisabled) return;
                setConfirmClickLocked(true);
                try {
                  await onConfirm(domain.name);
                } finally {
                  setConfirmClickLocked(false);
                }
              }}
              data-testid="button-confirm-registration"
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : transactionStatus === "confirmed" ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Registered
                </>
              ) : (
                `Pay ${domain.price} NOCK`
              )}
            </Button>
          )}
        </div>

        {!isRoseReady && (
          <p className="text-xs text-muted-foreground">
            {roseStatus === "error"
              ? `Rose initialization failed: ${roseError?.message ?? String(roseError)}`
              : "Initializing Rose…"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

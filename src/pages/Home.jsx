import { useState } from "react";
import {
  Search,
  Wallet,
  ArrowLeftRight,
  FileText,
  Code2,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import DomainSearch from "@/components/DomainSearch";
import DomainCard from "@/components/DomainCard";
import DomainSuggestions from "@/components/DomainSuggestions";
import RecentlyRegistered from "@/components/RecentlyRegistered";
import WalletConnection from "@/components/WalletConnection";
import RegistrationModal from "@/components/RegistrationModal";
import PendingPaymentAlert from "@/components/PendingPaymentAlert";
import PricingCard from "@/components/PricingCard";
import ThemeToggle from "@/components/ThemeToggle";
import { useRegistrationFlow } from "@/hooks/use-registration-flow";
import {
  useDomainSearch,
  useSuggestions,
  useAddressPortfolioQuery,
} from "@/hooks/use-queries";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoMark from "@/assets/nns-mark.png";
import { scrollWindowTop } from "@/lib/utils";

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Resolve",
    description:
      "Bidirectional lookup between human-readable .nock names and raw Nockchain addresses via the public resolver API.",
  },
  {
    icon: Wallet,
    title: "Register",
    description:
      "Reserve a name with one click, then pay the fee in $NOCK from your wallet. On-chain verification finalizes ownership.",
  },
  {
    icon: ArrowLeftRight,
    title: "Transfer",
    description:
      "Memo-based ownership transfers (coming with the full NNS protocol). Track the roadmap on the grant page.",
  },
];

export default function Home() {
  const rose = useWallet();
  const {
    provider,
    status: roseStatus,
    error: roseError,
    isReady: isRoseReady,
  } = rose;
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    status: transactionStatus,
    statusText,
    transactionHash,
    isProcessing: isRegistering,
    registerDomain,
    verifyPayment,
    reset: resetRegistration,
  } = useRegistrationFlow(rose);
  const [searchTerm, setSearchTerm] = useState("");
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [copied, setCopied] = useState(false);

  const searchQuery = useDomainSearch(searchTerm);
  const suggestionsQuery = useSuggestions(
    searchTerm,
    Boolean(searchQuery.data && searchQuery.data.status !== "available")
  );
  const portfolioQuery = useAddressPortfolioQuery(connectedAccount);
  const pendingDomains = (portfolioQuery.data ?? []).filter(
    (d) => d.status === "pending"
  );

  const searchResults = searchQuery.data ? [searchQuery.data] : [];
  const suggestions = suggestionsQuery.data || [];
  const isLoading = searchQuery.isFetching || suggestionsQuery.isFetching;

  const handleSearch = async (domain) => {
    setSearchTerm(domain);
    scrollWindowTop();
  };

  const handleRegister = (domain) => {
    resetRegistration();
    setSelectedDomain(domain);
    setIsModalOpen(true);
  };

  const handleConfirmRegistration = async (name) => {
    if (!isRoseReady) return;
    await registerDomain(name, connectedAccount);
  };

  const handleVerifyPayment = async (name, addressOverride) => {
    if (!isRoseReady) return;
    await verifyPayment(name, addressOverride ?? connectedAccount);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDomain(null);
    resetRegistration();
  };

  const handleCopyQuickstart = async () => {
    try {
      await navigator.clipboard.writeText(
        "curl 'https://api.nocknames.com/resolve?name=logan.nock'"
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-background no-default-hover-elevate">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-[2px]">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <img
                src={logoMark}
                alt="NNS — Nockchain Name Service"
                className="h-9 w-auto object-contain md:h-10"
              />
              <span className="pill-label">Beta</span>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <Link
                href="/lookup"
                className="nav-bracket"
                data-testid="button-navigate-lookup"
              >
                <Search className="h-3.5 w-3.5 opacity-70" />
                Lookup
              </Link>
              <Link href="/grant" className="nav-bracket">
                <FileText className="h-3.5 w-3.5 opacity-70" />
                Grant
              </Link>
              <Link href="/developers" className="nav-bracket">
                <Code2 className="h-3.5 w-3.5 opacity-70" />
                API Docs
              </Link>

              {connectedAccount && (
                <Link href="/my-nock" className="nav-bracket">
                  <Wallet className="h-3.5 w-3.5 opacity-70" />
                  My Names
                </Link>
              )}
              <ThemeToggle />
              <WalletConnection
                provider={provider}
                onAccountChange={setConnectedAccount}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Pending Payment Alerts (connected wallet) */}
      {pendingDomains.length > 0 && (
        <section className="px-4 pb-4 pt-6">
          <div className="container mx-auto max-w-3xl space-y-3">
            <div className="text-sm font-medium text-foreground">
              {pendingDomains.length === 1
                ? "You have a nock name awaiting payment!"
                : `You have ${pendingDomains.length} names awaiting payment`}
            </div>
            {pendingDomains.map((domain) => (
              <PendingPaymentAlert
                key={domain.id ?? domain.name}
                name={domain.name}
                price={domain.price}
                createdAt={domain.registeredAt ?? domain.timestamp}
                onComplete={() => handleRegister(domain)}
                isProcessing={isRegistering}
                isDisabled={!isRoseReady}
              />
            ))}
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section
        className={`relative px-4 nns-circuit-bg overflow-hidden ${searchResults.length > 0 ? "py-10" : "py-16"
          }`}
      >
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 lg:gap-12 items-start">
            {/* Left: brand + search */}
            <div className="text-center">
              {searchResults.length === 0 && (
                <>
                  <div className="flex justify-center mb-6">
                    <img
                      src={logoMark}
                      alt="Nockchain Name Service"
                      className="h-16 w-16 md:h-20 md:w-20 rounded-md object-contain shadow-md ring-1 ring-border"
                    />
                  </div>

                  <p className="font-label text-muted-foreground mb-5">
                    Nockchain Name Service
                  </p>
                  <h1 className="mb-5 leading-[1.02] text-center">
                    <span className="font-display block text-5xl md:text-8xl tracking-tight text-foreground">
                      .NOCK
                    </span>
                    <span className="font-display block text-2xl md:text-5xl tracking-tight text-muted-foreground mt-2">
                      NAMES
                    </span>
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                    Human-readable{" "}
                    <span className="font-mono text-foreground">.nock</span>{" "}
                    names that resolve to any Nockchain address. Register
                    yours, or build on the public resolver API.
                  </p>
                </>
              )}

              <DomainSearch onSearch={handleSearch} isLoading={isLoading} />

              {/* Search Results — directly below the search box */}
              {searchResults.length > 0 && (
                <div className="mt-8 text-left">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-1">
                      Search Results
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Results for "
                      <span className="font-mono">{searchTerm}</span>"
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {searchResults.map((domain) => (
                      <DomainCard
                        key={domain.name}
                        domain={domain}
                        onRegister={handleRegister}
                        isRegistering={isRegistering}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-6 text-left">
                  <DomainSuggestions
                    originalSearch={searchTerm}
                    suggestions={suggestions}
                    onRegister={handleRegister}
                    isRegistering={isRegistering}
                  />
                </div>
              )}

              {/* Empty state: sample domains to try */}
              {searchResults.length === 0 && !isLoading && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Try one of these to get started:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      "logan.nock",
                      "xbox.nock",
                      "fbi.nock",
                      "future.nock",
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        className="p-4 rounded-lg border hover-elevate cursor-pointer glassmorphism web3-glow-hover"
                        onClick={() => handleSearch(sample)}
                      >
                        <span className="font-mono text-sm">{sample}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Recently Registered activity feed (above the fold) */}
            <div className="w-full">
              <RecentlyRegistered
                limit={6}
                variant="sidebar"
                className="h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 border-t border-border no-default-hover-elevate">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto">
            <PricingCard />
          </div>
        </div>
      </section>

      {/* How NNS works */}
      <section className="py-16 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="font-label text-muted-foreground mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              How NNS works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              NNS turns raw Nockchain addresses into memorable{" "}
              <span className="font-mono text-foreground">.nock</span> domains.
              Three primitives, powered by memo-based on-chain records.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <Card
                key={step.title}
                className="glassmorphism web3-glow-hover relative overflow-hidden"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Build on NNS */}
      <section className="py-16 px-4 border-t border-border">
        <div className="container mx-auto max-w-5xl">
          <Card className="glassmorphism overflow-hidden">
            <CardContent className="p-8 md:p-10">
              <div className="grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
                <div>
                  <span className="pill-label mb-3 inline-flex items-center gap-1.5">
                    <Code2 className="h-3 w-3" />
                    Build on NNS
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">
                    One HTTP call away
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    A small, public JSON API for resolving, searching, and
                    registering <span className="font-mono">.nock</span> names.
                    No auth. CORS enabled. Run it from any wallet, dApp, or
                    explorer.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/developers">
                      <Button className="gap-2 web3-gradient border-0 text-primary-foreground uppercase tracking-[0.1em] text-xs font-bold no-default-hover-elevate no-default-active-elevate enabled:hover:!bg-[#333333]">
                        <Code2 className="h-4 w-4" />
                        Read the API docs
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <a
                      href="https://github.com/nocktoshi"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        GitHub
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="relative">
                  <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed font-mono">
                    <code>{`curl 'https://api.nns.id/resolve?name=logan.nock'

# → { "address": "8s29XU...TT5" }`}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyQuickstart}
                    aria-label="Copy quickstart"
                    className="absolute top-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Registry Address Banner */}
      <div className="bg-muted/50 border-t border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <div>
              <span className="font-medium text-foreground">
                NNS payments address:
              </span>
            </div>
            <code className="bg-background px-2 py-1 rounded text-xs font-mono inline-block">
              nns.nock =&gt;
              8s29XUK8Do7QWt2MHfPdd1gDSta6db4c3bQrxP1YdJNfXpL3WPzTT5
            </code>
            <div>
              <code className="bg-background px-2 py-1 rounded text-xs font-mono inline-block">
                Questions? Contact @nocktoshi on Telegram
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img
                src={logoMark}
                alt="NNS"
                className="h-6 w-auto object-contain"
              />
              <span>• Nockchain Name Service</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/grant" className="hover:text-foreground transition-colors">
                Grant
              </Link>
              <Link
                href="/developers"
                className="hover:text-foreground transition-colors"
              >
                API
              </Link>
              <a
                href="https://github.com/nocktoshi"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
            <p>&copy; 2026 nockchain.net, LLC. Built on Nockchain.</p>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      <RegistrationModal
        domain={selectedDomain}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmRegistration}
        onVerify={handleVerifyPayment}
        isProcessing={isRegistering}
        transactionHash={transactionHash}
        transactionStatus={transactionStatus}
        statusText={statusText}
        account={connectedAccount}
        onAccountChange={setConnectedAccount}
        provider={provider}
        isRoseReady={isRoseReady}
        roseStatus={roseStatus}
        roseError={roseError}
      />
    </div>
  );
}

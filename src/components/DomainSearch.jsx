import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DomainSearch({ onSearch, isLoading = false }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim().toLowerCase());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            data-testid="input-domain-search"
            id="domain-search-input"
            type="text"
            placeholder="Search for a .nock name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-32 h-14 text-base md:text-lg rounded-md border-2 border-border bg-[hsl(var(--input))] text-foreground placeholder:text-muted-foreground font-mono font-semibold shadow-[inset_0_1px_2px_rgba(25,25,26,0.06)] focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground dark:border-foreground/25"
            disabled={isLoading}
          />
          <Button
            data-testid="button-search-domain"
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 px-5 rounded-md web3-gradient text-primary-foreground uppercase tracking-[0.1em] text-xs font-bold shadow-sm no-default-hover-elevate no-default-active-elevate enabled:hover:!bg-[#333333] transition-colors"
            disabled={!searchTerm.trim() || isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>
    </div>
  );
}
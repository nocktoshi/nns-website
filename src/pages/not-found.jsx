import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoMark from "@/assets/nns-mark.png";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background no-default-hover-elevate nns-circuit-bg">
      <Card className="w-full max-w-md mx-4 glassmorphism">
        <CardContent className="p-8 text-center space-y-5">
          <div className="flex justify-center">
            <img
              src={logoMark}
              alt="NNS"
              className="h-14 w-auto object-contain drop-shadow-[0_0_24px_rgba(246,169,58,0.35)]"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="text-2xl font-bold">404 · Not found</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            That page doesn't resolve. Check the URL or head back to search for
            a <span className="font-mono">.nock</span> name.
          </p>
          <Link href="/">
            <Button className="gap-2 web3-gradient border-0">
              <ArrowLeft className="h-4 w-4" />
              Back to NNS
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div>
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl gradient-bg text-white shadow-lg shadow-primary/30">
          <Compass className="size-8" />
        </div>
        <h1 className="text-5xl font-bold gradient-text">404</h1>
        <p className="mt-3 text-lg font-medium">This path leads nowhere</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The page you are looking for could not be found. Let&apos;s get you back on track.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/algorithms">
              <Compass /> Browse algorithms
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router";
import { Button } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-[56px] font-bold leading-none tracking-tight text-muted">404</p>
      <p className="text-title font-semibold text-text">Page not found</p>
      <p className="text-callout text-muted">That link doesn’t lead anywhere.</p>
      <Link to="/">
        <Button>Back to Overview</Button>
      </Link>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Builds page links that preserve whatever other query params are already
// set (filters, search, sort), so paging through results doesn't reset them.
export function Pagination({
  basePath,
  currentPage,
  totalPages,
  extraParams = {},
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {currentPage > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={hrefForPage(currentPage - 1)}>Previous</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <span className="text-sm text-neutral-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={hrefForPage(currentPage + 1)}>Next</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </div>
  );
}

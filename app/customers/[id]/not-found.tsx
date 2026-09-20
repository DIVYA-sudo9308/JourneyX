import { NotFoundView } from "@/components/customer/not-found-view";

/** Boundary fallback for any page-level notFound() in this segment. */
export default function CustomerNotFound() {
  return <NotFoundView />;
}

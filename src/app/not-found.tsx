import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-sm p-8 text-center">
      <div className="font-display text-3xl font-extrabold">Off track</div>
      <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist, or it was removed.</p>
      <Link href="/" className="btn btn-primary mt-5">Back to the pits</Link>
    </div>
  );
}

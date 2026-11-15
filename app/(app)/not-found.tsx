import Link from "next/link";
export default function NotFound() {
  return (
    <div>
      <h1>That page doesn't exist</h1>
      <p className="text-muted mt-2">It may have been removed. <Link href="/" className="underline">Go to today's actions</Link>.</p>
    </div>
  );
}

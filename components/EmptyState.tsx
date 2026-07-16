import Link from "next/link";
export function EmptyState({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return <div className="card text-center"><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-sf-muted">{body}</p><Link className="btn-primary mt-5" href={href}>{cta}</Link></div>;
}

import { findNavigationItem } from '@ui/navigation/app-navigation';

interface PlaceholderPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

function titleFromPath(pathname: string): string {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) => part.replaceAll('-', ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

export default async function PlaceholderPage({ params }: PlaceholderPageProps) {
  const resolvedParams = await params;
  const pathname = `/${resolvedParams.slug.join('/')}`;
  const item = findNavigationItem(pathname);
  const title = item?.title ?? titleFromPath(pathname);

  return (
    <main className="shell">
      <div className="mx-auto max-w-5xl">
        <div className="surface rounded-lg p-6">
          <p className="text-sm font-medium uppercase text-[var(--accent)]">React route shell</p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]">
            This route is wired into the React navigation. The Svelte feature logic for this page still needs to be ported.
          </p>
          <p className="mt-6 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-[var(--text-soft)]">
            {pathname}
          </p>
        </div>
      </div>
    </main>
  );
}

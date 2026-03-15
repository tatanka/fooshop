export function FooshopBadge({ slug }: { slug: string }) {
  const href = `/?ref=store-badge&store=${encodeURIComponent(slug)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-xs text-white shadow-lg transition-opacity hover:opacity-90 sm:text-[13px]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      Sell on <span className="font-semibold">Fooshop</span> — it&apos;s free
    </a>
  );
}

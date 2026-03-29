export default function Footer() {
  return (
    <footer className="mt-10 border-t border-border-default bg-bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">
          Made by{' '}
          <span className="text-accent hover:text-accent-hover transition-colors">@iam_p2</span>
        </span>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Powered by</span>
          <img className="w-20 opacity-80" src="./algorand_logo_white.png" alt="Algorand" />
        </div>
      </div>
    </footer>
  )
}

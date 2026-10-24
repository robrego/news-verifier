export default function MadeByR({ label = "Made by", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      href="https://www.robertosalodini.com"
      target="_blank"
      rel="noopener"
      aria-label={`${label} Roberto Salodini`}
      title="Roberto Salodini"
      className={`inline-flex items-center gap-1.5 hover:opacity-70 ${className}`}
    >
      <span>{label}</span>
      <svg viewBox="0 0 512 512" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round"><path d="M32 450 L178 148 L470 52 L262 276 L355 452" /></svg>
    </a>
  );
}

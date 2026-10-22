type Props = {
  title: string;
  phase: string;
  blurb: string;
};

export function PlaceholderPage({ title, phase, blurb }: Props) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {phase}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm text-ink-muted">{blurb}</p>
    </div>
  );
}

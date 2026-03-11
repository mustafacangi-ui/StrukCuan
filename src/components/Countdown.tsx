const CountdownBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="rounded-lg bg-secondary border border-primary/20 px-4 py-2 font-display text-2xl font-bold text-primary glow-green-text tracking-widest" style={{ fontVariantNumeric: 'tabular-nums', fontFamily: '"Space Grotesk", monospace' }}>
      {value}
    </div>
    <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
  </div>
);

const Countdown = () => {
  return (
    <div className="mx-4 mt-3">
      <p className="text-xs text-muted-foreground mb-2 text-center">Undian dalam:</p>
      <div className="flex items-center justify-center gap-2">
        <CountdownBlock value="02" label="Hari" />
        <span className="text-2xl font-bold text-primary mt-[-16px] glow-green-text animate-pulse">:</span>
        <CountdownBlock value="14" label="Jam" />
        <span className="text-2xl font-bold text-primary mt-[-16px] glow-green-text animate-pulse">:</span>
        <CountdownBlock value="37" label="Menit" />
      </div>
    </div>
  );
};

export default Countdown;

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function StarRating({ value, max = 5, onChange, size = "md", readOnly = false }: StarRatingProps) {
  const sz = sizeMap[size];
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(i + 1)}
            className={`${sz} transition-colors ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
            aria-label={`${i + 1} star`}
          >
            <svg viewBox="0 0 24 24" className={`${sz} ${filled ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export function StarDisplay({ value, count }: { value: number; count: number }) {
  if (count === 0) return <span className="text-sm text-muted-foreground">अजून रेटिंग नाही</span>;
  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={Math.round(value)} readOnly size="sm" />
      <span className="text-sm font-semibold text-foreground">{value.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count} रेटिंग)</span>
    </div>
  );
}

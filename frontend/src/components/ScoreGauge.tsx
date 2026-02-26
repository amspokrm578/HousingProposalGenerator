interface Props {
  score: number | null;
  size?: "sm" | "md";
}

export default function ScoreGauge({ score, size = "md" }: Props) {
  if (score === null) {
    return <span className="text-sm text-slate-400">N/A</span>;
  }

  const color =
    score >= 75
      ? "text-emerald-600"
      : score >= 50
        ? "text-amber-500"
        : "text-red-500";

  const dim = size === "sm" ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg";

  return (
    <div
      className={`${dim} ${color} flex items-center justify-center rounded-full border-2 border-current font-bold`}
    >
      {Math.round(score)}
    </div>
  );
}

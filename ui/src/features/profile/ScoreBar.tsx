import { motion } from 'framer-motion';


interface ScoreBarProps {
  value: number;
  label?: string;
}


function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}


export const ScoreBar = ({ value, label }: ScoreBarProps) => {
  const pct = clamp(value) * 100;

  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-flint">{label}</span>
          <span className="text-xs font-bold text-espresso">{Math.round(pct)}%</span>
        </div>
      ) : null}

      <div className="h-2 rounded-full bg-amber/15 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-olive"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      </div>
    </div>
  );
};

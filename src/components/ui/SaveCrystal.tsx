type SaveCrystalProps = {
  size?: number;
  className?: string;
};

/**
 * FF save-point crystal — used inside the "Save review" button.
 */
export function SaveCrystal({ size = 14, className }: SaveCrystalProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crystal-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E1ECF8" />
          <stop offset="1" stopColor="#5B91D4" />
        </linearGradient>
      </defs>
      <path
        d="M9 1.5 L16 6 L13 16.5 L5 16.5 L2 6 Z"
        fill="url(#crystal-g)"
        stroke="#2F5B95"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 1.5 L9 16.5 M2 6 L16 6"
        stroke="#2F5B95"
        strokeWidth="1"
        opacity="0.55"
      />
    </svg>
  );
}

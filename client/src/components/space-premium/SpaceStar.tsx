export function SpaceStar({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2L13.2 9.8L21 11L13.2 12.2L12 20L10.8 12.2L3 11L10.8 9.8L12 2Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

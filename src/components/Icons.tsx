// Shared line-icon set. Replaces the emoji that were used as iconography —
// emoji render inconsistently across platforms and read as placeholder art.
// All icons inherit currentColor and default to 1em so they size with text.

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-5 h-5"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9a2 2 0 0 1 2-2h1.2a2 2 0 0 0 1.664-.89l.646-.97A2 2 0 0 1 10.174 4h3.652a2 2 0 0 1 1.664.89l.646.97A2 2 0 0 0 17.8 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
    <circle cx="12" cy="13" r="3.2" />
  </Icon>
);

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m3.5 17 4.5-4.5a2 2 0 0 1 2.8 0l3.2 3.2m0 0 2-2a2 2 0 0 1 2.8 0l1.7 1.7m-6.5.3 1.5 1.5" />
  </Icon>
);

export const VideoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
    <path d="m15.5 10.5 4.2-2.4a.8.8 0 0 1 1.3.7v6.4a.8.8 0 0 1-1.3.7l-4.2-2.4" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M8 5.14v13.72a.6.6 0 0 0 .92.5l10.7-6.86a.6.6 0 0 0 0-1l-10.7-6.86a.6.6 0 0 0-.92.5Z" />
  </Icon>
);

export const QrIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3h-3zM21 14v3M18 21h3M14 21h1" />
  </Icon>
);

export const TvIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="4" width="19" height="13" rx="2.5" />
    <path d="M8 21h8" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21" />
    <path d="m7 15 3.5-4 3 2.5L20 7" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6h17M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
    <path d="M18.5 6 18 19.5A1.5 1.5 0 0 1 16.5 21h-9A1.5 1.5 0 0 1 6 19.5L5.5 6" />
    <path d="M10 10.5v6M14 10.5v6" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4m0 0L7 9m5-5 5 5" />
    <path d="M20 16.5v2A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-2" />
  </Icon>
);

export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.9 5.6L19.5 10.5 13.9 12.4 12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3Z" />
    <path d="M19 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const ZoomIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M11 8.5v5M8.5 11h5" />
  </Icon>
);

/** Brand-consistent loading spinner used on every route. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-8 w-8 rounded-full border-2 border-ink-200 border-t-ink-900 animate-spin ${className}`}
    />
  );
}

/** Full-page loading state — keeps every route's loader identical. */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <Spinner />
    </div>
  );
}

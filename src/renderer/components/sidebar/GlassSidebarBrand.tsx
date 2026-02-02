/**
 * GlassSidebarBrand - Logo/brand area for the Glass Sidebar
 *
 * Displays at the top of the rail with optional click handler.
 */

export interface GlassSidebarBrandProps {
  /** Logo image src or React node */
  logo?: React.ReactNode;
  /** App name (shown on hover or in expanded mode) */
  name?: string;
  /** Version string */
  version?: string;
  /** Click handler (e.g., navigate to home) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function GlassSidebarBrand({
  logo,
  name = 'Blueprint',
  onClick,
  className = '',
}: GlassSidebarBrandProps) {
  const content = (
    <>
      {logo ? (
        <span className="text-2xl">{logo}</span>
      ) : (
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          B
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`
          group flex items-center justify-center
          transition-transform hover:scale-105
          ${className}
        `}
        title={name}
        aria-label={`${name} - Go to home`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      title={name}
      aria-label={name}
    >
      {content}
    </div>
  );
}

export default GlassSidebarBrand;

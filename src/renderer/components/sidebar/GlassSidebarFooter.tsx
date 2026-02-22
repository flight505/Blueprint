/**
 * GlassSidebarFooter - Footer area for the Glass Sidebar
 *
 * Can display version info, user avatar, or other persistent elements.
 */

export interface GlassSidebarFooterProps {
  /** Version string to display */
  version?: string;
  /** User avatar (React node or image URL) */
  userAvatar?: React.ReactNode | string;
  /** User name (for tooltip) */
  userName?: string;
  /** Click handler for user area */
  onUserClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function GlassSidebarFooter({
  version,
  userAvatar,
  userName,
  onUserClick,
  className = '',
}: GlassSidebarFooterProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* User avatar */}
      {userAvatar && (
        <button
          onClick={onUserClick}
          className="w-8 h-8 rounded-full overflow-hidden bg-surface-raised hover:ring-2 hover:ring-purple-400/50 transition-all"
          title={userName || 'User'}
          aria-label={userName ? `User: ${userName}` : 'User menu'}
        >
          {typeof userAvatar === 'string' ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            userAvatar
          )}
        </button>
      )}

      {/* Version info */}
      {version && (
        <span
          className="text-[9px] text-fg-muted font-mono"
          title={`Version ${version}`}
        >
          v{version}
        </span>
      )}
    </div>
  );
}

export default GlassSidebarFooter;

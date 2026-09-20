import { ReactNode } from 'react';

interface GlassButtonProps {
  children?: ReactNode;
  text?: string;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  width?: string;
  height?: string;
  transitionRadius?: string;
  variant?: 'default' | 'large' | 'small';
}

export default function GlassButton({
  children,
  text,
  onClick,
  icon,
  className = '',
  width,
  height,
  transitionRadius = '15%',
  variant = 'default',
}: GlassButtonProps) {
  const sizeStyles: Record<string, { w: string; h: string; textSize: string; iconSize: number }> = {
    small: { w: '180px', h: '55px', textSize: '16px', iconSize: 32 },
    default: { w: width || '260px', h: height || '75px', textSize: '22px', iconSize: 40 },
    large: { w: width || '320px', h: height || '85px', textSize: '26px', iconSize: 48 },
  };

  const size = sizeStyles[variant];

  return (
    <div className={`glass-btn-container ${className}`}>
      <button
        className="glass-btn"
        onClick={onClick}
        style={{
          '--btn-w': size.w,
          '--btn-h': size.h,
          '--btn-tr': transitionRadius,
          '--btn-text-size': size.textSize,
          '--btn-icon-size': `${size.iconSize}px`,
        } as React.CSSProperties}
      >
        {text && <span className="glass-btn-text">{text}</span>}
        {children}
        {icon && (
          <div className="glass-btn-icon">
            {icon}
          </div>
        )}
        <div className="glass-btn-circle" />
      </button>
    </div>
  );
}

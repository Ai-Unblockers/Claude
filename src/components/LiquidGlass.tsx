import { useRef, useEffect, useState, ReactNode } from 'react';

interface LiquidGlassProps {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'button' | 'card' | 'input';
  shine?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
}

export default function LiquidGlass({
  children = null,
  className = '',
  variant = 'default',
  shine = false,
  intensity = 'medium',
}: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
    };

    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const baseClass =
    variant === 'button'
      ? 'liquid-glass-btn'
      : variant === 'card'
      ? 'liquid-glass-card'
      : 'liquid-glass';

  const shineClass = shine ? 'liquid-glass-shine' : '';

  // Dynamic specular highlight based on cursor
  const specularStyle = {
    background: `radial-gradient(
      600px circle at ${mousePos.x}% ${mousePos.y}%,
      rgba(255, 255, 255, ${intensity === 'strong' ? 0.18 : intensity === 'light' ? 0.06 : 0.12}),
      transparent 40%
    )`,
  };

  return (
    <div ref={ref} className={`relative ${baseClass} ${shineClass} ${className}`}>
      {/* Dynamic specular highlight */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={specularStyle}
      />
      {/* Content */}
      <div className="relative z-20">{children}</div>
    </div>
  );
}

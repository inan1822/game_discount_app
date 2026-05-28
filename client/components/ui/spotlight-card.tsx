"use client"

import React, { useEffect, useRef, ReactNode, CSSProperties } from 'react';

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  /** When provided, pins the spotlight to a fraction (0..1) of the card's own box instead of tracking the cursor. */
  pinned?: { xp: number; yp: number } | null;
  style?: CSSProperties;
}

const glowColorMap = {
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  red:    { base: 0,   spread: 200 },
  orange: { base: 30,  spread: 200 },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false,
  pinned = null,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    // Snap spotlight to pinned corner (called on mount, resize, scroll, and pointer leave)
    const applyPinned = () => {
      if (!pinned || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = rect.left + rect.width  * pinned.xp;
      const y = rect.top  + rect.height * pinned.yp;
      cardRef.current.style.setProperty('--x',  x.toFixed(2));
      cardRef.current.style.setProperty('--y',  y.toFixed(2));
      cardRef.current.style.setProperty('--xp', pinned.xp.toFixed(2));
      cardRef.current.style.setProperty('--yp', pinned.yp.toFixed(2));
    };
    applyPinned();
    window.addEventListener('resize', applyPinned);
    window.addEventListener('scroll', applyPinned, true);

    // While cursor is over the card, follow it
    // xp is relative to the card width so left edge=0 (purple) and right edge=1 (green)
    const syncPointer = (e: PointerEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const xp = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const yp = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height));
      cardRef.current.style.setProperty('--x',  e.clientX.toFixed(2));
      cardRef.current.style.setProperty('--xp', xp.toFixed(2));
      cardRef.current.style.setProperty('--y',  e.clientY.toFixed(2));
      cardRef.current.style.setProperty('--yp', yp.toFixed(2));
    };

    // When cursor leaves, snap back to pinned corner so glow stays visible
    const onLeave = () => applyPinned();

    el.addEventListener('pointermove', syncPointer);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', syncPointer);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', applyPinned);
      window.removeEventListener('scroll', applyPinned, true);
    };
  }, [pinned]);

  const { base, spread } = glowColorMap[glowColor];

  const getSizeClasses = () => (customSize ? '' : sizeMap[size]);

  const getInlineStyles = (): CSSProperties => {
    const baseStyles: Record<string, unknown> = {
      '--base': base,
      '--spread': spread,
      '--radius': '14',
      '--border': '3',
      '--backdrop': 'hsl(0 0% 60% / 0.12)',
      '--backup-border': 'var(--backdrop)',
      '--size': '200',
      '--outer': '1',
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
      )`,
      backgroundColor: 'var(--backdrop, transparent)',
      backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
      backgroundPosition: '50% 50%',
      backgroundAttachment: 'fixed',
      border: 'var(--border-size) solid var(--backup-border)',
      position: 'relative',
      touchAction: 'none',
    };

    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return { ...(baseStyles as CSSProperties), ...style };
  };

  const beforeAfterStyles = `
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-attachment: fixed;
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }
    [data-glow]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, 1)), transparent 100%
      );
      filter: brightness(2);
    }
    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 100% 100% / var(--border-light-opacity, 1)), transparent 100%
      );
    }
    [data-glow] [data-glow] {
      position: absolute;
      inset: 0;
      will-change: filter;
      opacity: var(--outer, 1);
      border-radius: calc(var(--radius) * 1px);
      border-width: calc(var(--border-size) * 20);
      filter: blur(calc(var(--border-size) * 10));
      background: none;
      pointer-events: none;
      border: none;
    }
    [data-glow] > [data-glow]::before {
      inset: -10px;
      border-width: 10px;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        className={`
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4]' : ''}
          rounded-2xl
          relative
          shadow-[0_1rem_2rem_-1rem_black]
          p-4
          backdrop-blur-[5px]
          ${className}
        `}
      >
        <div data-glow />
        {children}
      </div>
    </>
  );
};

export { GlowCard };

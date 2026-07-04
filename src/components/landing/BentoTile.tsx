import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BentoTileProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  /** Accent variant renders on primary blue */
  accent?: boolean;
  style?: React.CSSProperties;
}

const BentoTile = ({
  icon: Icon,
  title,
  description,
  children,
  className = '',
  accent = false,
  style,
}: BentoTileProps) => {
  return (
    <div
      style={style}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[2rem] p-6 sm:p-8 animate-fade-in',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        accent
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'bg-card border border-border shadow-sm',
        className,
      )}
    >
      {/* Ambient corner glow (non-accent tiles) */}
      {!accent && (
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-16 translate-y-16 rounded-full bg-primary/5 blur-3xl opacity-50 transition-opacity group-hover:opacity-100" />
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={cn(
            'mb-4 flex h-11 w-11 items-center justify-center rounded-2xl',
            accent ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h3
          className={cn(
            'font-heading text-xl sm:text-2xl font-bold',
            accent ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'mt-2 text-sm sm:text-base leading-relaxed',
            accent ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>

        {children && (
          <div className="mt-6 flex-1 overflow-hidden rounded-2xl border border-border bg-muted/40 p-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default BentoTile;

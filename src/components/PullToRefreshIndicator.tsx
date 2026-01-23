import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIOSPullToRefresh } from '@/hooks/useIOSPullToRefresh';
import { useAppRefresh } from '@/hooks/useAppRefresh';

const PULL_THRESHOLD = 60;

export const PullToRefreshIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { pullDistance, isPulling, shouldShowIndicator } = useIOSPullToRefresh('root');
  const { isRefreshing } = useAppRefresh();

  // Don't render anything if not needed
  if (!shouldShowIndicator) return null;

  const isReadyToRefresh = pullDistance >= PULL_THRESHOLD;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none",
        "transition-transform duration-200 ease-out"
      )}
      style={{
        transform: `translateY(${isRefreshing ? PULL_THRESHOLD : pullDistance}px)`,
        height: '60px'
      }}
      aria-live="polite"
      aria-label={isRefreshing ? t('refresh.refreshing') : isReadyToRefresh ? t('refresh.releaseToRefresh') : t('refresh.pullToRefresh')}
    >
      <div 
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-background/95 backdrop-blur-sm border shadow-lg",
          "transition-all duration-200"
        )}
        style={{
          opacity: isRefreshing ? 1 : progress,
          transform: `scale(${0.8 + progress * 0.2})`
        }}
      >
        <div 
          className={cn(
            "transition-transform duration-200",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`
          }}
        >
          <Loader2 className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {isRefreshing 
            ? t('refresh.refreshing')
            : isReadyToRefresh 
              ? t('refresh.releaseToRefresh')
              : t('refresh.pullToRefresh')
          }
        </span>
      </div>
    </div>
  );
};

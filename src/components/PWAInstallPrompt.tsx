import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const { isIOS, isInstalled, isInstallable, promptInstall } = usePWAInstall();

  useEffect(() => {
    // Don't show if already dismissed or installed
    const isDismissed = localStorage.getItem('pwaInstallPromptDismissed');
    if (isDismissed || isInstalled) {
      return;
    }

    // Only show if installable (Android/Chrome) or iOS
    if (!isInstallable && !isIOS) {
      return;
    }

    // Show after a 3-second delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled, isInstallable, isIOS]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwaInstallPromptDismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
            <Download className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">
              {t('pwa.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('pwa.description')}
            </p>

            {isIOS ? (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">
                  {t('pwa.iosTitle')}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">1.</span>
                    {t('pwa.iosStep1')}
                    <Share className="h-4 w-4 inline mx-1" />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">2.</span>
                    {t('pwa.iosStep2')}
                    <Plus className="h-4 w-4 inline mx-1" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button onClick={handleInstall} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('pwa.installButton')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  {t('pwa.dismiss')}
                </Button>
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('common.close')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

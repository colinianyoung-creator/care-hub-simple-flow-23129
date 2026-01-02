import { Heart, Shield, Users, User } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  careRecipientName?: string;
  profilePictureUrl?: string;
  onProfileClick?: () => void;
}

export const HeroBanner = ({ title, subtitle, children, careRecipientName, profilePictureUrl, onProfileClick }: HeroBannerProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-care-primary via-care-primary/90 to-care-accent rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-elevated">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4">
          <Heart className="w-16 h-16 animate-gentle-pulse" />
        </div>
        <div className="absolute bottom-4 left-4">
          <Shield className="w-12 h-12 animate-gentle-bounce" />
        </div>
        <div className="absolute top-1/2 right-1/3 transform -translate-y-1/2">
          <Users className="w-8 h-8 opacity-50" />
        </div>
      </div>

      {/* Profile Picture (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        {onProfileClick ? (
          <Button
            onClick={onProfileClick}
            variant="ghost"
            size="icon"
            className="rounded-full h-16 w-16 md:h-24 md:w-24 p-0 hover:bg-white/20 transition-all hover:scale-105"
          >
            <ProfileAvatar 
              profilePicturePath={profilePictureUrl}
              fallbackIcon={<User className="h-8 w-8 md:h-10 md:w-10 text-white" />}
              className="h-14 w-14 md:h-20 md:w-20 border-2 border-white/30"
            />
          </Button>
        ) : (
          <ProfileAvatar 
            profilePicturePath={profilePictureUrl}
            fallbackIcon={<User className="h-8 w-8 md:h-10 md:w-10 text-white" />}
            className="h-14 w-14 md:h-20 md:w-20 border-2 border-white/30"
          />
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10 space-y-4 pr-20 md:pr-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold leading-tight break-words">{title}</h1>
          {careRecipientName && (
            <p className="text-base md:text-xl text-white/90 mt-2 font-medium">Caring for {careRecipientName}</p>
          )}
          {subtitle && !careRecipientName && (
            <p className="text-base md:text-xl text-white/90 mt-2 font-medium">{subtitle}</p>
          )}
        </div>
        
        {children && (
          <div className="pt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
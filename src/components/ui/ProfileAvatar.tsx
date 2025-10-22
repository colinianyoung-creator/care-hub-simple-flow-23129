import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { getSignedUrl } from '@/lib/storage';

interface ProfileAvatarProps {
  profilePicturePath?: string | null;
  fallbackIcon?: React.ReactNode;
  className?: string;
}

/**
 * ProfileAvatar component that automatically handles signed URLs for private storage
 * Accepts a storage path and generates a signed URL for secure display
 */
export const ProfileAvatar = ({ profilePicturePath, fallbackIcon, className }: ProfileAvatarProps) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!profilePicturePath) {
        setSignedUrl('');
        return;
      }

      setLoading(true);
      try {
        // Extract just the path from full URL if needed
        const path = profilePicturePath.includes('/profile_pictures/')
          ? profilePicturePath.split('/profile_pictures/')[1]
          : profilePicturePath;
        
        const url = await getSignedUrl('profile_pictures', path);
        setSignedUrl(url);
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedUrl('');
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrl();
  }, [profilePicturePath]);

  return (
    <Avatar className={className}>
      {signedUrl && !loading && <AvatarImage src={signedUrl} alt="Profile" />}
      <AvatarFallback className="bg-white/20">
        {fallbackIcon || <User className="h-8 w-8 md:h-10 md:w-10 text-white" />}
      </AvatarFallback>
    </Avatar>
  );
};

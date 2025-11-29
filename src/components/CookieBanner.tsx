import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold mb-1">Cookie Consent</h3>
            <p className="text-sm text-muted-foreground">
              We use essential cookies to ensure proper authentication and session management. 
              By clicking "Accept All", you consent to our use of cookies.{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Learn more in our Privacy Policy
              </Link>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReject}
              className="whitespace-nowrap"
            >
              Reject Non-Essential
            </Button>
            <Button 
              size="sm"
              onClick={handleAccept}
              className="whitespace-nowrap"
            >
              Accept All
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReject}
              className="h-8 w-8"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

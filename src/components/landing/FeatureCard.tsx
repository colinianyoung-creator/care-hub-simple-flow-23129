import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

const FeatureCard = ({ icon: Icon, title, description, children, className = '' }: FeatureCardProps) => {
  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      
      {children && (
        <CardContent className="relative pt-0">
          <div className="rounded-lg bg-muted/50 p-4 overflow-hidden">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default FeatureCard;

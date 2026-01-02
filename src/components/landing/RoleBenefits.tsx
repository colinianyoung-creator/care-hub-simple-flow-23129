import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Heart, Eye, Calendar, FileText, Shield, Clock, Bell, BookOpen } from 'lucide-react';

const roles = {
  admin: {
    title: 'Family Admins',
    icon: Users,
    description: 'Full control over care management',
    benefits: [
      { icon: Calendar, text: 'Create and assign shifts to carers' },
      { icon: Users, text: 'Manage team members and permissions' },
      { icon: FileText, text: 'Generate and export timesheets' },
      { icon: Shield, text: 'Approve leave and change requests' },
    ],
  },
  carer: {
    title: 'Carers',
    icon: Heart,
    description: 'Easy-to-use tools for daily care',
    benefits: [
      { icon: Clock, text: 'Clock in/out and track hours' },
      { icon: FileText, text: 'Record care notes and observations' },
      { icon: Bell, text: 'Manage medication administration' },
      { icon: BookOpen, text: 'View schedules across all families' },
    ],
  },
  viewer: {
    title: 'Family Viewers',
    icon: Eye,
    description: 'Stay informed about care',
    benefits: [
      { icon: Eye, text: 'View schedules and care notes' },
      { icon: FileText, text: 'Access medication records' },
      { icon: Bell, text: 'Receive care updates' },
      { icon: Shield, text: 'Read-only access for peace of mind' },
    ],
  },
};

const RoleBenefits = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Built for Every Role</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're managing care, providing care, or staying informed — CareHub has the right tools for you.
          </p>
        </div>

        <Tabs defaultValue="admin" className="max-w-3xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            {Object.entries(roles).map(([key, role]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <role.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{role.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(roles).map(([key, role]) => (
            <TabsContent key={key} value={key} className="animate-fade-in">
              <div className="bg-card rounded-xl p-6 shadow-lg border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <role.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {role.benefits.map((benefit, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <benefit.icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default RoleBenefits;

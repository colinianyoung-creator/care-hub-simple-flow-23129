import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Calendar, Pill, FileText, Users, Download, Sparkles, Shield, ArrowRight } from 'lucide-react';
import Footer from '@/components/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeatureCard from '@/components/landing/FeatureCard';
import ScheduleDemo from '@/components/landing/ScheduleDemo';
import MARDemo from '@/components/landing/MARDemo';
import BodyMapDemo from '@/components/landing/BodyMapDemo';
import NotesDemo from '@/components/landing/NotesDemo';
import ExportDemo from '@/components/landing/ExportDemo';
import AIReportDemo from '@/components/landing/AIReportDemo';
import RoleBenefits from '@/components/landing/RoleBenefits';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">CareHub</h1>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Showcase Grid */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need for Home Care</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for home care management — scheduling, medications, documentation, and more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Calendar}
              title="Shift Scheduling"
              description="Create recurring shifts, manage cover, track leave and sickness with color-coded calendars."
            >
              <ScheduleDemo />
            </FeatureCard>

            <FeatureCard
              icon={Pill}
              title="Medication Administration"
              description="Track doses, record refusals, and maintain a complete audit trail with the MAR system."
            >
              <MARDemo />
            </FeatureCard>

            <FeatureCard
              icon={Users}
              title="Body Map Tracking"
              description="Log and visualize injuries on an interactive body map with severity tracking."
            >
              <BodyMapDemo />
            </FeatureCard>

            <FeatureCard
              icon={FileText}
              title="Notes & Tasks"
              description="Record daily care notes, create tasks, and track completion with recurring reminders."
            >
              <NotesDemo />
            </FeatureCard>

            <FeatureCard
              icon={Download}
              title="Timesheet Export"
              description="Generate PDF/Excel timesheets with categorized hours for payroll and records."
            >
              <ExportDemo />
            </FeatureCard>

            <FeatureCard
              icon={Sparkles}
              title="AI Care Reports"
              description="Generate professional care summaries from your logs using AI in seconds."
            >
              <AIReportDemo />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get Started in Minutes</h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to streamline your care management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Your Family Network',
                description: 'Set up your care circle with roles for admins, carers, and family viewers.',
              },
              {
                step: '2',
                title: 'Add Shifts & Care Data',
                description: 'Schedule recurring shifts, add medications, and start logging daily care notes.',
              },
              {
                step: '3',
                title: 'Export & Report',
                description: 'Generate timesheets, AI summaries, and share updates with your care team.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="relative inline-flex mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  {index < 2 && (
                    <ArrowRight className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Benefits */}
      <RoleBenefits />

      {/* Security & Privacy */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Secure & Private by Design</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Your care data is encrypted, stored securely, and protected with role-based access controls. 
              We're fully GDPR compliant and take privacy seriously.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['End-to-end encryption', 'GDPR Compliant', 'Role-based access', 'UK data hosting'].map((item) => (
                <span key={item} className="px-4 py-2 rounded-full bg-muted text-sm font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Simplify Your Care Management?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join families and carers who trust CareHub for their home care scheduling and documentation.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
              Start Using CareHub Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to get started • No credit card required
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;

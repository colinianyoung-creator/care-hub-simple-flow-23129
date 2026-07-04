import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Pill, FileText, Users, Download, Sparkles, Shield, ArrowRight } from 'lucide-react';
import Footer from '@/components/Footer';
import HeroSection from '@/components/landing/HeroSection';
import BentoTile from '@/components/landing/BentoTile';
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
        <nav className="container mx-auto px-2 sm:px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-heading font-extrabold text-primary tracking-tight">CareHub</h1>
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

      {/* Features Bento Grid */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="mb-10 max-w-2xl">
            <span className="text-sm font-heading font-bold uppercase tracking-widest text-primary">Browse the features</span>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need, one tap away
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Scheduling, medications, documentation and more — pick a tile and see it in action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:auto-rows-[minmax(210px,auto)]">
            <BentoTile
              icon={Calendar}
              title="Shift Scheduling"
              description="Recurring shifts, cover, leave and sickness on color-coded calendars."
              className="md:col-span-2 md:row-span-2"
              style={{ animationDelay: '0ms' }}
            >
              <ScheduleDemo />
            </BentoTile>

            <BentoTile
              icon={Pill}
              title="Medication (MAR)"
              description="Track doses, record refusals, and keep a complete audit trail."
              className="md:col-span-2"
              style={{ animationDelay: '80ms' }}
            >
              <MARDemo />
            </BentoTile>

            <BentoTile
              icon={Users}
              title="Body Map"
              description="Log and visualize injuries with severity tracking."
              className="md:col-span-1"
              style={{ animationDelay: '160ms' }}
            />

            <BentoTile
              icon={Sparkles}
              title="AI Care Reports"
              description="Professional care summaries generated in seconds."
              accent
              className="md:col-span-1"
              style={{ animationDelay: '240ms' }}
            />

            <BentoTile
              icon={FileText}
              title="Notes & Tasks"
              description="Daily care notes and tasks with recurring reminders."
              className="md:col-span-2"
              style={{ animationDelay: '320ms' }}
            >
              <NotesDemo />
            </BentoTile>

            <BentoTile
              icon={Download}
              title="Timesheet Export"
              description="Generate PDF/Excel timesheets with categorized hours."
              className="md:col-span-2"
              style={{ animationDelay: '400ms' }}
            >
              <ExportDemo />
            </BentoTile>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">Get started in minutes</h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to streamline your care management.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Create your care circle',
                description: 'Set up roles for admins, carers, and family viewers.',
              },
              {
                step: '02',
                title: 'Add shifts & care data',
                description: 'Schedule shifts, add medications, and log daily notes.',
              },
              {
                step: '03',
                title: 'Export & report',
                description: 'Generate timesheets, AI summaries, and share updates.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group rounded-[2rem] bg-card border border-border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="font-heading text-5xl font-extrabold text-primary/20 group-hover:text-primary/40 transition-colors">
                  {item.step}
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Benefits */}
      <RoleBenefits />

      {/* Security & Privacy */}
      <section className="py-16">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-muted border border-background/60 p-10 sm:p-16">
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex p-4 rounded-2xl bg-background mb-6 shadow-sm">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Secure & private by design
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your care data is encrypted, stored securely, and protected with role-based access.
                We're fully GDPR compliant and take privacy seriously.
              </p>
              <div className="flex flex-wrap gap-3">
                {['End-to-end encryption', 'GDPR Compliant', 'Role-based access', 'UK data hosting'].map((item) => (
                  <span key={item} className="rounded-full bg-background px-4 py-2 text-sm font-medium border border-border">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-20">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary p-10 sm:p-16 text-center text-primary-foreground shadow-2xl shadow-primary/20">
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to simplify your care management?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join families and carers who trust CareHub for their home care scheduling and documentation.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 rounded-2xl font-heading font-bold">
                Start Using CareHub Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-primary-foreground/70">
              Free to get started • No credit card required
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;

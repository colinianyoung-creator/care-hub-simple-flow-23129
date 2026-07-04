import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="container mx-auto px-2 sm:px-4 pt-8 lg:pt-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-muted border border-background/60 shadow-2xl shadow-primary/5 p-8 sm:p-12 lg:p-20">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-2/3 bg-gradient-to-bl from-primary/15 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              </span>
              Live
            </span>
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground font-heading">
              Manage your care, simple
            </span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] text-foreground mb-8">
            CareHub
            <br />
            <span className="text-primary">Originals.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed mb-10">
            Scheduling, medication tracking, care notes and timesheets — all in one
            beautifully simple place. Built for families and carers supporting disabled children, disabled adults, or elderly loved ones.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/auth">
              <button className="group flex items-center gap-3 rounded-2xl bg-foreground px-8 py-4 text-background shadow-xl shadow-foreground/10 transition-all duration-300 hover:bg-primary hover:text-primary-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground transition-transform group-hover:scale-110">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                <span className="font-heading font-bold">Get Started Free</span>
              </button>
            </Link>
            <Link to="/auth">
              <button className="rounded-2xl border border-border bg-background px-8 py-4 font-heading font-bold text-foreground transition-all hover:bg-muted">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

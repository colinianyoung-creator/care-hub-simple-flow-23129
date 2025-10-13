import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, Download, Users, CheckSquare, Calendar, Pill, Shield } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">CareHub</h1>
          <div className="space-x-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          CareHub: Simple Scheduling & Timesheets for Home Care
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Built for disabled people, families, and carers to manage shifts, record notes, and export timesheets easily.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 py-4">
            Get Started
          </Button>
        </Link>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need for home care management</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Clock className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Shift Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and assign shifts, track sick days, cover, and leave. Manage recurring schedules with ease.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Notes & Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Record daily notes, tasks, medication reminders, and appointments. Keep everyone informed.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Download className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Timesheet Export</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate PDF/Excel timesheets with hours and totals in CareHub's standard template.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Family Network</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Invite carers and family members, each with the right permissions for their role.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-muted/50 rounded-lg my-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Set up your family network</h3>
            <p className="text-muted-foreground">
              Add the disabled person, family members, carers, and viewers with appropriate permissions.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Add shifts, notes, and appointments</h3>
            <p className="text-muted-foreground">
              Schedule recurring shifts, record daily care notes, manage medications and appointments.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Export timesheets at month-end</h3>
            <p className="text-muted-foreground">
              Generate professional timesheets with categorized hours for Basic, Cover, Annual Leave, and Sickness.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="container mx-auto px-4 py-16 bg-muted/50 rounded-lg my-16">
        <div className="text-center max-w-2xl mx-auto">
          <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Security & Privacy</h2>
          <p className="text-lg text-muted-foreground">
            Your data is secure and private. CareHub uses role-based permissions and secure storage to protect your information.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to simplify your care management?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Join families and carers who trust CareHub for their home care scheduling and documentation.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 py-4">
            Start using CareHub today
          </Button>
        </Link>
      </section>
    </div>
  );
};

export default Landing;
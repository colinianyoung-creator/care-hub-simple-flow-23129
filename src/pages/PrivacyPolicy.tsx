import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: 28 November 2025</p>

          <p className="text-lg mb-6">
            mycarehub.uk ("we", "our", "us") is committed to protecting your privacy and keeping your personal data secure. 
            This policy explains what information we collect, why we collect it, and how we use it.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect information that you provide directly to us when using CareHub:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, profile picture</li>
              <li><strong>Care Management Data:</strong> Care notes, daily observations, activity logs, body map entries</li>
              <li><strong>Medical Records:</strong> Medication schedules, dosage information, administration records (MAR)</li>
              <li><strong>Scheduling Data:</strong> Shift assignments, time entries, leave requests, timesheet records</li>
              <li><strong>Task Management:</strong> Task assignments, completion status, priority information</li>
              <li><strong>Appointments:</strong> Appointment dates, locations, descriptions</li>
              <li><strong>Financial Records:</strong> Money tracking entries, receipts (if uploaded)</li>
              <li><strong>Login Information:</strong> Authentication credentials (securely encrypted)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our home care management services</li>
              <li>Enable shift scheduling, timesheet generation, and payroll tracking</li>
              <li>Maintain medication administration records (MAR) and dose tracking</li>
              <li>Facilitate communication between family members, carers, and care recipients</li>
              <li>Allow you to log in, save your data, and access your account securely</li>
              <li>Generate reports and export timesheets or MAR logs when requested</li>
              <li>Communicate service updates, important notices, and security alerts</li>
              <li>Ensure role-based access control and data privacy within family networks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Store Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Secure Cloud Storage:</strong> All personal data is stored securely on Lovable Cloud infrastructure powered by Supabase</li>
              <li><strong>Encryption:</strong> Data is encrypted both in transit (HTTPS/TLS) and at rest</li>
              <li><strong>Access Control:</strong> Role-based access ensures only authorized family members and carers can view relevant data</li>
              <li><strong>Authentication:</strong> We use secure authentication methods with optional two-factor authentication (2FA)</li>
              <li><strong>Row-Level Security:</strong> Database policies ensure users can only access data from their own family networks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. How Long We Keep Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal data is retained as long as your account is active</li>
              <li>Archived records (care notes, MAR logs, timesheets) are retained for historical tracking unless deletion is requested</li>
              <li>You can request deletion of your data at any time by contacting us</li>
              <li>Upon account deletion, all personal data will be permanently removed from our systems within 30 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Sharing Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Within Your Family Network:</strong> Data is shared with family members and carers you explicitly invite to your care space</li>
              <li><strong>No Third-Party Selling:</strong> We do not sell or share your personal data with third parties for marketing purposes</li>
              <li><strong>Legal Requirements:</strong> We may share data if required by law, court order, or to protect our rights and safety</li>
              <li><strong>Service Providers:</strong> We use trusted infrastructure providers (Lovable Cloud/Supabase) who are contractually bound to protect your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights (UK GDPR)</h2>
            <p className="mb-4">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Restriction:</strong> Request limitation of processing in certain circumstances</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at <strong>[your-email@example.com]</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="mb-4">
              We use essential cookies to ensure the proper functioning of our service:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication Cookies:</strong> Required to keep you logged in and maintain your session</li>
              <li><strong>Security Cookies:</strong> Used to detect and prevent security threats</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences (e.g., theme, language)</li>
            </ul>
            <p className="mt-4">
              You can accept or reject non-essential cookies via the banner that appears when you first visit our website. 
              Essential cookies cannot be disabled as they are necessary for the service to function.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>End-to-end encryption for data transmission</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Protection against SQL injection and XSS attacks</li>
              <li>Regular backups to prevent data loss</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be posted on this page with an updated 
              "Last updated" date. We encourage you to review this policy periodically to stay informed about how we protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about your privacy, our practices, or wish to exercise your data rights, please contact:
            </p>
            <p className="font-semibold">
              Email: <a href="mailto:[your-email@example.com]" className="text-primary hover:underline">[your-email@example.com]</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

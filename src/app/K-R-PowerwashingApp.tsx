import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CustomersTab } from '@/app/components/customers-tab';
import { CalendarTab } from '@/app/components/calendar-tab';
import { QuotesTab } from '@/app/components/quotes-tab';
import { JobsTab } from '@/app/components/jobs-tab';
import { InvoicesTab } from '@/app/components/invoices-tab';
import { ReportsDialog } from '@/app/components/reports-dialog';
import { CrewManagementDialog } from '@/app/components/crew-management-dialog';
import { LoginPage } from '@/app/components/login-page';
import { ForcePasswordChange } from '@/app/components/force-password-change';
import { ManageUsersDialog } from '@/app/components/manage-users-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Users, Calendar, FileText, Briefcase, DollarSign, LogOut } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';
import { CrewNotificationListener } from '@/app/components/crew-notifications';
import { getSession, setSession, clearSession, getUsers, type AuthSession } from '@/app/lib/auth-utils';
import logoImage from '@/assets/51bd7988429b8271130dad268ae7b18b150f0caf.png';

/**
 * K&R POWERWASHING - Admin Dashboard
 *
 * This is the main admin interface for managing all aspects of the business.
 *
 * FEATURES:
 * - Customer Management: Add, edit, view customer records
 * - Calendar: Schedule appointments and manage jobs
 * - Quotes: Create and manage service quotes
 * - Jobs: Track job status, crew assignments, and completion
 * - Invoices: Generate and manage customer invoices
 * - Reports: View business analytics and reports
 * - Crew Management: Manage crew members and their information
 *
 * INTEGRATION WITH CREW APP:
 * - Changes made here automatically sync to the crew app (CrewApp.tsx)
 * - Events dispatched: 'kr-jobs-updated', 'kr-appointments-updated'
 * - Crew members receive real-time notifications of schedule changes
 */

type AuthView = 'login' | 'force-change' | 'dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [authReady, setAuthReady] = useState(false);

  // On mount: check for existing session, seed users, route to correct view
  useEffect(() => {
    // Clear old seed appointments
    localStorage.removeItem('kr-appointments');

    // Seed users (ensures default admin exists)
    getUsers();

    const existing = getSession();
    if (existing) {
      // Verify user still exists
      const users = getUsers();
      const user = users.find(u => u.id === existing.userId);
      if (!user) {
        clearSession();
        setAuthView('login');
      } else if (user.mustChangePassword) {
        setSessionState(existing);
        setAuthView('force-change');
      } else {
        setSessionState(existing);
        setAuthView('dashboard');
      }
    } else {
      setAuthView('login');
    }
    setAuthReady(true);
  }, []);

  const handleLogin = (newSession: AuthSession) => {
    setSessionState(newSession);
    if (newSession.mustChangePassword) {
      setAuthView('force-change');
    } else {
      setAuthView('dashboard');
    }
  };

  const handlePasswordChanged = (updatedSession: AuthSession) => {
    setSession(updatedSession);
    setSessionState(updatedSession);
    setAuthView('dashboard');
  };

  const handleSignOut = () => {
    clearSession();
    setSessionState(null);
    setAuthView('login');
  };

  // Don't render anything until auth check is done
  if (!authReady) return null;

  // Auth routing
  if (authView === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (authView === 'force-change' && session) {
    return (
      <ForcePasswordChange
        session={session}
        onPasswordChanged={handlePasswordChanged}
        onSignOut={handleSignOut}
      />
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#2563eb] via-[#0891b2] to-[#2563eb] border-b sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
              <img
                src={logoImage}
                alt="K&R POWERWASHING Logo"
                className="w-16 h-16 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-1"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">K&R POWERWASHING</h1>
                <a
                  href="https://www.krpowerwashing.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-100 hover:text-white transition-colors underline"
                >
                  www.krpowerwashing.org
                </a>
              </div>
            </div>

            {/* Right: User info + Sign Out */}
            {session && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{session.displayName}</div>
                  <Badge
                    variant={session.role === 'admin' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {session.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <LogOut className="size-4 mr-1" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="size-4" />
                <span className="hidden sm:inline">Customers</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <FileText className="size-4" />
                <span className="hidden sm:inline">Quotes</span>
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase className="size-4" />
                <span className="hidden sm:inline">Jobs</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <DollarSign className="size-4" />
                <span className="hidden sm:inline">Invoices</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {session?.role === 'admin' && (
                <ManageUsersDialog currentUserId={session.userId} />
              )}
              <CrewManagementDialog />
              <ReportsDialog />
            </div>
          </div>

          <TabsContent value="customers" forceMount className="data-[state=inactive]:hidden">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="calendar" forceMount className="data-[state=inactive]:hidden">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="quotes" forceMount className="data-[state=inactive]:hidden">
            <QuotesTab />
          </TabsContent>

          <TabsContent value="jobs" forceMount className="data-[state=inactive]:hidden">
            <JobsTab />
          </TabsContent>

          <TabsContent value="invoices" forceMount className="data-[state=inactive]:hidden">
            <InvoicesTab />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster position="top-right" richColors />
      <CrewNotificationListener />
    </div>
  );
}

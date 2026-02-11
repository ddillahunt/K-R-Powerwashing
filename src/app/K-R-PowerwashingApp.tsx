import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CustomersTab } from '@/app/components/customers-tab';
import { CalendarTab } from '@/app/components/calendar-tab';
import { QuotesTab } from '@/app/components/quotes-tab';
import { JobsTab } from '@/app/components/jobs-tab';
import { InvoicesTab } from '@/app/components/invoices-tab';
import { ReportsDialog } from '@/app/components/reports-dialog';
import { CrewManagementDialog } from '@/app/components/crew-management-dialog';
import { Users, Calendar, FileText, Briefcase, DollarSign } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';
import { CrewNotificationListener } from '@/app/components/crew-notifications';
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
export default function App() {
  const [activeTab, setActiveTab] = useState('customers');

  const handleClearAllData = () => {
    // Clear all data from localStorage
    localStorage.removeItem('kr-customers');
    localStorage.removeItem('kr-jobs');
    localStorage.removeItem('kr-quotes');
    localStorage.removeItem('kr-invoices');
    localStorage.removeItem('kr-appointments');
    localStorage.removeItem('kr-deleted-jobs');
    
    // Dispatch events to notify all components
    window.dispatchEvent(new Event('kr-customers-updated'));
    window.dispatchEvent(new Event('kr-jobs-updated'));
    window.dispatchEvent(new Event('kr-quotes-updated'));
    window.dispatchEvent(new Event('kr-invoices-updated'));
    
    // Reload the page to reset all components
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#2563eb] via-[#0891b2] to-[#2563eb] border-b sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            <img 
              src={logoImage}
              alt="K&R POWERWASHING Logo"
              className="w-16 h-16 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-1"
            />
            <div className="text-center">
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
              <CrewManagementDialog />
              <ReportsDialog />
            </div>
          </div>

          <TabsContent value="customers">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="quotes">
            <QuotesTab />
          </TabsContent>

          <TabsContent value="jobs">
            <JobsTab />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster position="top-right" richColors />
      <CrewNotificationListener />
    </div>
  );
}
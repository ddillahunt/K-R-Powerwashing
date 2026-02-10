import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card } from '@/app/components/ui/card';
import { CustomersTab } from '@/app/components/customers-tab';
import { CalendarTab } from '@/app/components/calendar-tab';
import { QuotesTab } from '@/app/components/quotes-tab';
import { JobsTab } from '@/app/components/jobs-tab';
import { InvoicesTab } from '@/app/components/invoices-tab';
import { Users, Calendar, FileText, Briefcase, DollarSign, Droplets } from 'lucide-react';
import logoImage from '@/assets/51bd7988429b8271130dad268ae7b18b150f0caf.png';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 border-b sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            <img 
              src={logoImage}
              alt="K&R POWERWASHING Logo"
              className="w-16 h-16 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-1"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white italic">K&R POWERWASHING</h1>
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
    </div>
  );
}
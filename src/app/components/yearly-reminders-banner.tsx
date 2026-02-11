import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Bell, X, Mail } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface Job {
  id: string;
  customerName: string;
  service: string;
  address: string;
  completedDate?: string;
  yearlyReminderSent?: boolean;
}

interface Customer {
  email: string;
  name: string;
}

interface YearlyReminder {
  job: Job;
  customer: Customer;
  daysUntilAnniversary: number;
}

export function YearlyRemindersBanner() {
  const [reminders, setReminders] = useState<YearlyReminder[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    checkYearlyReminders();

    // Listen for job updates
    const handleJobsUpdate = () => {
      checkYearlyReminders();
    };

    window.addEventListener('kr-jobs-updated', handleJobsUpdate);
    return () => window.removeEventListener('kr-jobs-updated', handleJobsUpdate);
  }, []);

  const checkYearlyReminders = () => {
    const savedJobs = localStorage.getItem('kr-jobs');
    const savedCustomers = localStorage.getItem('kr-customers');
    const savedDismissed = localStorage.getItem('kr-dismissed-yearly-reminders');

    if (!savedJobs || !savedCustomers) return;

    const jobs: Job[] = JSON.parse(savedJobs);
    const customers: Customer[] = JSON.parse(savedCustomers);
    const dismissedList: string[] = savedDismissed ? JSON.parse(savedDismissed) : [];

    setDismissed(dismissedList);

    const now = new Date();
    const upcomingReminders: YearlyReminder[] = [];

    // Find completed jobs approaching their 1-year anniversary
    jobs.forEach(job => {
      if (job.status === 'completed' && job.completedDate && !job.yearlyReminderSent) {
        const completedDate = new Date(job.completedDate);
        const oneYearLater = new Date(completedDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

        const daysUntil = differenceInDays(oneYearLater, now);

        // Show reminder if within 30 days of anniversary or past due
        if (daysUntil <= 30 && daysUntil >= -30 && !dismissedList.includes(job.id)) {
          const customer = customers.find(c => c.name === job.customerName);
          if (customer) {
            upcomingReminders.push({
              job,
              customer,
              daysUntilAnniversary: daysUntil
            });
          }
        }
      }
    });

    // Sort by days until anniversary (most urgent first)
    upcomingReminders.sort((a, b) => a.daysUntilAnniversary - b.daysUntilAnniversary);

    setReminders(upcomingReminders);
  };

  const handleSendYearlyReminder = (reminder: YearlyReminder) => {
    const { job, customer } = reminder;
    const completedDate = new Date(job.completedDate!);

    const subject = encodeURIComponent(`Time for Annual Service - K&R POWERWASHING`);
    const body = encodeURIComponent(
      `Hi ${customer.name},\n\n` +
      `It's been about a year since we completed your ${job.service} service at ${job.address} on ${format(completedDate, 'MMM d, yyyy')}.\n\n` +
      `We'd love to help you maintain your property with our professional power washing services again this year!\n\n` +
      `Benefits of annual service:\n` +
      `- Maintain your property's appearance and value\n` +
      `- Prevent long-term damage from dirt and grime buildup\n` +
      `- Keep your home looking its best year-round\n\n` +
      `Would you like to schedule your annual ${job.service}? We're offering loyal customer pricing for repeat services.\n\n` +
      `Please let us know when you'd like to schedule, or feel free to call us to discuss your needs.\n\n` +
      `Thank you for being a valued customer!\n\n` +
      `Best regards,\n` +
      `K&R POWERWASHING Team`
    );

    // Open email client
    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;

    // Mark reminder as sent
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      const jobs = JSON.parse(savedJobs);
      const updatedJobs = jobs.map((j: Job) =>
        j.id === job.id ? { ...j, yearlyReminderSent: true } : j
      );
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }

    // Remove from current reminders
    setReminders(reminders.filter(r => r.job.id !== job.id));

    toast.success(`Yearly reminder email opened for ${customer.name}`);
  };

  const handleDismiss = (jobId: string) => {
    const updatedDismissed = [...dismissed, jobId];
    setDismissed(updatedDismissed);
    localStorage.setItem('kr-dismissed-yearly-reminders', JSON.stringify(updatedDismissed));
    setReminders(reminders.filter(r => r.job.id !== jobId));
  };

  if (reminders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {reminders.map(reminder => {
        const { job, customer, daysUntilAnniversary } = reminder;
        const isPastDue = daysUntilAnniversary < 0;
        const isToday = daysUntilAnniversary === 0;

        return (
          <Alert
            key={job.id}
            className={`border-2 ${
              isPastDue
                ? 'border-red-400 bg-red-50'
                : isToday
                ? 'border-orange-400 bg-orange-50'
                : 'border-blue-400 bg-blue-50'
            }`}
          >
            <Bell className="size-5" />
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1">
                <AlertTitle className="text-base font-semibold mb-1">
                  {isPastDue
                    ? `⚠️ Overdue: Yearly Follow-up for ${customer.name}`
                    : isToday
                    ? `📅 Today: Yearly Follow-up for ${customer.name}`
                    : `🔔 Upcoming: Yearly Follow-up for ${customer.name}`}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  <div className="space-y-1">
                    <p>
                      {isPastDue ? (
                        <>
                          <strong>{Math.abs(daysUntilAnniversary)} days overdue</strong> - Last service:{' '}
                          {job.service} on {format(new Date(job.completedDate!), 'MMM d, yyyy')}
                        </>
                      ) : isToday ? (
                        <>
                          <strong>1-year anniversary today!</strong> - Last service: {job.service} on{' '}
                          {format(new Date(job.completedDate!), 'MMM d, yyyy')}
                        </>
                      ) : (
                        <>
                          <strong>In {daysUntilAnniversary} days</strong> - Last service: {job.service} on{' '}
                          {format(new Date(job.completedDate!), 'MMM d, yyyy')}
                        </>
                      )}
                    </p>
                    <p className="text-gray-600">Address: {job.address}</p>
                  </div>
                </AlertDescription>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => handleSendYearlyReminder(reminder)}
                  className="bg-gradient-to-r from-[#2563eb] to-[#0891b2] hover:opacity-90"
                >
                  <Mail className="size-4 mr-2" />
                  Send Reminder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(job.id)}
                  title="Dismiss"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}

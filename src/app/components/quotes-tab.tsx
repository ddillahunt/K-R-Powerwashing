import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Plus, FileText, DollarSign, Edit, Trash2, Calendar, Clock, Mail, X } from 'lucide-react';
import { format } from 'date-fns';

interface Quote {
  id: string;
  customerName: string;
  services: string[]; // Changed from service: string to services: string[]
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced';
  date: string; // Changed to string for localStorage serialization
  time?: string; // Scheduled time (e.g., "9:00 AM")
  assignedCrew: string; // Crew assignment
  notes: string;
}

const mockQuotes: Quote[] = [
  {
    id: 'Q-001',
    customerName: 'John Smith',
    services: ['House Exterior Wash'],
    amount: 350,
    status: 'approved',
    date: new Date(2026, 0, 25).toISOString(),
    assignedCrew: 'Team A',
    notes: 'Two-story home, 2500 sq ft'
  },
  {
    id: 'Q-002',
    customerName: 'Sarah Johnson',
    services: ['Driveway Cleaning'],
    amount: 175,
    status: 'pending',
    date: new Date(2026, 0, 28).toISOString(),
    assignedCrew: 'Team B',
    notes: 'Concrete driveway, 400 sq ft'
  },
  {
    id: 'Q-003',
    customerName: 'Michael Brown',
    services: ['Deck/Patio Cleaning'],
    amount: 225,
    status: 'approved',
    date: new Date(2026, 0, 29).toISOString(),
    assignedCrew: 'Team A',
    notes: 'Wood deck, 300 sq ft'
  }
];

export function QuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState({
    customerName: '',
    services: [] as string[],
    amount: '',
    time: '',
    notes: ''
  });
  const isSelfDispatching = useRef(false);

  // Available service options
  const availableServices = [
    'House Exterior Wash',
    'Driveway Cleaning',
    'Deck/Patio Cleaning',
    'Roof Cleaning',
    'Gutter Cleaning',
    'Window Cleaning',
    'Fence Cleaning'
  ];

  // Toggle service selection
  const toggleService = (service: string) => {
    setNewQuote(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  // Sync quotes with jobs - ensure all quotes have corresponding jobs
  const syncQuotesWithJobs = (quotesToSync: Quote[]) => {
    const savedJobs = localStorage.getItem('kr-jobs');
    const existingJobs = savedJobs ? JSON.parse(savedJobs) : [];
    
    // Get list of deleted job quote IDs to prevent recreation
    const deletedJobs = localStorage.getItem('kr-deleted-jobs');
    const deletedJobsList = deletedJobs ? JSON.parse(deletedJobs) : [];
    
    // Find quotes that don't have corresponding jobs AND haven't been deleted
    const quotesWithoutJobs = quotesToSync.filter(quote => 
      !existingJobs.some((job: any) => job.quoteId === quote.id) &&
      !deletedJobsList.includes(quote.id)
    );
    
    if (quotesWithoutJobs.length > 0) {
      // Create jobs for quotes that don't have them
      const newJobs = quotesWithoutJobs.map((quote, index) => {
        const jobNumber = existingJobs.length + index + 1;
        return {
          id: `J-${String(jobNumber).padStart(3, '0')}`,
          quoteId: quote.id,
          customerName: quote.customerName,
          service: quote.services.join(', '), // Join services array into a string
          address: '',
          scheduledDate: quote.date,
          scheduledTime: quote.time,
          assignedCrew: 'Unassigned',
          status: 'scheduled',
          photos: [],
          notes: quote.notes
        };
      });
      
      // Save updated jobs to localStorage
      localStorage.setItem('kr-jobs', JSON.stringify([...existingJobs, ...newJobs]));
      
      // Dispatch custom event to notify Jobs tab
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }
  };

  // Load quotes from localStorage
  const loadQuotes = () => {
    const savedQuotes = localStorage.getItem('kr-quotes');
    if (savedQuotes) {
      const loadedQuotes = JSON.parse(savedQuotes);
      // Migrate old quotes from service (string) to services (array) and add assignedCrew
      const migratedQuotes = loadedQuotes.map((quote: any) => {
        let migrated = { ...quote };
        if (quote.service && !quote.services) {
          migrated = {
            ...migrated,
            services: [quote.service],
            service: undefined
          };
        }
        // Add assignedCrew if missing
        if (!migrated.assignedCrew) {
          migrated.assignedCrew = 'Unassigned';
        }
        return migrated;
      });
      setQuotes(migratedQuotes);
      return migratedQuotes;
    }
    return null;
  };

  // Load quotes from localStorage on component mount
  useEffect(() => {
    const loaded = loadQuotes();
    if (loaded) {
      // Save migrated quotes back to localStorage
      localStorage.setItem('kr-quotes', JSON.stringify(loaded));
      // Sync all existing quotes with jobs
      syncQuotesWithJobs(loaded);
    } else {
      // Initialize with mock data if no saved data exists
      setQuotes(mockQuotes);
      localStorage.setItem('kr-quotes', JSON.stringify(mockQuotes));
      // Sync mock quotes with jobs
      syncQuotesWithJobs(mockQuotes);
    }

    // Listen for quote updates from other components (e.g., CalendarTab)
    // Skip self-dispatched events to avoid feedback loop
    const handleQuotesUpdate = () => {
      if (isSelfDispatching.current) return;
      loadQuotes();
    };

    window.addEventListener('kr-quotes-updated', handleQuotesUpdate);
    return () => window.removeEventListener('kr-quotes-updated', handleQuotesUpdate);
  }, []);

  // Load customers from localStorage
  useEffect(() => {
    const savedCustomers = localStorage.getItem('kr-customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
    
    // Listen for customer updates
    const handleCustomersUpdate = () => {
      const updatedCustomers = localStorage.getItem('kr-customers');
      if (updatedCustomers) {
        setCustomers(JSON.parse(updatedCustomers));
      }
    };
    
    window.addEventListener('kr-customers-updated', handleCustomersUpdate);
    return () => window.removeEventListener('kr-customers-updated', handleCustomersUpdate);
  }, []);

  // Load appointments from localStorage
  useEffect(() => {
    const loadAppointments = () => {
      const savedAppointments = localStorage.getItem('kr-appointments');
      if (savedAppointments) {
        setAppointments(JSON.parse(savedAppointments));
      }
    };
    loadAppointments();

    // Listen for appointment updates from storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kr-appointments') {
        loadAppointments();
      }
    };

    // Listen for appointment updates from custom events
    const handleAppointmentsUpdate = () => {
      loadAppointments();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('kr-appointments-updated', handleAppointmentsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kr-appointments-updated', handleAppointmentsUpdate);
    };
  }, []);

  // Get appointments for a customer
  const getCustomerAppointments = (customerName: string) => {
    return appointments.filter(apt => apt.customerName === customerName);
  };

  // Get services from calendar appointments for a customer
  const getCustomerServicesFromAppointments = (customerName: string): string[] => {
    const customerAppointments = getCustomerAppointments(customerName);
    const allServices = customerAppointments.flatMap(apt => apt.services || []);
    // Return unique services
    return [...new Set(allServices)];
  };

  // Delete appointment from localStorage and update state
  const handleDeleteAppointment = (appointmentId: string) => {
    const savedAppointments = localStorage.getItem('kr-appointments');
    if (savedAppointments) {
      const allAppointments = JSON.parse(savedAppointments);
      const updatedAppointments = allAppointments.filter((apt: any) => apt.id !== appointmentId);
      localStorage.setItem('kr-appointments', JSON.stringify(updatedAppointments));
      setAppointments(updatedAppointments);
      window.dispatchEvent(new Event('kr-appointments-updated'));
    }
  };

  // Get customer email by name
  const getCustomerEmail = (customerName: string): string => {
    const customer = customers.find(c => c.name === customerName);
    return customer?.email || '';
  };

  // Generate mailto link for emailing quote to customer
  const handleEmailQuote = (quote: Quote) => {
    const customerEmail = getCustomerEmail(quote.customerName);
    const subject = encodeURIComponent(`Quote ${quote.id} from K&R Powerwashing`);
    const body = encodeURIComponent(
`Dear ${quote.customerName},

Thank you for your interest in K&R Powerwashing services. Please find your quote details below:

Quote ID: ${quote.id}
Date: ${format(new Date(quote.date), 'MMMM d, yyyy')}
Services: ${quote.services.join(', ')}
Amount: $${quote.amount.toLocaleString()}

${quote.notes ? `Notes: ${quote.notes}\n\n` : ''}This quote is valid for 30 days.

If you have any questions or would like to proceed, please don't hesitate to contact us.

Best regards,
K&R Powerwashing Team`
    );
    const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  // Save quotes to localStorage whenever they change
  // Note: Do NOT dispatch kr-quotes-updated here to avoid a feedback loop
  useEffect(() => {
    // Only save if we've loaded quotes (avoid saving empty array on initial render)
    if (quotes.length > 0 || localStorage.getItem('kr-quotes')) {
      localStorage.setItem('kr-quotes', JSON.stringify(quotes));
    }
  }, [quotes]);

  const handleAddQuote = () => {
    // Generate a unique ID based on timestamp
    const quoteNumber = quotes.length + 1;
    // Pull crew assignment from the customer's appointment if available
    const customerAppts = getCustomerAppointments(newQuote.customerName);
    const crewFromAppointment = customerAppts.length > 0 ? customerAppts[0].assignedCrew || 'Unassigned' : 'Unassigned';
    const quote: Quote = {
      id: `Q-${String(quoteNumber).padStart(3, '0')}`,
      customerName: newQuote.customerName,
      services: newQuote.services,
      amount: parseFloat(newQuote.amount),
      status: 'pending',
      date: new Date().toISOString(),
      time: newQuote.time || undefined,
      assignedCrew: crewFromAppointment,
      notes: newQuote.notes
    };
    const updatedQuotes = [...quotes, quote];
    setQuotes(updatedQuotes);

    // Save immediately and notify other components
    localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
    isSelfDispatching.current = true;
    window.dispatchEvent(new Event('kr-quotes-updated'));
    isSelfDispatching.current = false;

    // Create a corresponding job entry
    const savedJobs = localStorage.getItem('kr-jobs');
    const existingJobs = savedJobs ? JSON.parse(savedJobs) : [];
    const jobNumber = existingJobs.length + 1;
    const jobId = `J-${String(jobNumber).padStart(3, '0')}`;

    const newJob = {
      id: jobId,
      quoteId: quote.id,
      customerName: newQuote.customerName,
      service: newQuote.services.join(', '),
      address: '',
      scheduledDate: new Date().toISOString(),
      scheduledTime: newQuote.time || undefined,
      assignedCrew: crewFromAppointment,
      status: 'scheduled',
      photos: [],
      notes: newQuote.notes
    };
    
    // Save job to localStorage
    localStorage.setItem('kr-jobs', JSON.stringify([...existingJobs, newJob]));
    
    // Dispatch custom event to notify Jobs tab
    window.dispatchEvent(new Event('kr-jobs-updated'));
    
    // Create a corresponding invoice entry
    const savedInvoices = localStorage.getItem('kr-invoices');
    const existingInvoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    const invoiceNumber = existingInvoices.length + 1;
    const invoiceId = `INV-${String(invoiceNumber).padStart(3, '0')}`;
    
    const newInvoice = {
      id: invoiceId,
      customerName: newQuote.customerName,
      service: newQuote.services.join(', '), // Join services array into a string
      amount: parseFloat(newQuote.amount),
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      quickbooksSynced: false
    };
    
    // Save invoice to localStorage
    localStorage.setItem('kr-invoices', JSON.stringify([...existingInvoices, newInvoice]));
    
    // Dispatch custom event to notify Invoices tab
    window.dispatchEvent(new Event('kr-invoices-updated'));
    
    setNewQuote({ customerName: '', services: [] as string[], amount: '', time: '', notes: '' });
    setIsDialogOpen(false);
  };

  const handleEditQuote = () => {
    if (editingQuote) {
      const updatedQuotes = quotes.map((q) =>
        q.id === editingQuote.id
          ? {
              ...q,
              customerName: newQuote.customerName,
              services: newQuote.services,
              amount: parseFloat(newQuote.amount),
              time: newQuote.time || undefined,
              notes: newQuote.notes
            }
          : q
      );
      setQuotes(updatedQuotes);

      // Save immediately and notify other components
      localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
      isSelfDispatching.current = true;
      window.dispatchEvent(new Event('kr-quotes-updated'));
      isSelfDispatching.current = false;

      // Sync changes to corresponding job
      const savedJobs = localStorage.getItem('kr-jobs');
      if (savedJobs) {
        const jobs = JSON.parse(savedJobs);
        const updatedJobs = jobs.map((job: any) =>
          job.quoteId === editingQuote.id
            ? {
                ...job,
                customerName: newQuote.customerName,
                service: newQuote.services.join(', '),
                scheduledTime: newQuote.time || undefined,
                notes: newQuote.notes
              }
            : job
        );
        localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
        window.dispatchEvent(new Event('kr-jobs-updated'));
      }

      // Sync changes to corresponding invoice
      const savedInvoices = localStorage.getItem('kr-invoices');
      if (savedInvoices) {
        const invoices = JSON.parse(savedInvoices);
        const updatedInvoices = invoices.map((inv: any) =>
          inv.customerName === editingQuote.customerName
            ? {
                ...inv,
                customerName: newQuote.customerName,
                service: newQuote.services.join(', '),
                amount: parseFloat(newQuote.amount)
              }
            : inv
        );
        localStorage.setItem('kr-invoices', JSON.stringify(updatedInvoices));
        window.dispatchEvent(new Event('kr-invoices-updated'));
      }

      setEditingQuote(null);
      setNewQuote({ customerName: '', services: [] as string[], amount: '', time: '', notes: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (quote: Quote) => {
    setEditingQuote(quote);
    setNewQuote({
      customerName: quote.customerName,
      services: quote.services,
      amount: quote.amount.toString(),
      time: quote.time || '',
      notes: quote.notes
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteQuote = (quote: Quote) => {
    const updatedQuotes = quotes.filter((q) => q.id !== quote.id);
    setQuotes(updatedQuotes);

    // Save immediately and notify other components
    localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
    isSelfDispatching.current = true;
    window.dispatchEvent(new Event('kr-quotes-updated'));
    isSelfDispatching.current = false;

    // Delete corresponding job
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      const jobs = JSON.parse(savedJobs);
      const updatedJobs = jobs.filter((job: any) => job.quoteId !== quote.id);
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }

    // Track deleted job quote IDs to prevent recreation by syncQuotesWithJobs
    const deletedJobs = localStorage.getItem('kr-deleted-jobs');
    const deletedJobsList = deletedJobs ? JSON.parse(deletedJobs) : [];
    deletedJobsList.push(quote.id);
    localStorage.setItem('kr-deleted-jobs', JSON.stringify(deletedJobsList));

    // Delete corresponding invoice
    const savedInvoices = localStorage.getItem('kr-invoices');
    if (savedInvoices) {
      const invoices = JSON.parse(savedInvoices);
      const updatedInvoices = invoices.filter((inv: any) => inv.customerName !== quote.customerName || inv.service !== quote.services.join(', '));
      localStorage.setItem('kr-invoices', JSON.stringify(updatedInvoices));
      window.dispatchEvent(new Event('kr-invoices-updated'));
    }
  };

  const handleStatusChange = (quoteId: string, newStatus: Quote['status']) => {
    const updatedQuotes = quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q);
    setQuotes(updatedQuotes);

    // Save immediately and notify other components
    localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
    isSelfDispatching.current = true;
    window.dispatchEvent(new Event('kr-quotes-updated'));
    isSelfDispatching.current = false;

    // Map quote status to job status
    const jobStatusMap: Record<string, string> = {
      'pending': 'scheduled',
      'approved': 'scheduled',
      'rejected': 'cancelled',
      'invoiced': 'completed'
    };

    // Sync status change to corresponding job
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      const jobs = JSON.parse(savedJobs);
      const updatedJobs = jobs.map((job: any) =>
        job.quoteId === quoteId
          ? { ...job, status: jobStatusMap[newStatus] || job.status }
          : job
      );
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }

    // Sync status change to corresponding invoice
    const savedInvoices = localStorage.getItem('kr-invoices');
    if (savedInvoices) {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        const invoiceStatusMap: Record<string, string> = {
          'pending': 'pending',
          'approved': 'pending',
          'rejected': 'cancelled',
          'invoiced': 'paid'
        };
        const invoices = JSON.parse(savedInvoices);
        const updatedInvoices = invoices.map((inv: any) =>
          inv.customerName === quote.customerName && inv.service === quote.services.join(', ')
            ? { ...inv, status: invoiceStatusMap[newStatus] || inv.status }
            : inv
        );
        localStorage.setItem('kr-invoices', JSON.stringify(updatedInvoices));
        window.dispatchEvent(new Event('kr-invoices-updated'));
      }
    }
  };

  const totalPending = quotes
    .filter(q => q.status === 'pending')
    .reduce((sum, q) => sum + q.amount, 0);

  const totalApproved = quotes
    .filter(q => q.status === 'approved')
    .reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.filter(q => q.status === 'pending').length}</div>
            <p className="text-xs text-gray-500 mt-1">
              ${totalPending.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Quotes</CardTitle>
            <DollarSign className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.filter(q => q.status === 'approved').length}</div>
            <p className="text-xs text-gray-500 mt-1">
              ${totalApproved.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">All Quotes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Create Quote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
              <DialogDescription>
                Add a new quote to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Select
                  value={newQuote.customerName}
                  onValueChange={(value) => {
                    const services = getCustomerServicesFromAppointments(value);
                    const customerAppts = getCustomerAppointments(value);
                    const time = customerAppts.length > 0 ? customerAppts[0].time || '' : '';
                    setNewQuote({ ...newQuote, customerName: value, services, time });
                  }}
                >
                  <SelectTrigger id="customerName">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.name}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newQuote.customerName && getCustomerAppointments(newQuote.customerName).length > 0 && (
                <div>
                  <Label>Scheduled Appointments (from Calendar)</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {getCustomerAppointments(newQuote.customerName).map((apt, index) => (
                      <div key={apt.id || index} className="p-3 bg-gray-50 rounded-md border text-sm relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <Calendar className="size-4" />
                            {format(new Date(apt.date), 'MMM d, yyyy')}
                            {apt.time && (
                              <>
                                <Clock className="size-4 ml-2" />
                                {apt.time}
                              </>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete appointment"
                              >
                                <X className="size-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the appointment for {apt.customerName} on {format(new Date(apt.date), 'MMM d, yyyy')}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAppointment(apt.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(apt.services || []).map((service: string) => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {newQuote.time && (
                <div>
                  <Label>Scheduled Time</Label>
                  <div className="flex items-center gap-2 mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                    <Clock className="size-4 text-green-600" />
                    <span className="font-medium text-green-700">{newQuote.time}</span>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newQuote.amount}
                  onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })}
                  placeholder="350.00"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                  placeholder="Project details..."
                />
              </div>
              <Button onClick={handleAddQuote} className="w-full">
                Create Quote
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Quote</DialogTitle>
              <DialogDescription>
                Update the quote details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-customerName">Customer Name</Label>
                <Select
                  value={newQuote.customerName}
                  onValueChange={(value) => setNewQuote({ ...newQuote, customerName: value })}
                >
                  <SelectTrigger id="edit-customerName">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.name}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount ($)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={newQuote.amount}
                  onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })}
                  placeholder="350.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                  placeholder="Project details..."
                />
              </div>
              <Button onClick={handleEditQuote} className="w-full">
                Update Quote
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Change Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">{quote.id}</TableCell>
                <TableCell>{quote.customerName}</TableCell>
                <TableCell>{quote.services.join(', ')}</TableCell>
                <TableCell>${quote.amount.toLocaleString()}</TableCell>
                <TableCell>{format(new Date(quote.date), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      quote.status === 'approved'
                        ? 'default'
                        : quote.status === 'pending'
                        ? 'secondary'
                        : quote.status === 'invoiced'
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {quote.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={quote.status}
                    onValueChange={(value: Quote['status']) => handleStatusChange(quote.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="invoiced">Invoiced</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmailQuote(quote)}
                      title="Email quote to customer"
                    >
                      <Mail className="size-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditDialog(quote)}
                      title="Edit quote"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the quote for {quote.customerName}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteQuote(quote)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
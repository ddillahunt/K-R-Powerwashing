import { useState, useEffect } from 'react';
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
import { Plus, FileText, DollarSign, Edit, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface Quote {
  id: string;
  customerName: string;
  services: string[]; // Changed from service: string to services: string[]
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced';
  date: string; // Changed to string for localStorage serialization
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
    notes: 'Two-story home, 2500 sq ft'
  },
  {
    id: 'Q-002',
    customerName: 'Sarah Johnson',
    services: ['Driveway Cleaning'],
    amount: 175,
    status: 'pending',
    date: new Date(2026, 0, 28).toISOString(),
    notes: 'Concrete driveway, 400 sq ft'
  },
  {
    id: 'Q-003',
    customerName: 'Michael Brown',
    services: ['Deck/Patio Cleaning'],
    amount: 225,
    status: 'approved',
    date: new Date(2026, 0, 29).toISOString(),
    notes: 'Wood deck, 300 sq ft'
  }
];

export function QuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState({
    customerName: '',
    services: [] as string[],
    amount: '',
    notes: ''
  });

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

  // Sync quotes with jobs - ensure all APPROVED quotes have corresponding jobs
  const syncQuotesWithJobs = (quotesToSync: Quote[]) => {
    const savedJobs = localStorage.getItem('kr-jobs');
    const existingJobs = savedJobs ? JSON.parse(savedJobs) : [];
    
    // Get list of deleted job quote IDs to prevent recreation
    const deletedJobs = localStorage.getItem('kr-deleted-jobs');
    const deletedJobsList = deletedJobs ? JSON.parse(deletedJobs) : [];
    
    // Find APPROVED quotes that don't have corresponding jobs AND haven't been deleted
    const quotesWithoutJobs = quotesToSync.filter(quote => 
      quote.status === 'approved' &&
      !existingJobs.some((job: any) => job.quoteId === quote.id) &&
      !deletedJobsList.includes(quote.id)
    );
    
    if (quotesWithoutJobs.length > 0) {
      // Get customer data for addresses
      const savedCustomers = localStorage.getItem('kr-customers');
      const customers = savedCustomers ? JSON.parse(savedCustomers) : [];
      
      // Create jobs for quotes that don't have them
      const newJobs = quotesWithoutJobs.map((quote, index) => {
        const jobNumber = existingJobs.length + index + 1;
        const customer = customers.find((c: any) => c.name === quote.customerName);
        
        return {
          id: `J-${String(jobNumber).padStart(3, '0')}`,
          quoteId: quote.id,
          customerName: quote.customerName,
          service: quote.services.join(', '), // Join services array into a string
          address: customer?.address || '',
          scheduledDate: quote.date,
          assignedCrew: 'Unassigned',
          status: 'pending',
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

  // Load quotes from localStorage on component mount
  useEffect(() => {
    const loadQuotes = () => {
      const savedQuotes = localStorage.getItem('kr-quotes');
      if (savedQuotes) {
        const loadedQuotes = JSON.parse(savedQuotes);
        // Migrate old quotes from service (string) to services (array)
        const migratedQuotes = loadedQuotes.map((quote: any) => {
          if (quote.service && !quote.services) {
            return {
              ...quote,
              services: [quote.service],
              service: undefined
            };
          }
          return quote;
        });
        setQuotes(migratedQuotes);
        // Save migrated quotes back to localStorage
        localStorage.setItem('kr-quotes', JSON.stringify(migratedQuotes));
        // Sync all existing quotes with jobs
        syncQuotesWithJobs(migratedQuotes);
      } else {
        // Initialize with mock data if no saved data exists
        setQuotes(mockQuotes);
        localStorage.setItem('kr-quotes', JSON.stringify(mockQuotes));
        // Sync mock quotes with jobs
        syncQuotesWithJobs(mockQuotes);
      }
    };

    loadQuotes();

    // Listen for quote updates from other components (e.g., invoices)
    const handleQuotesUpdate = () => {
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

  // Save quotes to localStorage whenever they change
  useEffect(() => {
    // Only save if we've loaded quotes (avoid saving empty array on initial render)
    if (quotes.length > 0 || localStorage.getItem('kr-quotes')) {
      localStorage.setItem('kr-quotes', JSON.stringify(quotes));
      // Don't dispatch event here to avoid infinite loop
      // Events should only be dispatched when quotes are modified by user actions
    }
  }, [quotes]);

  const handleAddQuote = () => {
    // Generate a unique ID based on timestamp
    const quoteNumber = quotes.length + 1;
    const quote: Quote = {
      id: `Q-${String(quoteNumber).padStart(3, '0')}`,
      customerName: newQuote.customerName,
      services: newQuote.services,
      amount: parseFloat(newQuote.amount),
      status: 'pending',
      date: new Date().toISOString(),
      notes: newQuote.notes
    };
    setQuotes([...quotes, quote]);
    
    // CREATE JOB IMMEDIATELY with "pending" status
    const savedJobs = localStorage.getItem('kr-jobs');
    const existingJobs = savedJobs ? JSON.parse(savedJobs) : [];
    const jobNumber = existingJobs.length + 1;
    const jobId = `J-${String(jobNumber).padStart(3, '0')}`;
    
    // Get customer address if available
    const savedCustomers = localStorage.getItem('kr-customers');
    const customers = savedCustomers ? JSON.parse(savedCustomers) : [];
    const customer = customers.find((c: any) => c.name === newQuote.customerName);
    
    // Create a date at noon local time to avoid timezone issues
    const today = new Date();
    const scheduledDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0).toISOString();
    
    const newJob = {
      id: jobId,
      quoteId: quote.id,
      customerName: newQuote.customerName,
      service: newQuote.services.join(', '),
      address: customer?.address || '',
      scheduledDate,
      assignedCrew: 'Unassigned',
      status: 'pending', // Start as pending
      photos: [],
      notes: newQuote.notes
    };
    
    // Save job to localStorage
    localStorage.setItem('kr-jobs', JSON.stringify([...existingJobs, newJob]));
    
    // Dispatch custom event to notify Jobs tab
    window.dispatchEvent(new Event('kr-jobs-updated'));
    
    // NOTE: Invoice will be created when quote is approved, not here
    
    setNewQuote({ customerName: '', services: [] as string[], amount: '', notes: '' });
    setIsDialogOpen(false);
  };

  const handleEditQuote = () => {
    if (editingQuote) {
      const serviceString = newQuote.services.join(', ');

      const updatedQuotes = quotes.map((q) =>
        q.id === editingQuote.id
          ? {
              ...q,
              customerName: newQuote.customerName,
              services: newQuote.services,
              amount: parseFloat(newQuote.amount),
              notes: newQuote.notes
            }
          : q
      );
      setQuotes(updatedQuotes);

      // Always sync quote changes to linked jobs and invoices
      const savedJobs = localStorage.getItem('kr-jobs');
      if (savedJobs) {
        const allJobs = JSON.parse(savedJobs);
        let jobsUpdated = false;
        allJobs.forEach((job: any) => {
          if (job.quoteId === editingQuote.id) {
            job.service = serviceString;
            job.customerName = newQuote.customerName;
            job.notes = newQuote.notes;
            jobsUpdated = true;
          }
        });
        if (jobsUpdated) {
          localStorage.setItem('kr-jobs', JSON.stringify(allJobs));
          window.dispatchEvent(new Event('kr-jobs-updated'));
        }
      }

      const savedInvoices = localStorage.getItem('kr-invoices');
      if (savedInvoices) {
        const allInvoices = JSON.parse(savedInvoices);
        let invoicesUpdated = false;
        allInvoices.forEach((inv: any) => {
          if (inv.quoteId === editingQuote.id) {
            inv.service = serviceString;
            inv.customerName = newQuote.customerName;
            inv.amount = parseFloat(newQuote.amount);
            invoicesUpdated = true;
          }
        });
        if (invoicesUpdated) {
          localStorage.setItem('kr-invoices', JSON.stringify(allInvoices));
          window.dispatchEvent(new Event('kr-invoices-updated'));
        }
      }

      setEditingQuote(null);
      setNewQuote({ customerName: '', services: [] as string[], amount: '', notes: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (quote: Quote) => {
    setEditingQuote(quote);
    setNewQuote({
      customerName: quote.customerName,
      services: quote.services,
      amount: quote.amount.toString(),
      notes: quote.notes
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteQuote = (quote: Quote) => {
    const updatedQuotes = quotes.filter((q) => q.id !== quote.id);
    setQuotes(updatedQuotes);
  };

  const handleOpenEmailDialog = (quote: Quote) => {
    // Get customer email
    const customer = customers.find(c => c.name === quote.customerName);
    const customerEmail = customer?.email || '';
    
    if (!customerEmail) {
      alert('No email address found for this customer. Please update customer information.');
      return;
    }
    
    // Create email content
    const subject = `Quote ${quote.id} from K&R POWERWASHING`;
    const message = `Dear ${quote.customerName},

Thank you for your interest in K&R POWERWASHING. Please find your quote details below:

Quote ID: ${quote.id}
Date: ${format(new Date(quote.date), 'MMMM d, yyyy')}

Services:
${quote.services.map(s => `• ${s}`).join('\n')}

Total Amount: $${quote.amount.toLocaleString()}

${quote.notes ? `Notes:\n${quote.notes}` : ''}

We look forward to serving you!

Best regards,
K&R POWERWASHING Team`;
    
    // Create mailto link and open email client
    const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoLink;
  };

  const handleStatusChange = (quoteId: string, newStatus: Quote['status']) => {
    // Get the quote being updated
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    
    // Update quote status
    const updatedQuotes = quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q);
    setQuotes(updatedQuotes);
    
    // When quote is approved, update the job status from "pending" to "scheduled" AND create invoice
    if (newStatus === 'approved') {
      console.log('=== QUOTE APPROVED ===');
      console.log('Quote ID:', quoteId);
      console.log('Quote:', quote);
      
      const savedJobs = localStorage.getItem('kr-jobs');
      const existingJobs = savedJobs ? JSON.parse(savedJobs) : [];
      
      console.log('All jobs in localStorage:', existingJobs);
      
      // Find the job associated with this quote
      const jobIndex = existingJobs.findIndex((job: any) => job.quoteId === quoteId);
      
      console.log('Job index found:', jobIndex);
      
      if (jobIndex !== -1) {
        console.log('Found job! Updating status to scheduled...');
        console.log('Job before update:', existingJobs[jobIndex]);
        
        // Update the job status to "scheduled"
        existingJobs[jobIndex].status = 'scheduled';
        
        console.log('Job after update:', existingJobs[jobIndex]);
        
        // Save updated jobs to localStorage
        localStorage.setItem('kr-jobs', JSON.stringify(existingJobs));
        
        console.log('Saved to localStorage. Dispatching events...');
        
        // Force a small delay to ensure localStorage is written
        setTimeout(() => {
          // Dispatch events to notify Jobs tab and Calendar tab
          window.dispatchEvent(new Event('kr-jobs-updated'));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'kr-jobs',
            newValue: JSON.stringify(existingJobs),
            url: window.location.href
          }));
          console.log('Events dispatched!');
        }, 100);
      } else {
        console.log('No job found. Creating new job with scheduled status...');
        
        // If job doesn't exist, create it now
        const savedCustomers = localStorage.getItem('kr-customers');
        const customers = savedCustomers ? JSON.parse(savedCustomers) : [];
        const customer = customers.find((c: any) => c.name === quote.customerName);
        
        const jobNumber = existingJobs.length + 1;
        const newJob = {
          id: `J-${String(jobNumber).padStart(3, '0')}`,
          quoteId: quoteId,
          customerName: quote.customerName,
          service: quote.services.join(', '),
          address: customer?.address || '',
          scheduledDate: quote.date,
          assignedCrew: 'Unassigned',
          status: 'scheduled', // Set directly to scheduled since quote is approved
          photos: [],
          notes: quote.notes
        };
        
        console.log('New job created:', newJob);
        
        const updatedJobs = [...existingJobs, newJob];
        localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
        
        console.log('Saved to localStorage. Dispatching events...');
        
        // Force a small delay to ensure localStorage is written
        setTimeout(() => {
          // Dispatch events
          window.dispatchEvent(new Event('kr-jobs-updated'));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'kr-jobs',
            newValue: JSON.stringify(updatedJobs),
            url: window.location.href
          }));
          console.log('Events dispatched!');
        }, 100);
      }
      
      // CREATE INVOICE when quote is approved
      const savedInvoices = localStorage.getItem('kr-invoices');
      const existingInvoices = savedInvoices ? JSON.parse(savedInvoices) : [];
      
      // Check if invoice already exists for this quote
      const invoiceExists = existingInvoices.some((inv: any) => inv.quoteId === quoteId);
      
      if (!invoiceExists) {
        const invoiceNumber = existingInvoices.length + 1;
        const invoiceId = `INV-${String(invoiceNumber).padStart(3, '0')}`;
        
        const newInvoice = {
          id: invoiceId,
          quoteId: quoteId, // Link invoice to quote
          customerName: quote.customerName,
          service: quote.services.join(', '),
          amount: quote.amount,
          status: 'pending',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          quickbooksSynced: false
        };
        
        // Save invoice to localStorage
        localStorage.setItem('kr-invoices', JSON.stringify([...existingInvoices, newInvoice]));
        
        // Dispatch custom event to notify Invoices tab
        window.dispatchEvent(new Event('kr-invoices-updated'));
        
        console.log('Invoice created for approved quote:', quoteId);
      } else {
        console.log('Invoice already exists for quote:', quoteId);
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
                  onValueChange={(value) => setNewQuote({ ...newQuote, customerName: value })}
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
              <div>
                <Label htmlFor="service">Service Type (Select one or more)</Label>
                <div className="space-y-3 border rounded-md p-4 max-h-48 overflow-y-auto bg-gray-50">
                  {availableServices.map(service => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service}`}
                        checked={newQuote.services.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <label
                        htmlFor={`service-${service}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {service}
                      </label>
                    </div>
                  ))}
                </div>
                {newQuote.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {newQuote.services.map(service => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
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
                <Label htmlFor="edit-service">Service Type (Select one or more)</Label>
                <div className="space-y-3 border rounded-md p-4 max-h-48 overflow-y-auto bg-gray-50">
                  {availableServices.map(service => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service}`}
                        checked={newQuote.services.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <label
                        htmlFor={`service-${service}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {service}
                      </label>
                    </div>
                  ))}
                </div>
                {newQuote.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {newQuote.services.map(service => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}
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
                      onClick={() => handleOpenEditDialog(quote)}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEmailDialog(quote)}
                    >
                      <Mail className="size-4" />
                    </Button>
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
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { DollarSign, TrendingUp, Clock, Upload, CheckCircle2, AlertCircle, Loader2, Info, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Invoice {
  id: string;
  customerName: string;
  service: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: Date;
  paidDate?: Date;
  quickbooksSynced?: boolean;
  quickbooksId?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: 'INV-001',
    customerName: 'John Smith',
    service: 'House Exterior Wash',
    amount: 350,
    status: 'paid',
    dueDate: new Date(2026, 0, 20),
    paidDate: new Date(2026, 0, 18)
  },
  {
    id: 'INV-002',
    customerName: 'Sarah Johnson',
    service: 'Driveway Cleaning',
    amount: 175,
    status: 'pending',
    dueDate: new Date(2026, 1, 5)
  },
  {
    id: 'INV-003',
    customerName: 'Michael Brown',
    service: 'Deck/Patio Cleaning',
    amount: 225,
    status: 'paid',
    dueDate: new Date(2026, 0, 15),
    paidDate: new Date(2026, 0, 14)
  },
  {
    id: 'INV-004',
    customerName: 'Emily Davis',
    service: 'Roof Cleaning',
    amount: 450,
    status: 'overdue',
    dueDate: new Date(2026, 0, 10)
  }
];

export function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [syncingInvoices, setSyncingInvoices] = useState<Set<string>>(new Set());

  // Load invoices from localStorage on component mount
  useEffect(() => {
    const loadInvoices = () => {
      const savedInvoices = localStorage.getItem('kr-invoices');
      if (savedInvoices) {
        const parsedInvoices = JSON.parse(savedInvoices);
        // Convert date strings back to Date objects
        const invoicesWithDates = parsedInvoices.map((inv: any) => ({
          ...inv,
          dueDate: new Date(inv.dueDate),
          paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined
        }));
        setInvoices(invoicesWithDates);
      } else {
        // Initialize with mock data if no saved data exists
        setInvoices(mockInvoices);
        localStorage.setItem('kr-invoices', JSON.stringify(mockInvoices));
      }
    };

    loadInvoices();

    // Listen for invoice updates from other components
    const handleInvoicesUpdate = () => {
      loadInvoices();
    };

    window.addEventListener('kr-invoices-updated', handleInvoicesUpdate);
    return () => window.removeEventListener('kr-invoices-updated', handleInvoicesUpdate);
  }, []);

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    if (invoices.length >= 0 && localStorage.getItem('kr-invoices')) {
      localStorage.setItem('kr-invoices', JSON.stringify(invoices));
    }
  }, [invoices]);

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

  // Get customer email by name
  const getCustomerEmail = (customerName: string): string => {
    const customer = customers.find(c => c.name === customerName);
    return customer?.email || '';
  };

  // Generate mailto link for emailing invoice to customer
  const handleEmailInvoice = (invoice: Invoice) => {
    const customerEmail = getCustomerEmail(invoice.customerName);
    const subject = encodeURIComponent(`Invoice ${invoice.id} from K&R Powerwashing`);
    const statusText = invoice.status === 'paid'
      ? 'This invoice has been marked as PAID. Thank you for your payment!'
      : invoice.status === 'overdue'
      ? 'This invoice is currently OVERDUE. Please remit payment at your earliest convenience.'
      : 'Payment is due by the date shown below.';

    const body = encodeURIComponent(
`Dear ${invoice.customerName},

Please find your invoice details below:

Invoice ID: ${invoice.id}
Service: ${invoice.service}
Amount Due: $${invoice.amount.toLocaleString()}
Due Date: ${format(invoice.dueDate, 'MMMM d, yyyy')}
Status: ${invoice.status.toUpperCase()}

${statusText}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
K&R Powerwashing Team`
    );
    const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => {
    setInvoices(invoices.map(inv => 
      inv.id === invoiceId 
        ? { 
            ...inv, 
            status: newStatus,
            paidDate: newStatus === 'paid' ? new Date() : undefined
          }
        : inv
    ));
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices(invoices.filter(inv => inv.id !== invoiceId));
  };

  const syncToQuickBooks = async (invoice: Invoice) => {
    setSyncingInvoices(prev => new Set(prev).add(invoice.id));

    try {
      console.log('Syncing invoice to QuickBooks:', invoice);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4e82aa29/quickbooks/sync-invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ invoice })
        }
      );

      const data = await response.json();
      console.log('QuickBooks sync response:', data);

      if (!response.ok) {
        // More detailed error message
        let errorMsg = data.error || 'Failed to sync invoice to QuickBooks';
        if (data.troubleshooting) {
          errorMsg += `\n\nTroubleshooting: ${data.troubleshooting}`;
        }
        if (data.details) {
          console.error('QuickBooks API details:', data.details);
        }
        throw new Error(errorMsg);
      }

      // Update invoice with QuickBooks sync status
      setInvoices(invoices.map(inv => 
        inv.id === invoice.id 
          ? { 
              ...inv, 
              quickbooksSynced: true,
              quickbooksId: data.quickbooksInvoiceId
            }
          : inv
      ));

      console.log('QuickBooks sync success:', data);
      
      // Show appropriate success message
      if (data.mockMode) {
        alert(`✅ Invoice ${invoice.id} synced in DEMO mode!\n\n⚠️ QuickBooks credentials not configured. This is a demonstration sync.\n\nTo sync to real QuickBooks, configure your API credentials.`);
      } else {
        alert(`✅ Invoice ${invoice.id} successfully synced to QuickBooks!\n\nQuickBooks ID: ${data.quickbooksInvoiceId}`);
      }

    } catch (error) {
      console.error('Error syncing to QuickBooks:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`❌ Failed to sync invoice to QuickBooks\n\n${errorMessage}\n\nCheck the browser console for more details.`);
      
    } finally {
      setSyncingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoice.id);
        return newSet;
      });
    }
  };

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingPayments = invoices
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
  const syncedCount = invoices.filter(inv => inv.quickbooksSynced).length;

  return (
    <div className="space-y-6">
      {/* Info Alert for QuickBooks Setup */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="text-blue-600" />
        <AlertTitle className="text-blue-900">QuickBooks Integration</AlertTitle>
        <AlertDescription className="text-blue-800">
          Click the upload button (↑) next to any invoice to sync it to QuickBooks. 
          <br /><br />
          <strong>Demo Mode:</strong> If QuickBooks credentials are not configured or invalid, the system will automatically use demo mode for testing.
          <br /><br />
          <strong>For Real QuickBooks Integration:</strong>
          <br />
          • QuickBooks OAuth 2.0 access tokens are typically 500+ characters long
          <br />
          • Tokens expire after 1 hour and require refresh using OAuth flow
          <br />
          • You'll need valid QUICKBOOKS_CLIENT_ID, QUICKBOOKS_ACCESS_TOKEN, and QUICKBOOKS_REALM_ID
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {invoices.filter(inv => inv.status === 'paid').length} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingPayments.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <TrendingUp className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">QuickBooks Synced</CardTitle>
            <CheckCircle2 className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{syncedCount}/{invoices.length}</div>
            <p className="text-xs text-green-700 mt-1">
              {syncedCount === invoices.length ? 'All synced!' : `${invoices.length - syncedCount} pending`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QuickBooks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>{invoice.service}</TableCell>
                <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                <TableCell>{format(invoice.dueDate, 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {invoice.paidDate ? format(invoice.paidDate, 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      invoice.status === 'paid'
                        ? 'default'
                        : invoice.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {invoice.quickbooksSynced ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="size-4" />
                      <span className="text-xs">Synced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <AlertCircle className="size-4" />
                      <span className="text-xs">Not synced</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={invoice.status}
                      onValueChange={(value: Invoice['status']) => handleStatusChange(invoice.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailInvoice(invoice)}
                      title="Email invoice to customer"
                    >
                      <Mail className="size-4 text-green-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={syncingInvoices.has(invoice.id) || invoice.quickbooksSynced}
                      onClick={() => syncToQuickBooks(invoice)}
                      title={invoice.quickbooksSynced ? 'Already synced to QuickBooks' : 'Sync to QuickBooks'}
                    >
                      {syncingInvoices.has(invoice.id) ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete invoice"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete invoice {invoice.id} for {invoice.customerName}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="bg-red-600 hover:bg-red-700"
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
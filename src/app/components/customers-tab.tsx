import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Search, Plus, Phone, Mail, MapPin, Edit, Trash2, Users, DollarSign, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';

// Format phone number to NANP format: (XXX) XXX-XXXX
function formatPhoneNANP(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Handle 11 digits starting with 1 (country code)
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return phone; // Return original if can't format
}

// Customer management component with edit, delete, and email functionality
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  totalJobs: number;
  totalSpent: number;
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    address: '123 Main St, Springfield, IL 62701',
    status: 'active',
    totalJobs: 5,
    totalSpent: 1250
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 234-5678',
    address: '456 Oak Ave, Springfield, IL 62702',
    status: 'active',
    totalJobs: 3,
    totalSpent: 875
  },
  {
    id: '3',
    name: 'Michael Brown',
    email: 'mbrown@email.com',
    phone: '(555) 345-6789',
    address: '789 Elm Street, Springfield, IL 62703',
    status: 'active',
    totalJobs: 8,
    totalSpent: 2340
  }
];

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Load customers from localStorage on component mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem('kr-customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    } else {
      // Initialize with mock data if no saved data exists
      setCustomers(mockCustomers);
      localStorage.setItem('kr-customers', JSON.stringify(mockCustomers));
    }
  }, []);

  // Load quotes, jobs, and invoices for dashboard stats
  useEffect(() => {
    const loadData = () => {
      const savedQuotes = localStorage.getItem('kr-quotes');
      if (savedQuotes) setQuotes(JSON.parse(savedQuotes));

      const savedJobs = localStorage.getItem('kr-jobs');
      if (savedJobs) setJobs(JSON.parse(savedJobs));

      const savedInvoices = localStorage.getItem('kr-invoices');
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    };

    loadData();

    // Listen for updates
    const handleUpdate = () => loadData();

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('kr-quotes-updated', handleUpdate);
    window.addEventListener('kr-jobs-updated', handleUpdate);
    window.addEventListener('kr-invoices-updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('kr-quotes-updated', handleUpdate);
      window.removeEventListener('kr-jobs-updated', handleUpdate);
      window.removeEventListener('kr-invoices-updated', handleUpdate);
    };
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    // Only save if we've loaded customers (avoid saving empty array on initial render)
    if (customers.length > 0 || localStorage.getItem('kr-customers')) {
      localStorage.setItem('kr-customers', JSON.stringify(customers));
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('kr-customers-updated'));
    }
  }, [customers]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleAddCustomer = () => {
    // Generate a unique ID based on timestamp and random number
    const customer: Customer = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...newCustomer,
      phone: formatPhoneNANP(newCustomer.phone),
      status: 'active',
      totalJobs: 0,
      totalSpent: 0
    };
    setCustomers([...customers, customer]);
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
    setIsDialogOpen(false);
  };

  const handleEditCustomer = () => {
    if (editingCustomer) {
      const updatedCustomers = customers.map(customer =>
        customer.id === editingCustomer.id ? { ...customer, ...newCustomer, phone: formatPhoneNANP(newCustomer.phone) } : customer
      );
      setCustomers(updatedCustomers);
      setEditingCustomer(null);
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const updatedCustomers = customers.filter(customer => customer.id !== id);
    setCustomers(updatedCustomers);
  };

  // Helper function to get customer stats from quotes
  const getCustomerStats = (customerName: string) => {
    const customerQuotes = quotes.filter(q => q.customerName === customerName);
    return {
      totalJobs: customerQuotes.length,
      totalSpent: customerQuotes.reduce((sum, q) => sum + (q.amount || 0), 0)
    };
  };

  // Calculate dashboard stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft' || i.status === 'pending');
  const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const overdueRevenue = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Customers</p>
                <p className="text-3xl font-bold">{totalCustomers}</p>
                <p className="text-blue-200 text-xs">{activeCustomers} active</p>
              </div>
              <Users className="size-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Completed Jobs</p>
                <p className="text-3xl font-bold">{completedJobs}</p>
                <p className="text-purple-200 text-xs">{jobs.length} total</p>
              </div>
              <Briefcase className="size-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-green-200 text-xs">{paidInvoices.length} paid invoices</p>
              </div>
              <DollarSign className="size-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm font-medium">Pending Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(pendingRevenue)}</p>
                <p className="text-cyan-200 text-xs">{pendingInvoices.length} pending invoices</p>
              </div>
              <TrendingUp className="size-10 text-cyan-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold">{formatCurrency(overdueRevenue)}</p>
                <p className="text-red-200 text-xs">{overdueInvoices.length} overdue invoices</p>
              </div>
              <AlertCircle className="size-10 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-4" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter the customer's details below to add them to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="john@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>
              <Button onClick={handleAddCustomer} className="w-full">
                Add Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer.name);
              return (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-3 text-gray-400" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-3 text-gray-400" />
                      {formatPhoneNANP(customer.phone)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-3 text-gray-400" />
                    {customer.address}
                  </div>
                </TableCell>
                <TableCell>{stats.totalJobs}</TableCell>
                <TableCell>${stats.totalSpent.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open(`mailto:${customer.email}`, '_blank');
                      }}
                      title="Email customer"
                    >
                      <Mail className="size-4 text-green-600" />
                    </Button>
                    <Dialog open={isEditDialogOpen && editingCustomer?.id === customer.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open);
                      if (!open) {
                        setEditingCustomer(null);
                        setNewCustomer({ name: '', email: '', phone: '', address: '' });
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setNewCustomer({
                              name: customer.name,
                              email: customer.email,
                              phone: customer.phone,
                              address: customer.address
                            });
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit customer"
                        >
                          <Edit className="size-4 text-blue-600" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Customer</DialogTitle>
                          <DialogDescription>
                            Update the customer's details below.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                              id="edit-name"
                              value={newCustomer.name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                              placeholder="John Smith"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={newCustomer.email}
                              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                              placeholder="john@email.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                              id="edit-phone"
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-address">Address</Label>
                            <Input
                              id="edit-address"
                              value={newCustomer.address}
                              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                              placeholder="123 Main St, City, State ZIP"
                            />
                          </div>
                          <Button onClick={handleEditCustomer} className="w-full">
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete customer"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {customer.name} from the system. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
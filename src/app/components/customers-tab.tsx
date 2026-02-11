import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Search, Plus, Phone, Mail, MapPin, Edit, Trash2, Send, Archive, RotateCcw } from 'lucide-react';
import { YearlyRemindersBanner } from '@/app/components/yearly-reminders-banner';

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
  const [isArchivedDialogOpen, setIsArchivedDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [addressParts, setAddressParts] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
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

    // Load archived customers
    const savedArchivedCustomers = localStorage.getItem('kr-archived-customers');
    if (savedArchivedCustomers) {
      setArchivedCustomers(JSON.parse(savedArchivedCustomers));
    }
  }, []);

  // Load quotes to calculate dynamic job counts
  useEffect(() => {
    const loadQuotes = () => {
      const savedQuotes = localStorage.getItem('kr-quotes');
      if (savedQuotes) {
        setQuotes(JSON.parse(savedQuotes));
      }
    };
    
    loadQuotes();

    // Listen for quote updates
    const handleQuotesUpdate = () => {
      loadQuotes();
    };

    window.addEventListener('storage', (e) => {
      if (e.key === 'kr-quotes') {
        loadQuotes();
      }
    });
    window.addEventListener('kr-quotes-updated', handleQuotesUpdate);

    return () => {
      window.removeEventListener('storage', loadQuotes);
      window.removeEventListener('kr-quotes-updated', handleQuotesUpdate);
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
    // Combine address parts into a single string
    const fullAddress = `${addressParts.street}, ${addressParts.city}, ${addressParts.state} ${addressParts.zip}`;
    
    // Generate a unique ID based on timestamp and random number
    const customer: Customer = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...newCustomer,
      address: fullAddress,
      status: 'active',
      totalJobs: 0,
      totalSpent: 0
    };
    setCustomers([...customers, customer]);
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
    setAddressParts({ street: '', city: '', state: '', zip: '' });
    setIsDialogOpen(false);
  };

  const handleEditCustomer = () => {
    if (editingCustomer) {
      const updatedCustomers = customers.map(customer =>
        customer.id === editingCustomer.id ? { ...customer, ...newCustomer } : customer
      );
      setCustomers(updatedCustomers);
      setEditingCustomer(null);
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleArchiveCustomer = (customer: Customer) => {
    // Add timestamp to archived customer
    const archivedCustomer = {
      ...customer,
      archivedDate: new Date().toISOString()
    };
    
    // Add to archived customers
    const updatedArchivedCustomers = [...archivedCustomers, archivedCustomer];
    setArchivedCustomers(updatedArchivedCustomers);
    localStorage.setItem('kr-archived-customers', JSON.stringify(updatedArchivedCustomers));
    
    // Remove from active customers
    const updatedCustomers = customers.filter(c => c.id !== customer.id);
    setCustomers(updatedCustomers);
  };

  const handleRestoreCustomer = (archivedCustomer: any) => {
    // Remove archivedDate field before restoring
    const { archivedDate, ...customerData } = archivedCustomer;
    
    // Add back to active customers
    const updatedCustomers = [...customers, customerData as Customer];
    setCustomers(updatedCustomers);
    
    // Remove from archived customers
    const updatedArchivedCustomers = archivedCustomers.filter(c => c.id !== archivedCustomer.id);
    setArchivedCustomers(updatedArchivedCustomers);
    localStorage.setItem('kr-archived-customers', JSON.stringify(updatedArchivedCustomers));
  };

  const handlePermanentDelete = (archivedCustomer: any) => {
    // Permanently remove from archived customers
    const updatedArchivedCustomers = archivedCustomers.filter(c => c.id !== archivedCustomer.id);
    setArchivedCustomers(updatedArchivedCustomers);
    localStorage.setItem('kr-archived-customers', JSON.stringify(updatedArchivedCustomers));
  };

  // Helper function to get customer stats from quotes
  const getCustomerStats = (customerName: string) => {
    const customerQuotes = quotes.filter(q => q.customerName === customerName);
    return {
      totalJobs: customerQuotes.length,
      totalSpent: customerQuotes.reduce((sum, q) => sum + (q.amount || 0), 0)
    };
  };

  // Handle mass email to all active customers
  const handleMassEmail = () => {
    // Get all active customer emails
    const activeCustomers = customers.filter(c => c.status === 'active');
    
    if (activeCustomers.length === 0) {
      alert('No active customers found.');
      return;
    }

    // Get all valid emails
    const emailList = activeCustomers
      .filter(c => c.email && c.email.trim() !== '')
      .map(c => c.email)
      .join(',');

    if (!emailList) {
      alert('No valid email addresses found for active customers.');
      return;
    }

    // Create email content
    const subject = 'Special Offer from K&R POWERWASHING';
    const message = `Dear Valued Customer,

We hope this message finds you well!

At K&R POWERWASHING, we're grateful for your continued trust and support. We wanted to reach out to let you know about our latest services and special offers.

Whether you need:
• House Exterior Washing
• Driveway Cleaning
• Deck/Patio Cleaning
• Roof Cleaning
• Sidewalk & Gutter Cleaning

We're here to help keep your property looking its best!

Contact us today to schedule your next service or to learn more about our current promotions.

Thank you for choosing K&R POWERWASHING!

Best regards,
K&R POWERWASHING Team

www.krpowerwashing.org`;

    // Create mailto link with BCC for all customers
    const mailtoLink = `mailto:?bcc=${encodeURIComponent(emailList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="space-y-6">
      <YearlyRemindersBanner />
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-4" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMassEmail}
            title="Send mass email to all active customers"
            className="border-[#2563eb] text-[#2563eb] hover:bg-blue-50"
          >
            <Send className="size-4 mr-2" />
            Mass Email
          </Button>
          <Dialog open={isArchivedDialogOpen} onOpenChange={setIsArchivedDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-600 text-gray-600 hover:bg-gray-50">
                <Archive className="size-4 mr-2" />
                View Archived ({archivedCustomers.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Archived Customers</DialogTitle>
                <DialogDescription>
                  View and manage archived customer records. You can restore customers to the active list or permanently delete them.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                {archivedCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No archived customers found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Archived Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedCustomers.map((archivedCustomer: any) => (
                        <TableRow key={archivedCustomer.id}>
                          <TableCell className="font-medium">{archivedCustomer.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="size-3 text-gray-400" />
                                {archivedCustomer.email}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="size-3 text-gray-400" />
                                {archivedCustomer.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="size-3 text-gray-400" />
                              {archivedCustomer.address}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(archivedCustomer.archivedDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreCustomer(archivedCustomer)}
                                title="Restore customer to active list"
                                className="border-[#2563eb] text-[#2563eb] hover:bg-blue-50"
                              >
                                <RotateCcw className="size-4 mr-1" />
                                Restore
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    title="Permanently delete customer"
                                    className="border-red-600 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="size-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Permanently Delete Customer?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {archivedCustomer.name} from the archive. This action cannot be undone and all data will be lost.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handlePermanentDelete(archivedCustomer)} className="bg-red-600 hover:bg-red-700">
                                      Permanently Delete
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
                )}
              </div>
            </DialogContent>
          </Dialog>
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
                  <Label>Address</Label>
                  <div className="space-y-2">
                    <Input
                      id="street"
                      value={addressParts.street}
                      onChange={(e) => setAddressParts({ ...addressParts, street: e.target.value })}
                      placeholder="Street Address"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        id="city"
                        value={addressParts.city}
                        onChange={(e) => setAddressParts({ ...addressParts, city: e.target.value })}
                        placeholder="City"
                        className="col-span-1"
                      />
                      <Input
                        id="state"
                        value={addressParts.state}
                        onChange={(e) => setAddressParts({ ...addressParts, state: e.target.value })}
                        placeholder="State"
                        className="col-span-1"
                      />
                      <Input
                        id="zip"
                        value={addressParts.zip}
                        onChange={(e) => setAddressParts({ ...addressParts, zip: e.target.value })}
                        placeholder="ZIP"
                        className="col-span-1"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddCustomer} className="w-full">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                      {customer.phone}
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
                        window.location.href = `mailto:${customer.email}`;
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
                          title="Archive customer"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive Customer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will archive {customer.name}'s information. The customer data will be saved and can be retrieved later if needed. They will be removed from the active customer list.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleArchiveCustomer(customer)} className="bg-orange-600 hover:bg-orange-700">
                            Archive Customer
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
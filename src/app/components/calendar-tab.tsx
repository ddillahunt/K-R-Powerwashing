import { useState, useEffect, useRef } from 'react';
import { Calendar } from '@/app/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Clock, MapPin, Plus, Edit, Trash2, X, Users, UserPlus, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  services: string[]; // Changed from service: string to services: string[]
  date: string; // Changed to string for localStorage serialization
  time: string;
  assignedCrew: string;
  address: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

const mockAppointments: Appointment[] = [];

export function CalendarTab() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // Track if initial load is complete
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newAppointment, setNewAppointment] = useState({
    customerName: '',
    services: [] as string[],
    time: '8:00 AM',
    assignedCrew: 'Unassigned',
    address: '',
    notes: ''
  });
  const [isTechDialogOpen, setIsTechDialogOpen] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [technicians, setTechnicians] = useState<string[]>([]);
  const isSelfDispatching = useRef(false);

  // Load technicians from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kr-technicians');
    if (saved) {
      setTechnicians(JSON.parse(saved));
    }
  }, []);

  // Combined list: custom technicians + Unassigned (always last)
  const availableCrews = [...technicians, 'Unassigned'];

  const handleAddTechnician = () => {
    const trimmed = newTechName.trim();
    if (trimmed && !technicians.includes(trimmed)) {
      const updated = [...technicians, trimmed];
      setTechnicians(updated);
      localStorage.setItem('kr-technicians', JSON.stringify(updated));
    }
    setNewTechName('');
  };

  const handleDeleteTechnician = (name: string) => {
    const updated = technicians.filter((t: string) => t !== name);
    setTechnicians(updated);
    localStorage.setItem('kr-technicians', JSON.stringify(updated));
  };

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
    setNewAppointment(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  // Load appointments from localStorage on component mount
  useEffect(() => {
    const savedAppointments = localStorage.getItem('kr-appointments');
    if (savedAppointments) {
      const parsed = JSON.parse(savedAppointments);
      // If saved data is an empty array, restore mock data
      if (Array.isArray(parsed) && parsed.length === 0) {
        setAppointments(mockAppointments);
        localStorage.setItem('kr-appointments', JSON.stringify(mockAppointments));
      } else {
        setAppointments(parsed);
      }
    } else {
      // Initialize with mock data if no saved data exists
      setAppointments(mockAppointments);
      localStorage.setItem('kr-appointments', JSON.stringify(mockAppointments));
    }
    setIsLoaded(true); // Mark as loaded after initial data is set

    // Listen for appointments updates from other components (skip self-dispatched events)
    const handleAppointmentsUpdate = () => {
      if (isSelfDispatching.current) return;
      const updatedAppointments = localStorage.getItem('kr-appointments');
      if (updatedAppointments) {
        setAppointments(JSON.parse(updatedAppointments));
      }
    };

    window.addEventListener('kr-appointments-updated', handleAppointmentsUpdate);
    return () => window.removeEventListener('kr-appointments-updated', handleAppointmentsUpdate);
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

  // Save appointments to localStorage whenever they change (only after initial load)
  // Note: Do NOT dispatch kr-appointments-updated here to avoid a feedback loop
  // with this component's own listener. Handlers dispatch the event directly instead.
  useEffect(() => {
    if (isLoaded && appointments.length > 0) {
      localStorage.setItem('kr-appointments', JSON.stringify(appointments));
    }
  }, [appointments, isLoaded]);

  const selectedDateAppointments = appointments.filter(
    (apt) => selectedDate && format(new Date(apt.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  // All appointments sorted ascending by date, then by time
  const allAppointmentsSorted = [...appointments].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    // Parse time strings like "9:00 AM" for secondary sort
    const parseTime = (t: string) => {
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    return parseTime(a.time) - parseTime(b.time);
  });

  const handleAddAppointment = () => {
    if (selectedDate) {
      // Generate a unique ID based on timestamp and random number
      const appointment: Appointment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...newAppointment,
        date: selectedDate.toISOString(),
        status: 'scheduled'
      };
      const updatedAppointments = [...appointments, appointment];
      setAppointments(updatedAppointments);

      // Save immediately and notify other components
      localStorage.setItem('kr-appointments', JSON.stringify(updatedAppointments));
      isSelfDispatching.current = true;
      window.dispatchEvent(new Event('kr-appointments-updated'));
      isSelfDispatching.current = false;

      // Sync new appointment data to any existing related entities
      syncToRelatedEntities(newAppointment, selectedDate.toISOString());

      setNewAppointment({ customerName: '', services: [], time: '8:00 AM', assignedCrew: 'Unassigned', address: '', notes: '' });
      setIsDialogOpen(false);
    }
  };

  // Sync appointment data to quotes, jobs, and invoices when appointment is updated
  const syncToRelatedEntities = (appointmentData: { customerName: string; services: string[]; time: string; assignedCrew: string; address: string; notes: string }, appointmentDate: string) => {
    const servicesString = appointmentData.services.join(', ');
    const appointmentDateStr = format(new Date(appointmentDate), 'yyyy-MM-dd');

    // Update quotes
    const savedQuotes = localStorage.getItem('kr-quotes');
    if (savedQuotes) {
      const quotes = JSON.parse(savedQuotes);
      const updatedQuotes = quotes.map((quote: any) => {
        const quoteDate = format(new Date(quote.date), 'yyyy-MM-dd');
        if (quote.customerName === appointmentData.customerName && quoteDate === appointmentDateStr) {
          return { ...quote, services: appointmentData.services, time: appointmentData.time, assignedCrew: appointmentData.assignedCrew };
        }
        return quote;
      });
      localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
      window.dispatchEvent(new Event('kr-quotes-updated'));
    }

    // Update jobs
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      const jobs = JSON.parse(savedJobs);
      const updatedJobs = jobs.map((job: any) => {
        const jobDate = format(new Date(job.scheduledDate), 'yyyy-MM-dd');
        if (job.customerName === appointmentData.customerName && jobDate === appointmentDateStr) {
          return {
            ...job,
            service: servicesString,
            scheduledTime: appointmentData.time,
            assignedCrew: appointmentData.assignedCrew,
            address: appointmentData.address,
            notes: appointmentData.notes
          };
        }
        return job;
      });
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }

    // Update invoices
    const savedInvoices = localStorage.getItem('kr-invoices');
    if (savedInvoices) {
      const invoices = JSON.parse(savedInvoices);
      const updatedInvoices = invoices.map((invoice: any) => {
        if (invoice.customerName === appointmentData.customerName) {
          return { ...invoice, service: servicesString };
        }
        return invoice;
      });
      localStorage.setItem('kr-invoices', JSON.stringify(updatedInvoices));
      window.dispatchEvent(new Event('kr-invoices-updated'));
    }
  };

  const handleEditAppointment = () => {
    if (editingAppointment) {
      const updatedAppointments = appointments.map((apt) =>
        apt.id === editingAppointment.id ? { ...apt, ...newAppointment } : apt
      );
      setAppointments(updatedAppointments);

      // Save immediately and notify other components
      localStorage.setItem('kr-appointments', JSON.stringify(updatedAppointments));
      isSelfDispatching.current = true;
      window.dispatchEvent(new Event('kr-appointments-updated'));
      isSelfDispatching.current = false;

      // Sync all appointment data to related entities
      syncToRelatedEntities(newAppointment, editingAppointment.date);

      setEditingAppointment(null);
      setNewAppointment({ customerName: '', services: [], time: '8:00 AM', assignedCrew: 'Unassigned', address: '', notes: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setNewAppointment({
      customerName: appointment.customerName,
      services: appointment.services,
      time: appointment.time,
      assignedCrew: appointment.assignedCrew || 'Unassigned',
      address: appointment.address,
      notes: appointment.notes
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    const updatedAppointments = appointments.filter((apt) => apt.id !== appointment.id);
    setAppointments(updatedAppointments);

    // Save immediately and notify other components
    localStorage.setItem('kr-appointments', JSON.stringify(updatedAppointments));
    isSelfDispatching.current = true;
    window.dispatchEvent(new Event('kr-appointments-updated'));
    isSelfDispatching.current = false;

    const appointmentDateStr = format(new Date(appointment.date), 'yyyy-MM-dd');

    // Update related jobs status to cancelled
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      const jobs = JSON.parse(savedJobs);
      const updatedJobs = jobs.map((job: any) => {
        const jobDate = format(new Date(job.scheduledDate), 'yyyy-MM-dd');
        if (job.customerName === appointment.customerName && jobDate === appointmentDateStr) {
          return { ...job, status: 'cancelled' };
        }
        return job;
      });
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }

    // Update related quotes - clear time and crew
    const savedQuotes = localStorage.getItem('kr-quotes');
    if (savedQuotes) {
      const quotes = JSON.parse(savedQuotes);
      const updatedQuotes = quotes.map((quote: any) => {
        const quoteDate = format(new Date(quote.date), 'yyyy-MM-dd');
        if (quote.customerName === appointment.customerName && quoteDate === appointmentDateStr) {
          return { ...quote, time: undefined, assignedCrew: 'Unassigned' };
        }
        return quote;
      });
      localStorage.setItem('kr-quotes', JSON.stringify(updatedQuotes));
      window.dispatchEvent(new Event('kr-quotes-updated'));
    }

    // Update related invoices
    const savedInvoices = localStorage.getItem('kr-invoices');
    if (savedInvoices) {
      const invoices = JSON.parse(savedInvoices);
      const updatedInvoices = invoices.map((invoice: any) => {
        if (invoice.customerName === appointment.customerName) {
          return { ...invoice, status: 'pending' };
        }
        return invoice;
      });
      localStorage.setItem('kr-invoices', JSON.stringify(updatedInvoices));
      window.dispatchEvent(new Event('kr-invoices-updated'));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </CardTitle>
          <div className="flex gap-2">
            {/* Add Technician Dialog */}
            <Dialog open={isTechDialogOpen} onOpenChange={setIsTechDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="size-4 mr-2" />
                  Add Technician
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Technicians</DialogTitle>
                  <DialogDescription>
                    Add or remove technicians from the assignment list.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newTechName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTechName(e.target.value)}
                      placeholder="Technician name"
                      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAddTechnician(); }}
                    />
                    <Button onClick={handleAddTechnician} disabled={!newTechName.trim()}>
                      <Plus className="size-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {technicians.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Technicians</Label>
                      {technicians.map((tech: string) => (
                        <div key={tech} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
                          <div className="flex items-center gap-2">
                            <Users className="size-4 text-gray-500" />
                            <span className="text-sm">{tech}</span>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="size-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Technician?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove "{tech}" from the technician list? Existing appointments assigned to this technician will not be changed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTechnician(tech)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No technicians added yet</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* New Appointment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4 mr-2" />
                  New Appointment
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>
                  Add a new appointment to the calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Select
                    value={newAppointment.customerName}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, customerName: value })}
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
                          checked={newAppointment.services.includes(service)}
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
                  {newAppointment.services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {newAppointment.services.map(service => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={newAppointment.time.split(':')[0] || '8'}
                      onValueChange={(hour) => {
                        const [, , minute, period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '', '00', 'AM'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => {
                          const hour = i + 1;
                          return (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newAppointment.time.match(/:(\d+)/)?.[1] || '00'}
                      onValueChange={(minute) => {
                        const [, hour, , period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '8', '', 'AM'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newAppointment.time.match(/\s*(AM|PM)/i)?.[1] || 'AM'}
                      onValueChange={(period) => {
                        const [, hour, minute] = newAppointment.time.match(/(\d+):(\d+)/i) || ['', '8', '00'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="assignedCrew">Assign Technician</Label>
                  <Select
                    value={newAppointment.assignedCrew}
                    onValueChange={(value: string) => setNewAppointment({ ...newAppointment, assignedCrew: value })}
                  >
                    <SelectTrigger id="assignedCrew">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCrews.map((crew: string) => (
                        <SelectItem key={crew} value={crew}>
                          {crew}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newAppointment.address}
                    onChange={(e) => setNewAppointment({ ...newAppointment, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
                <Button onClick={handleAddAppointment} className="w-full">
                  Schedule Appointment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Appointment</DialogTitle>
                <DialogDescription>
                  Update the appointment details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-customerName">Customer Name</Label>
                  <Select
                    value={newAppointment.customerName}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, customerName: value })}
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
                          id={`edit-service-${service}`}
                          checked={newAppointment.services.includes(service)}
                          onCheckedChange={() => toggleService(service)}
                        />
                        <label
                          htmlFor={`edit-service-${service}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {service}
                        </label>
                      </div>
                    ))}
                  </div>
                  {newAppointment.services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {newAppointment.services.map(service => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-time">Time</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={newAppointment.time.split(':')[0] || '8'}
                      onValueChange={(hour) => {
                        const [, , minute, period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '', '00', 'AM'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => {
                          const hour = i + 1;
                          return (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newAppointment.time.match(/:(\d+)/)?.[1] || '00'}
                      onValueChange={(minute) => {
                        const [, hour, , period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '8', '', 'AM'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newAppointment.time.match(/\s*(AM|PM)/i)?.[1] || 'AM'}
                      onValueChange={(period) => {
                        const [, hour, minute] = newAppointment.time.match(/(\d+):(\d+)/i) || ['', '8', '00'];
                        setNewAppointment({ ...newAppointment, time: `${hour}:${minute} ${period}` });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-assignedCrew">Assign Technician</Label>
                  <Select
                    value={newAppointment.assignedCrew}
                    onValueChange={(value: string) => setNewAppointment({ ...newAppointment, assignedCrew: value })}
                  >
                    <SelectTrigger id="edit-assignedCrew">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCrews.map((crew: string) => (
                        <SelectItem key={crew} value={crew}>
                          {crew}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={newAppointment.address}
                    onChange={(e) => setNewAppointment({ ...newAppointment, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
                <Button onClick={handleEditAppointment} className="w-full">
                  Update Appointment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled for this date
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateAppointments.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{apt.customerName}</h4>
                          <Badge variant={apt.status === 'scheduled' ? 'default' : apt.status === 'completed' ? 'secondary' : 'destructive'}>
                            {apt.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{apt.services.join(', ')}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            {apt.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="size-4" />
                            Technician: {apt.assignedCrew || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="size-4" />
                            {apt.address}
                          </div>
                        </div>
                        {apt.notes && (
                          <p className="text-sm text-gray-500 mt-2">{apt.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleOpenEditDialog(apt)}>
                          <Edit className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the appointment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAppointment(apt)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Appointments - Ascending Order */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {allAppointmentsSorted.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled
            </div>
          ) : (
            <div className="space-y-4">
              {allAppointmentsSorted.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{apt.customerName}</h4>
                          <Badge variant={apt.status === 'scheduled' ? 'default' : apt.status === 'completed' ? 'secondary' : 'destructive'}>
                            {apt.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{apt.services.join(', ')}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="size-4" />
                            {format(new Date(apt.date), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            {apt.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="size-4" />
                            Technician: {apt.assignedCrew || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="size-4" />
                            {apt.address}
                          </div>
                        </div>
                        {apt.notes && (
                          <p className="text-sm text-gray-500 mt-2">{apt.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleOpenEditDialog(apt)}>
                          <Edit className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the appointment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAppointment(apt)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
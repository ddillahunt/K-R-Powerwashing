import { useState, useEffect } from 'react';
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
import { Clock, MapPin, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { Mail } from 'lucide-react';
import { SendScheduleDialog } from './send-schedule-dialog';
import { createCrewNotification } from './crew-notifications';

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  services: string[];
  date: string;
  time: string;
  address: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  assignedEmployee?: string;
}

interface Job {
  id: string;
  customerName: string;
  service: string;
  address: string;
  scheduledDate: string;
  assignedCrew: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'John Smith',
    services: ['House Exterior Wash'],
    date: new Date(2026, 1, 10).toISOString(),
    time: '9:00 AM',
    address: '123 Main St, Springfield, IL',
    status: 'scheduled',
    notes: 'Two-story home with vinyl siding',
    assignedEmployee: 'Kevin Rodriguez'
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Sarah Johnson',
    services: ['Driveway Cleaning'],
    date: new Date(2026, 1, 10).toISOString(),
    time: '2:00 PM',
    address: '456 Oak Ave, Springfield, IL',
    status: 'scheduled',
    notes: 'Concrete driveway with oil stains',
    assignedEmployee: 'Ryan Mitchell'
  }
];

type ViewMode = 'week' | 'month';

export function CalendarTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditJobDialogOpen, setIsEditJobDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCrewMember, setSelectedCrewMember] = useState<string | null>(null);
  const [emailSchedule, setEmailSchedule] = useState({
    crewMember: '',
    dateRange: 'week' as 'day' | 'week' | 'custom',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    recipientEmail: ''
  });
  const [newAppointment, setNewAppointment] = useState({
    customerName: '',
    services: [] as string[],
    time: '',
    address: '',
    notes: '',
    assignedEmployee: ''
  });
  const [editJobForm, setEditJobForm] = useState({
    customerName: '',
    service: '',
    address: '',
    scheduledDate: '',
    assignedCrew: '',
    status: 'scheduled' as Job['status'],
    notes: ''
  });

  const availableServices = [
    'House Exterior Wash',
    'Driveway Cleaning',
    'Deck/Patio Cleaning',
    'Roof Cleaning',
    'Gutter Cleaning',
    'Window Cleaning',
    'Fence Cleaning'
  ];

  const toggleService = (service: string) => {
    setNewAppointment(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  useEffect(() => {
    const savedAppointments = localStorage.getItem('kr-appointments');
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    } else {
      setAppointments(mockAppointments);
      localStorage.setItem('kr-appointments', JSON.stringify(mockAppointments));
    }
  }, []);

  useEffect(() => {
    const loadJobs = () => {
      const savedJobs = localStorage.getItem('kr-jobs');
      if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
      }
    };

    loadJobs();

    // Listen for job updates from other components
    const handleJobsUpdate = () => {
      loadJobs();
    };

    window.addEventListener('kr-jobs-updated', handleJobsUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'kr-jobs') {
        loadJobs();
      }
    });

    return () => {
      window.removeEventListener('kr-jobs-updated', handleJobsUpdate);
    };
  }, []);

  useEffect(() => {
    const savedCustomers = localStorage.getItem('kr-customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
    
    const handleCustomersUpdate = () => {
      const updatedCustomers = localStorage.getItem('kr-customers');
      if (updatedCustomers) {
        setCustomers(JSON.parse(updatedCustomers));
      }
    };
    
    window.addEventListener('kr-customers-updated', handleCustomersUpdate);
    return () => window.removeEventListener('kr-customers-updated', handleCustomersUpdate);
  }, []);

  useEffect(() => {
    const loadCrewMembers = () => {
      const savedCrewMembers = localStorage.getItem('kr-crew-members');
      if (savedCrewMembers) {
        setCrewMembers(JSON.parse(savedCrewMembers));
      } else {
        // Initialize with default crew members if none exist
        const defaultCrewMembers = [
          {
            id: '1',
            name: 'Kevin Rodriguez',
            phone: '(555) 123-4567',
            email: 'kevin@krpowerwashing.org',
            role: 'Lead Technician'
          },
          {
            id: '2',
            name: 'Ryan Mitchell',
            phone: '(555) 234-5678',
            email: 'ryan@krpowerwashing.org',
            role: 'Sr. Technician'
          },
          {
            id: '3',
            name: 'Marcus Thompson',
            phone: '(555) 345-6789',
            email: 'marcus@krpowerwashing.org',
            role: 'Technician'
          },
          {
            id: '4',
            name: 'Jake Wilson',
            phone: '(555) 456-7890',
            email: 'jake@krpowerwashing.org',
            role: 'Technician'
          },
          {
            id: '5',
            name: 'Tyler Anderson',
            phone: '(555) 567-8901',
            email: 'tyler@krpowerwashing.org',
            role: 'Apprentice'
          }
        ];
        setCrewMembers(defaultCrewMembers);
        localStorage.setItem('kr-crew-members', JSON.stringify(defaultCrewMembers));
      }
    };

    loadCrewMembers();
    
    const handleCrewMembersUpdate = () => {
      loadCrewMembers();
    };
    
    window.addEventListener('kr-crew-members-updated', handleCrewMembersUpdate);
    return () => window.removeEventListener('kr-crew-members-updated', handleCrewMembersUpdate);
  }, []);

  useEffect(() => {
    if (appointments.length > 0) {
      localStorage.setItem('kr-appointments', JSON.stringify(appointments));
      window.dispatchEvent(new Event('kr-appointments-updated'));
    }
  }, [appointments]);

  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthStart = startOfWeek(start, { weekStartsOn: 0 });
      const monthEnd = endOfWeek(end, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Filter appointments to only show those for active customers
    let dayAppointments = appointments.filter(apt => {
      // Extract date part only
      const aptDate = apt.date.split('T')[0];
      // Check if customer exists in active customers list
      const customerExists = customers.some(c => c.name === apt.customerName);
      return aptDate === dateStr && customerExists;
    });
    let dayJobs = jobs.filter(job => {
      // Extract date part only
      const jobDate = job.scheduledDate.split('T')[0];
      // Check if customer exists in active customers list
      const customerExists = customers.some(c => c.name === job.customerName);
      // Only show jobs that are not pending and not completed
      return jobDate === dateStr && job.status !== 'pending' && job.status !== 'completed' && customerExists;
    });
    
    // Apply crew member filter if one is selected
    if (selectedCrewMember) {
      dayAppointments = dayAppointments.filter(apt => apt.assignedEmployee === selectedCrewMember);
      dayJobs = dayJobs.filter(job => job.assignedCrew === selectedCrewMember);
    }
    
    return { appointments: dayAppointments, jobs: dayJobs };
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleAddAppointment = () => {
    if (selectedDate) {
      const appointment: Appointment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...newAppointment,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'scheduled'
      };
      setAppointments([...appointments, appointment]);
      setNewAppointment({ customerName: '', services: [], time: '', address: '', notes: '', assignedEmployee: '' });
      setIsDialogOpen(false);
      setSelectedDate(null);
      
      // Notify crew member of new assignment
      if (appointment.assignedEmployee) {
        createCrewNotification({
          crewMemberName: appointment.assignedEmployee,
          type: 'new_assignment',
          message: `New appointment assigned to you`,
          details: {
            customerName: appointment.customerName,
            date: appointment.date,
            time: appointment.time,
            address: appointment.address
          }
        });
      }
    }
  };

  const handleEditAppointment = () => {
    if (editingAppointment) {
      const oldEmployee = editingAppointment.assignedEmployee;
      const newEmployee = newAppointment.assignedEmployee;
      const oldDate = editingAppointment.date;
      const newDate = editingAppointment.date; // Date doesn't change in appointment edit
      const oldTime = editingAppointment.time;
      const newTime = newAppointment.time;
      
      const updatedAppointments = appointments.map((apt) =>
        apt.id === editingAppointment.id ? { ...apt, ...newAppointment } : apt
      );
      setAppointments(updatedAppointments);
      
      // Check for crew member change
      if (oldEmployee && newEmployee && oldEmployee !== newEmployee) {
        // Notify old crew member of removal
        createCrewNotification({
          crewMemberName: oldEmployee,
          type: 'assignment_removed',
          message: `Appointment reassigned to ${newEmployee}`,
          details: {
            customerName: editingAppointment.customerName,
            date: oldDate,
            time: oldTime,
            address: editingAppointment.address
          }
        });
        
        // Notify new crew member of assignment
        createCrewNotification({
          crewMemberName: newEmployee,
          type: 'new_assignment',
          message: `New appointment assigned to you`,
          details: {
            customerName: newAppointment.customerName,
            date: newDate,
            time: newTime,
            address: newAppointment.address
          }
        });
      }
      // Check for time change (same crew member)
      else if (oldEmployee && newEmployee === oldEmployee && oldTime !== newTime) {
        createCrewNotification({
          crewMemberName: newEmployee,
          type: 'time_changed',
          message: `Appointment time changed`,
          details: {
            customerName: newAppointment.customerName,
            date: newDate,
            address: newAppointment.address,
            oldTime,
            newTime
          }
        });
      }
      
      setEditingAppointment(null);
      setNewAppointment({ customerName: '', services: [], time: '', address: '', notes: '', assignedEmployee: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setNewAppointment({
      customerName: appointment.customerName,
      services: appointment.services,
      time: appointment.time,
      address: appointment.address,
      notes: appointment.notes,
      assignedEmployee: appointment.assignedEmployee || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    const updatedAppointments = appointments.filter((apt) => apt.id !== appointment.id);
    setAppointments(updatedAppointments);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleOpenEditJobDialog = (job: Job) => {
    setEditingJob(job);
    setEditJobForm({
      customerName: job.customerName,
      service: job.service,
      address: job.address,
      scheduledDate: format(new Date(job.scheduledDate), 'yyyy-MM-dd'),
      assignedCrew: job.assignedCrew,
      status: job.status,
      notes: (job as any).notes || ''
    });
    setIsEditJobDialogOpen(true);
  };

  const handleEditJob = () => {
    if (editingJob) {
      const oldCrew = editingJob.assignedCrew;
      const newCrew = editJobForm.assignedCrew;
      const oldDate = editingJob.scheduledDate.split('T')[0];
      const newDate = editJobForm.scheduledDate;
      
      // Create a date at noon local time to avoid timezone issues
      const [year, month, day] = editJobForm.scheduledDate.split('-').map(Number);
      const scheduledDate = new Date(year, month - 1, day, 12, 0, 0).toISOString();
      
      const updatedJobs = jobs.map((job) =>
        job.id === editingJob.id 
          ? { 
              ...job, 
              customerName: editJobForm.customerName,
              service: editJobForm.service,
              address: editJobForm.address,
              scheduledDate, // Use the properly constructed date
              assignedCrew: editJobForm.assignedCrew,
              status: editJobForm.status,
              notes: editJobForm.notes
            } 
          : job
      );
      setJobs(updatedJobs);
      localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
      window.dispatchEvent(new Event('kr-jobs-updated'));
      
      // Check for crew member change
      if (oldCrew && newCrew && oldCrew !== newCrew) {
        // Notify old crew member of removal
        createCrewNotification({
          crewMemberName: oldCrew,
          type: 'assignment_removed',
          message: `Job reassigned to ${newCrew}`,
          details: {
            customerName: editingJob.customerName,
            date: editingJob.scheduledDate,
            address: editingJob.address
          }
        });
        
        // Notify new crew member of assignment
        createCrewNotification({
          crewMemberName: newCrew,
          type: 'new_assignment',
          message: `New job assigned to you`,
          details: {
            customerName: editJobForm.customerName,
            date: scheduledDate,
            address: editJobForm.address
          }
        });
      }
      // Check for date change (same crew member)
      else if (oldCrew && newCrew === oldCrew && oldDate !== newDate) {
        createCrewNotification({
          crewMemberName: newCrew,
          type: 'date_changed',
          message: `Job date changed`,
          details: {
            customerName: editJobForm.customerName,
            address: editJobForm.address,
            oldDate: editingJob.scheduledDate,
            newDate: scheduledDate
          }
        });
      }
      
      setEditingJob(null);
      setIsEditJobDialogOpen(false);
    }
  };

  const handleDeleteJob = (job: Job) => {
    const updatedJobs = jobs.filter((j) => j.id !== job.id);
    setJobs(updatedJobs);
    localStorage.setItem('kr-jobs', JSON.stringify(updatedJobs));
    window.dispatchEvent(new Event('kr-jobs-updated'));
  };

  const days = getDateRange();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDates = viewMode === 'week' ? days : []; // Get actual week dates for the header

  return (
    <div className="space-y-4">
      {/* Calendar Header and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Month
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="min-w-[180px] text-center font-semibold">
                  {viewMode === 'week' && weekDates.length > 0 
                    ? format(weekDates[0], 'MMM d') + ' - ' + format(weekDates[6], 'MMM d, yyyy') 
                    : format(currentDate, 'MMMM yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            
            <SendScheduleDialog />
          </div>

          {/* Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Calendar Legend</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                <span className="text-xs text-gray-600">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200"></div>
                <span className="text-xs text-gray-600">Job - Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
                <span className="text-xs text-gray-600">Job - In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                <span className="text-xs text-gray-600">Job - Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-200 border border-red-300"></div>
                <span className="text-xs text-gray-600">Job - Cancelled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar and Crew Member Filter - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Crew Member Filter - Left Side */}
        <Card className="lg:h-fit">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="size-4" />
                Filter by Crew
              </h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant={selectedCrewMember === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCrewMember(null)}
                  className="w-full justify-between"
                >
                  <span>All Crew</span>
                  {selectedCrewMember === null && <Badge variant="secondary" className="bg-white text-gray-700">{jobs.filter(j => j.status !== 'pending' && j.status !== 'completed').length + appointments.length}</Badge>}
                </Button>
                {crewMembers.map((member) => {
                  // Count jobs and appointments for this crew member
                  const memberJobs = jobs.filter(job => 
                    job.assignedCrew === member.name && 
                    job.status !== 'pending' && 
                    job.status !== 'completed'
                  ).length;
                  const memberAppointments = appointments.filter(apt => 
                    apt.assignedEmployee === member.name
                  ).length;
                  const totalCount = memberJobs + memberAppointments;
                  
                  return (
                    <Button
                      key={member.id}
                      variant={selectedCrewMember === member.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCrewMember(member.name)}
                      className="w-full justify-between"
                    >
                      <span className="truncate">{member.name}</span>
                      {totalCount > 0 && (
                        <Badge 
                          variant="secondary" 
                          className={`ml-1 ${selectedCrewMember === member.name ? 'bg-white text-gray-700' : 'bg-gray-100'}`}
                        >
                          {totalCount}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
              {selectedCrewMember && (
                <p className="text-xs text-gray-600 italic pt-2 border-t">
                  Showing work for {selectedCrewMember}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid - Right Side */}
        <Card>
          <CardContent className="p-4">
            <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
              {/* Day Headers */}
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold text-sm p-2 border-b">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {days.map((day, idx) => {
                const { appointments: dayAppointments, jobs: dayJobs } = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      isToday ? 'bg-green-50 border-green-300' : ''
                    } ${!isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-green-700' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.map(apt => (
                        <div
                          key={apt.id}
                          className="text-xs p-1 rounded bg-blue-100 border border-blue-200 truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(apt);
                          }}
                        >
                          <div className="font-semibold truncate">{apt.time} - {apt.customerName}</div>
                          {apt.assignedEmployee && (
                            <div className="text-blue-700 truncate flex items-center gap-1">
                              <User className="size-3" />
                              {apt.assignedEmployee}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayJobs.map(job => (
                        <div
                          key={job.id}
                          className={`text-xs p-1 rounded truncate ${
                            job.status === 'scheduled' ? 'bg-purple-100 border border-purple-200' :
                            job.status === 'in-progress' ? 'bg-yellow-100 border border-yellow-200' :
                            job.status === 'completed' ? 'bg-green-100 border border-green-200' :
                            'bg-red-300 border border-red-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditJobDialog(job);
                          }}
                        >
                          <div className="font-semibold truncate">{job.customerName}</div>
                          {job.assignedCrew && (
                            <div className="truncate flex items-center gap-1">
                              <User className="size-3" />
                              {job.assignedCrew}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setSelectedDate(null);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              {selectedDate && `Add a new appointment for ${format(selectedDate, 'MMMM d, yyyy')}`}
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
                  value={newAppointment.time.split(':')[0] || '9'}
                  onValueChange={(hour) => {
                    const [, minute, period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '00', 'AM'];
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
                    const [, hour, , period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '9', '', 'AM'];
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
                    const [, hour, minute] = newAppointment.time.match(/(\d+):(\d+)/i) || ['', '9', '00'];
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
            <div>
              <Label htmlFor="assignedEmployee">Assigned Crew Member</Label>
              <Select
                value={newAppointment.assignedEmployee}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, assignedEmployee: value })}
              >
                <SelectTrigger id="assignedEmployee">
                  <SelectValue placeholder="Select a crew member" />
                </SelectTrigger>
                <SelectContent>
                  {crewMembers.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name} - {employee.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddAppointment} className="w-full">
              Schedule Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  value={newAppointment.time.split(':')[0] || '9'}
                  onValueChange={(hour) => {
                    const [, minute, period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '00', 'AM'];
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
                    const [, hour, , period] = newAppointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i) || ['', '9', '', 'AM'];
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
                    const [, hour, minute] = newAppointment.time.match(/(\d+):(\d+)/i) || ['', '9', '00'];
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
            <div>
              <Label htmlFor="edit-assignedEmployee">Assigned Crew Member</Label>
              <Select
                value={newAppointment.assignedEmployee}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, assignedEmployee: value })}
              >
                <SelectTrigger id="edit-assignedEmployee">
                  <SelectValue placeholder="Select a crew member" />
                </SelectTrigger>
                <SelectContent>
                  {crewMembers.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name} - {employee.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditAppointment} className="flex-1">
                Update Appointment
              </Button>
              {editingAppointment && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
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
                      <AlertDialogAction onClick={() => {
                        handleDeleteAppointment(editingAppointment);
                        setIsEditDialogOpen(false);
                      }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={isEditJobDialogOpen} onOpenChange={setIsEditJobDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Update the job details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-job-customerName">Customer Name</Label>
              <Select
                value={editJobForm.customerName}
                onValueChange={(value) => setEditJobForm({ ...editJobForm, customerName: value })}
              >
                <SelectTrigger id="edit-job-customerName">
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
              <Label htmlFor="edit-job-address">Address</Label>
              <Input
                id="edit-job-address"
                value={editJobForm.address}
                onChange={(e) => setEditJobForm({ ...editJobForm, address: e.target.value })}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div>
              <Label htmlFor="edit-job-scheduledDate">Scheduled Date</Label>
              <Input
                id="edit-job-scheduledDate"
                value={editJobForm.scheduledDate}
                onChange={(e) => setEditJobForm({ ...editJobForm, scheduledDate: e.target.value })}
                type="date"
              />
            </div>
            <div>
              <Label htmlFor="edit-job-assignedCrew">Assigned Crew</Label>
              <Select
                value={editJobForm.assignedCrew}
                onValueChange={(value) => setEditJobForm({ ...editJobForm, assignedCrew: value })}
              >
                <SelectTrigger id="edit-job-assignedCrew">
                  <SelectValue placeholder="Select a crew" />
                </SelectTrigger>
                <SelectContent>
                  {crewMembers.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name} - {employee.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-job-status">Status</Label>
              <Select
                value={editJobForm.status}
                onValueChange={(value) => setEditJobForm({ ...editJobForm, status: value })}
              >
                <SelectTrigger id="edit-job-status">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-job-notes">Notes</Label>
              <Textarea
                id="edit-job-notes"
                value={editJobForm.notes}
                onChange={(e) => setEditJobForm({ ...editJobForm, notes: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditJob} className="flex-1">
                Update Job
              </Button>
              {editingJob && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the job.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        handleDeleteJob(editingJob);
                        setIsEditJobDialogOpen(false);
                      }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
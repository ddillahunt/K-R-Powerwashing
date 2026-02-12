import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/app/components/ui/hover-card';
import { ChevronLeft, ChevronRight, User, MapPin, Calendar as CalendarIcon, Briefcase, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { SendScheduleDialog } from './send-schedule-dialog';

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
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledTime?: string;
  notes?: string;
  reminderSent?: boolean;
}

const formatTime12h = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

type ViewMode = 'week' | 'month';

export function CalendarTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);
  const [selectedCrewMember, setSelectedCrewMember] = useState<string | null>(null);

  useEffect(() => {
    const savedAppointments = localStorage.getItem('kr-appointments');
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
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
        const defaultCrewMembers = [
          { id: '1', name: 'Kevin Rodriguez', phone: '(555) 123-4567', email: 'kevin@krpowerwashing.org', role: 'Lead Technician' },
          { id: '2', name: 'Ryan Mitchell', phone: '(555) 234-5678', email: 'ryan@krpowerwashing.org', role: 'Sr. Technician' },
          { id: '3', name: 'Marcus Thompson', phone: '(555) 345-6789', email: 'marcus@krpowerwashing.org', role: 'Technician' },
          { id: '4', name: 'Jake Wilson', phone: '(555) 456-7890', email: 'jake@krpowerwashing.org', role: 'Technician' },
          { id: '5', name: 'Tyler Anderson', phone: '(555) 567-8901', email: 'tyler@krpowerwashing.org', role: 'Apprentice' }
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

  // Listen for appointment updates from other components
  useEffect(() => {
    const handleAppointmentsUpdate = () => {
      const saved = localStorage.getItem('kr-appointments');
      if (saved) setAppointments(JSON.parse(saved));
    };
    window.addEventListener('kr-appointments-updated', handleAppointmentsUpdate);
    return () => window.removeEventListener('kr-appointments-updated', handleAppointmentsUpdate);
  }, []);

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
    let dayAppointments = appointments.filter(apt => {
      const aptDate = apt.date.split('T')[0];
      const customerExists = customers.some(c => c.name === apt.customerName);
      return aptDate === dateStr && customerExists;
    });
    let dayJobs = jobs.filter(job => {
      const jobDate = job.scheduledDate.split('T')[0];
      const customerExists = customers.some(c => c.name === job.customerName);
      return jobDate === dateStr && customerExists;
    });

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

  const days = getDateRange();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDates = viewMode === 'week' ? days : [];

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
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
                <span className="text-xs text-gray-600">Job - Pending</span>
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
                  {selectedCrewMember === null && <Badge variant="secondary" className="bg-white text-gray-700">{jobs.length + appointments.length}</Badge>}
                </Button>
                {crewMembers.map((member) => {
                  const memberJobs = jobs.filter(job =>
                    job.assignedCrew === member.name
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
            <div className="grid grid-cols-7 gap-2">
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
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isToday ? 'bg-green-50 border-green-300' : ''
                    } ${!isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-green-700' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.map(apt => (
                        <HoverCard key={apt.id} openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div className="text-xs p-1 rounded bg-blue-100 border border-blue-200 truncate cursor-default">
                              <div className="font-semibold truncate">{apt.time} - {apt.customerName}</div>
                              {apt.assignedEmployee && (
                                <div className="text-blue-700 truncate flex items-center gap-1">
                                  <User className="size-3" />
                                  {apt.assignedEmployee}
                                </div>
                              )}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" align="start" className="w-72 p-0">
                            <div className="p-3 border-b bg-blue-50">
                              <div className="font-semibold text-sm">{apt.customerName}</div>
                              <div className="text-xs text-gray-500">Appointment</div>
                            </div>
                            <div className="p-3 space-y-2 text-xs">
                              <div className="flex items-start gap-2">
                                <Briefcase className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>{apt.services.join(', ')}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>{apt.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="size-3.5 text-gray-400 shrink-0" />
                                <span>{format(new Date(apt.date), 'MMM d, yyyy')} at {apt.time}</span>
                              </div>
                              {apt.assignedEmployee && (
                                <div className="flex items-center gap-2">
                                  <User className="size-3.5 text-gray-400 shrink-0" />
                                  <span>{apt.assignedEmployee}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Status:</span>
                                <Badge variant={apt.status === 'scheduled' ? 'outline' : apt.status === 'completed' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                                  {apt.status}
                                </Badge>
                              </div>
                              {apt.notes && (
                                <div className="flex items-start gap-2">
                                  <FileText className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">{apt.notes}</span>
                                </div>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                      {dayJobs.map(job => (
                        <HoverCard key={job.id} openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div className={`text-xs p-1 rounded truncate cursor-default ${
                              job.status === 'pending' ? 'bg-orange-100 border border-orange-200' :
                              job.status === 'scheduled' ? 'bg-purple-100 border border-purple-200' :
                              job.status === 'in-progress' ? 'bg-yellow-100 border border-yellow-200' :
                              job.status === 'completed' ? 'bg-green-100 border border-green-200' :
                              'bg-red-300 border border-red-400'
                            }`}>
                              <div className="font-semibold truncate">
                                {job.scheduledTime ? `${formatTime12h(job.scheduledTime)} - ` : ''}{job.customerName}
                              </div>
                              {job.assignedCrew && (
                                <div className="truncate flex items-center gap-1">
                                  <User className="size-3" />
                                  {job.assignedCrew}
                                </div>
                              )}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" align="start" className="w-72 p-0">
                            <div className={`p-3 border-b ${
                              job.status === 'pending' ? 'bg-orange-50' :
                              job.status === 'scheduled' ? 'bg-purple-50' :
                              job.status === 'in-progress' ? 'bg-yellow-50' :
                              job.status === 'completed' ? 'bg-green-50' :
                              'bg-red-50'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-semibold text-sm">{job.customerName}</div>
                                  <div className="text-xs text-gray-500">{job.id}</div>
                                </div>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 ${
                                    job.status === 'completed' ? 'bg-green-600 text-white' :
                                    job.status === 'cancelled' ? 'bg-red-700 text-white' : ''
                                  }`}
                                  variant={
                                    job.status === 'completed' || job.status === 'cancelled' ? 'default' :
                                    job.status === 'in-progress' ? 'secondary' :
                                    job.status === 'scheduled' ? 'outline' : 'destructive'
                                  }
                                >
                                  {job.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-xs">
                              <div className="flex items-start gap-2">
                                <Briefcase className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>{job.service}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>{job.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="size-3.5 text-gray-400 shrink-0" />
                                <span>{format(new Date(job.scheduledDate), 'MMM d, yyyy')}{job.scheduledTime ? ` at ${formatTime12h(job.scheduledTime)}` : ''}</span>
                              </div>
                              {job.assignedCrew && (
                                <div className="flex items-center gap-2">
                                  <User className="size-3.5 text-gray-400 shrink-0" />
                                  <span>{job.assignedCrew}</span>
                                </div>
                              )}
                              {job.notes && (
                                <div className="flex items-start gap-2">
                                  <FileText className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">{job.notes}</span>
                                </div>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

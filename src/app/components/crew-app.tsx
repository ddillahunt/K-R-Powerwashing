import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from './ui/label';
import { CrewAppNotifications } from './crew-app-notifications';
import { Calendar, Clock, MapPin, User, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import logoImage from '@/assets/51bd7988429b8271130dad268ae7b18b150f0caf.png';

interface CrewMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface Job {
  id: string;
  customerName: string;
  service: string;
  address: string;
  scheduledDate: string;
  assignedCrew: string;
  status: string;
  notes?: string;
}

interface Appointment {
  id: string;
  customerName: string;
  date: string;
  time: string;
  address: string;
  services: string[];
  assignedEmployee: string;
  status: string;
  notes: string;
}

export function CrewApp() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load crew members
  useEffect(() => {
    const saved = localStorage.getItem('kr-crew-members');
    if (saved) {
      const members: CrewMember[] = JSON.parse(saved);
      setCrewMembers(members);
      if (members.length > 0 && !selectedCrew) {
        setSelectedCrew(members[0].name);
      }
    }
  }, [selectedCrew]);

  // Load jobs and appointments
  useEffect(() => {
    const loadData = () => {
      const savedJobs = localStorage.getItem('kr-jobs');
      const savedAppointments = localStorage.getItem('kr-appointments');
      
      if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
      }
      
      if (savedAppointments) {
        setAppointments(JSON.parse(savedAppointments));
      }
      
      setLastUpdated(new Date());
    };

    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('kr-jobs-updated', handleUpdate);
    window.addEventListener('kr-appointments-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Poll for updates every 2 seconds for faster refresh
    const pollInterval = setInterval(loadData, 2000);

    return () => {
      window.removeEventListener('kr-jobs-updated', handleUpdate);
      window.removeEventListener('kr-appointments-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Get this week's schedule
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter jobs and appointments for selected crew member
  const myJobs = selectedCrew ? jobs.filter(job => 
    job.assignedCrew === selectedCrew &&
    job.status !== 'completed' &&
    job.status !== 'cancelled'
  ) : [];

  const myAppointments = selectedCrew ? appointments.filter(apt => 
    apt.assignedEmployee === selectedCrew &&
    apt.status === 'scheduled'
  ) : [];

  // Combine and organize by day
  const getScheduleForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayJobs = myJobs.filter(job => {
      const jobDate = format(parseISO(job.scheduledDate), 'yyyy-MM-dd');
      return jobDate === dayStr;
    });

    const dayAppointments = myAppointments.filter(apt => apt.date === dayStr);

    return { jobs: dayJobs, appointments: dayAppointments };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-purple-600">Scheduled</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-600">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!selectedCrew) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Welcome to K&R Crew App</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-600">
            <p>No crew members found. Please set up crew members in the admin app first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#2563eb] via-[#0891b2] to-[#2563eb] border-b sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={logoImage}
                alt="K&R POWERWASHING Logo"
                className="w-12 h-12 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-1"
              />
              <div>
                <h1 className="text-xl font-bold text-white">K&R Crew Schedule</h1>
                <p className="text-sm text-blue-100">My Weekly Schedule</p>
              </div>
            </div>
            <CrewAppNotifications crewMemberName={selectedCrew} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Crew Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <User className="size-5 text-gray-600" />
              <Label className="font-semibold">Select Crew Member:</Label>
              <Select value={selectedCrew} onValueChange={setSelectedCrew}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {crewMembers.map(member => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Week Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {weekDays.map(day => {
                const schedule = getScheduleForDay(day);
                const totalItems = schedule.jobs.length + schedule.appointments.length;
                const isToday = isSameDay(day, new Date());

                return (
                  <Card 
                    key={day.toISOString()} 
                    className={`${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-500">
                            {format(day, 'EEE')}
                          </p>
                          <p className="text-2xl font-bold">
                            {format(day, 'd')}
                          </p>
                        </div>
                        {totalItems > 0 && (
                          <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {totalItems === 0 ? (
                        <p className="text-sm text-gray-400 italic">No scheduled work</p>
                      ) : (
                        <>
                          {/* Jobs */}
                          {schedule.jobs.map(job => (
                            <Card key={job.id} className="bg-white border-l-4 border-l-purple-500">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="size-4 text-purple-600 flex-shrink-0" />
                                    <span className="font-semibold text-sm">{job.customerName}</span>
                                  </div>
                                  {getStatusBadge(job.status)}
                                </div>
                                <p className="text-xs text-gray-600">{job.service}</p>
                                <div className="flex items-start gap-2 text-xs text-gray-500">
                                  <MapPin className="size-3 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{job.address}</span>
                                </div>
                                {job.notes && (
                                  <p className="text-xs text-gray-500 italic border-t pt-2">
                                    {job.notes}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}

                          {/* Appointments */}
                          {schedule.appointments.map(apt => (
                            <Card key={apt.id} className="bg-white border-l-4 border-l-cyan-500">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="size-4 text-cyan-600 flex-shrink-0" />
                                    <span className="font-semibold text-sm">{apt.customerName}</span>
                                  </div>
                                  {getStatusBadge(apt.status)}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700">
                                  <Clock className="size-3" />
                                  <span>{apt.time}</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                  {apt.services.join(', ')}
                                </p>
                                <div className="flex items-start gap-2 text-xs text-gray-500">
                                  <MapPin className="size-3 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{apt.address}</span>
                                </div>
                                {apt.notes && (
                                  <p className="text-xs text-gray-500 italic border-t pt-2">
                                    {apt.notes}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Briefcase className="size-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-3xl font-bold">{myJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-100">
                  <Calendar className="size-6 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Appointments</p>
                  <p className="text-3xl font-bold">{myAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="size-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-3xl font-bold">
                    {weekDays.reduce((total, day) => {
                      const schedule = getScheduleForDay(day);
                      return total + schedule.jobs.length + schedule.appointments.length;
                    }, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
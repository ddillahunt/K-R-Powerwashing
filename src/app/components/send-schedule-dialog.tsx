import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Mail, Calendar, MapPin, User, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';

interface Appointment {
  id: string;
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
  notes?: string;
}

interface CrewMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function SendScheduleDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'custom'>('week');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const savedAppointments = localStorage.getItem('kr-appointments');
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    }

    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    }

    const savedCrewMembers = localStorage.getItem('kr-crew-members');
    if (savedCrewMembers) {
      setCrewMembers(JSON.parse(savedCrewMembers));
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-fill email when crew member is selected
    if (selectedCrew) {
      const crew = crewMembers.find(c => c.name === selectedCrew);
      if (crew && crew.email) {
        setRecipientEmail(crew.email);
      }
    }
  }, [selectedCrew, crewMembers]);

  useEffect(() => {
    // Update end date based on date range selection and start date
    if (dateRange === 'day') {
      setEndDate(startDate);
    } else if (dateRange === 'week') {
      const start = new Date(startDate);
      const weekEnd = endOfWeek(start, { weekStartsOn: 0 });
      const formattedEnd = format(weekEnd, 'yyyy-MM-dd');
      setEndDate(formattedEnd);
    }
  }, [dateRange, startDate]);

  const getFilteredSchedule = () => {
    if (!selectedCrew) return { appointments: [], jobs: [] };

    // Determine the date range to filter
    let filterStartDate = startDate;
    let filterEndDate = endDate;
    
    if (dateRange === 'week') {
      const weekStart = startOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      filterStartDate = format(weekStart, 'yyyy-MM-dd');
      filterEndDate = format(weekEnd, 'yyyy-MM-dd');
    }
    
    // Create array of all date strings in the range - parse as local time to avoid timezone shift
    const [startYear, startMonth, startDay] = filterStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = filterEndDate.split('-').map(Number);
    
    const datesInRange = eachDayOfInterval({
      start: new Date(startYear, startMonth - 1, startDay),
      end: new Date(endYear, endMonth - 1, endDay)
    });
    const dateStrings = datesInRange.map(d => format(d, 'yyyy-MM-dd'));
    
    const filteredAppointments = appointments.filter(apt => {
      if (apt.assignedEmployee !== selectedCrew) return false;
      if (apt.status !== 'scheduled') return false;
      
      const aptDateStr = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
      return dateStrings.includes(aptDateStr);
    });

    const filteredJobs = jobs.filter(job => {
      if (job.assignedCrew !== selectedCrew) return false;
      if (job.status === 'cancelled' || job.status === 'pending') return false;
      
      const jobDateStr = job.scheduledDate.includes('T') ? job.scheduledDate.split('T')[0] : job.scheduledDate;
      return dateStrings.includes(jobDateStr);
    });

    return { appointments: filteredAppointments, jobs: filteredJobs };
  };

  const generateEmailContent = () => {
    const { appointments: schedAppts, jobs: schedJobs } = getFilteredSchedule();
    
    // Use the actual filtered date range - parse as local time
    let filterStartDate = startDate;
    let filterEndDate = endDate;
    
    if (dateRange === 'week') {
      const weekStart = startOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      filterStartDate = format(weekStart, 'yyyy-MM-dd');
      filterEndDate = format(weekEnd, 'yyyy-MM-dd');
    }
    
    const [startYear, startMonth, startDay] = filterStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = filterEndDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    const dateRangeText = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
      ? format(start, 'MMMM d, yyyy')
      : `${format(start, 'MMMM d, yyyy')} - ${format(end, 'MMMM d, yyyy')}`;

    let emailBody = `Hello ${selectedCrew},\n\nHere is your schedule for ${dateRangeText}:\n\n`;

    // Group by date
    const allDates = eachDayOfInterval({ start, end });
    
    allDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAppts = schedAppts.filter(apt => {
        const aptDateStr = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
        return aptDateStr === dateStr;
      });
      const dayJobs = schedJobs.filter(job => {
        const jobDateStr = job.scheduledDate.includes('T') ? job.scheduledDate.split('T')[0] : job.scheduledDate;
        return jobDateStr === dateStr;
      });
      
      if (dayAppts.length > 0 || dayJobs.length > 0) {
        emailBody += `\n📅 ${format(date, 'EEEE, MMMM d, yyyy')}\n`;
        emailBody += '─'.repeat(50) + '\n';
        
        dayAppts.forEach(apt => {
          emailBody += `\n🕐 ${apt.time}\n`;
          emailBody += `   Customer: ${apt.customerName}\n`;
          emailBody += `   Services: ${apt.services.join(', ')}\n`;
          emailBody += `   Address: ${apt.address}\n`;
          if (apt.notes) {
            emailBody += `   Notes: ${apt.notes}\n`;
          }
        });

        dayJobs.forEach(job => {
          emailBody += `\n🔧 Job\n`;
          emailBody += `   Customer: ${job.customerName}\n`;
          emailBody += `   Service: ${job.service}\n`;
          emailBody += `   Address: ${job.address}\n`;
          emailBody += `   Status: ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}\n`;
          if (job.notes) {
            emailBody += `   Notes: ${job.notes}\n`;
          }
        });
      }
    });

    if (schedAppts.length === 0 && schedJobs.length === 0) {
      emailBody += '\nNo appointments or jobs scheduled for this period.\n';
    }

    emailBody += '\n\nThank you,\nK&R POWERWASHING Management';

    return emailBody;
  };

  const handleSendEmail = () => {
    const emailContent = generateEmailContent();
    
    // Use the same date range logic as filtering and content generation - parse as local time
    let filterStartDate = startDate;
    let filterEndDate = endDate;
    
    if (dateRange === 'week') {
      const weekStart = startOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
      filterStartDate = format(weekStart, 'yyyy-MM-dd');
      filterEndDate = format(weekEnd, 'yyyy-MM-dd');
    }
    
    const [startYear, startMonth, startDay] = filterStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = filterEndDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    const dateRangeText = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
      ? format(start, 'MMM d, yyyy')
      : `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    
    const subject = `Your K&R POWERWASHING Schedule - ${dateRangeText}`;
    
    // Create mailto link
    const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
    
    // Open default email client
    window.location.href = mailtoLink;
    
    // Close dialog after a short delay
    setTimeout(() => {
      setIsOpen(false);
    }, 500);
  };

  const { appointments: previewAppts, jobs: previewJobs } = getFilteredSchedule();
  const totalItems = previewAppts.length + previewJobs.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="size-4 mr-2" />
          Send Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Schedule via Email</DialogTitle>
          <DialogDescription>
            Send a crew member their upcoming schedule for a specific date range.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Crew Member Selection */}
          <div>
            <Label htmlFor="crew-member">Crew Member</Label>
            <Select value={selectedCrew} onValueChange={setSelectedCrew}>
              <SelectTrigger id="crew-member">
                <SelectValue placeholder="Select a crew member" />
              </SelectTrigger>
              <SelectContent>
                {crewMembers.map((crew) => (
                  <SelectItem key={crew.id} value={crew.name}>
                    {crew.name} - {crew.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Type */}
          <div>
            <Label htmlFor="date-range-type">Schedule Period</Label>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger id="date-range-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Single Day</SelectItem>
                <SelectItem value="week">Full Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Inputs */}
          {dateRange === 'day' && (
            <div>
              <Label htmlFor="single-date">Date</Label>
              <Input
                id="single-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          )}

          {dateRange === 'week' && (
            <div>
              <Label htmlFor="week-start">Select Any Date in the Week</Label>
              <Input
                id="week-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Full week schedule: {format(startOfWeek(new Date(startDate), { weekStartsOn: 0 }), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-start">Start Date</Label>
                <Input
                  id="custom-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="custom-end">End Date</Label>
                <Input
                  id="custom-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Recipient Email */}
          <div>
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="crew@example.com"
            />
          </div>

          {/* Preview Section */}
          {selectedCrew && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="size-4" />
                  Schedule Preview
                </h3>
                <Badge variant="secondary">{totalItems} {totalItems === 1 ? 'item' : 'items'}</Badge>
              </div>
              
              {totalItems > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(() => {
                    // Use the same date range logic as filtering - parse as local time
                    let filterStartDate = startDate;
                    let filterEndDate = endDate;
                    
                    if (dateRange === 'week') {
                      const weekStart = startOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
                      const weekEnd = endOfWeek(new Date(startDate + 'T00:00:00'), { weekStartsOn: 0 });
                      filterStartDate = format(weekStart, 'yyyy-MM-dd');
                      filterEndDate = format(weekEnd, 'yyyy-MM-dd');
                    }
                    
                    const [startYear, startMonth, startDay] = filterStartDate.split('-').map(Number);
                    const [endYear, endMonth, endDay] = filterEndDate.split('-').map(Number);
                    
                    const previewStart = new Date(startYear, startMonth - 1, startDay);
                    const previewEnd = new Date(endYear, endMonth - 1, endDay);
                    
                    return eachDayOfInterval({ start: previewStart, end: previewEnd }).map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayAppts = previewAppts.filter(apt => {
                        const aptDateStr = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
                        return aptDateStr === dateStr;
                      });
                      const dayJobs = previewJobs.filter(job => {
                        const jobDateStr = job.scheduledDate.includes('T') ? job.scheduledDate.split('T')[0] : job.scheduledDate;
                        return jobDateStr === dateStr;
                      });
                      
                      if (dayAppts.length === 0 && dayJobs.length === 0) return null;
                      
                      return (
                        <div key={dateStr} className="space-y-2">
                          <div className="font-semibold text-sm text-gray-700 border-b pb-1">
                            {format(date, 'EEEE, MMMM d, yyyy')}
                          </div>
                          {dayAppts.map(apt => (
                            <Card key={apt.id} className="bg-white">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  <Clock className="size-4 mt-0.5 text-blue-600" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm">{apt.time} - {apt.customerName}</div>
                                    <div className="text-xs text-gray-600">{apt.services.join(', ')}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <MapPin className="size-3" />
                                      {apt.address}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {dayJobs.map(job => (
                            <Card key={job.id} className="bg-white">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  <User className="size-4 mt-0.5 text-purple-600" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm">{job.customerName}</div>
                                    <div className="text-xs text-gray-600">{job.service}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <MapPin className="size-3" />
                                      {job.address}
                                    </div>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {job.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No appointments or jobs scheduled for {selectedCrew} during this period.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSendEmail}
              className="flex-1"
              disabled={!selectedCrew || !recipientEmail || totalItems === 0}
            >
              <Mail className="size-4 mr-2" />
              Send Email
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const content = generateEmailContent();
                navigator.clipboard.writeText(content);
                alert('Schedule copied to clipboard!');
              }}
              disabled={!selectedCrew || totalItems === 0}
            >
              Copy to Clipboard
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-900 mb-1">📧 How It Works</p>
            <p className="text-blue-700">
              Clicking "Send Email" will open your default email program (Outlook, Gmail, etc.) with the schedule pre-filled. 
              You can review and edit before sending, or use "Copy to Clipboard" to paste it elsewhere.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
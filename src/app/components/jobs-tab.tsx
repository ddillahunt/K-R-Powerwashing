import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Calendar, Clock, Upload, Image as ImageIcon, Trash2, X, FileText, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

interface JobPhoto {
  id: string;
  url: string;
  type: 'before' | 'after';
  uploadedAt: Date;
}

interface Job {
  id: string;
  quoteId?: string;
  customerName: string;
  service: string;
  address: string;
  scheduledDate: string; // Changed to string for localStorage
  scheduledTime?: string; // Time from calendar appointment (e.g., "9:00 AM")
  assignedCrew: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  photos: JobPhoto[];
  notes: string;
}

const mockJobs: Job[] = [
  {
    id: 'J-001',
    customerName: 'John Smith',
    service: 'House Exterior Wash',
    address: '123 Main St, Springfield, IL',
    scheduledDate: new Date(2026, 0, 31).toISOString(),
    scheduledTime: '9:00 AM',
    assignedCrew: 'Team A',
    status: 'scheduled',
    photos: [],
    notes: 'Two-story home with vinyl siding'
  },
  {
    id: 'J-002',
    customerName: 'Sarah Johnson',
    service: 'Driveway Cleaning',
    address: '456 Oak Ave, Springfield, IL',
    scheduledDate: new Date(2026, 0, 30).toISOString(),
    scheduledTime: '2:00 PM',
    assignedCrew: 'Team B',
    status: 'in-progress',
    photos: [],
    notes: 'Concrete driveway with oil stains'
  },
  {
    id: 'J-003',
    customerName: 'Michael Brown',
    service: 'Deck/Patio Cleaning',
    address: '789 Elm St, Springfield, IL',
    scheduledDate: new Date(2026, 0, 28).toISOString(),
    scheduledTime: '10:30 AM',
    assignedCrew: 'Team A',
    status: 'completed',
    photos: [],
    notes: 'Wood deck restoration'
  }
];

export function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed'>('all');
  const [isInitialized, setIsInitialized] = useState(false);

  // Function to load jobs from localStorage
  const loadJobs = () => {
    const savedJobs = localStorage.getItem('kr-jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      // Initialize with mock data if no saved data exists
      setJobs(mockJobs);
      localStorage.setItem('kr-jobs', JSON.stringify(mockJobs));
    }
    setIsInitialized(true);
  };

  // Load jobs from localStorage on component mount
  useEffect(() => {
    loadJobs();

    // Listen for storage changes from other components (like QuotesTab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kr-jobs') {
        loadJobs();
      }
    };

    // Listen for custom event when jobs are updated
    const handleJobsUpdate = () => {
      loadJobs();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('kr-jobs-updated', handleJobsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kr-jobs-updated', handleJobsUpdate);
    };
  }, []);

  // Load appointments from localStorage to get scheduled times
  useEffect(() => {
    const loadAppointments = () => {
      const savedAppointments = localStorage.getItem('kr-appointments');
      if (savedAppointments) {
        setAppointments(JSON.parse(savedAppointments));
      }
    };
    loadAppointments();

    // Listen for appointment updates from storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kr-appointments') {
        loadAppointments();
      }
    };

    // Listen for appointment updates from custom events (same-tab)
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

  // Load quotes from localStorage to get quote notes
  useEffect(() => {
    const loadQuotes = () => {
      const savedQuotes = localStorage.getItem('kr-quotes');
      if (savedQuotes) {
        setQuotes(JSON.parse(savedQuotes));
      }
    };
    loadQuotes();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kr-quotes') {
        loadQuotes();
      }
    };

    const handleQuotesUpdate = () => {
      loadQuotes();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('kr-quotes-updated', handleQuotesUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kr-quotes-updated', handleQuotesUpdate);
    };
  }, []);

  // Helper function to get time from matching calendar appointment
  const getJobTime = (job: Job): string | undefined => {
    if (job.scheduledTime) return job.scheduledTime;
    // Look for matching appointment by customer name and date
    const jobDate = format(new Date(job.scheduledDate), 'yyyy-MM-dd');
    const matchingAppointment = appointments.find(apt =>
      apt.customerName === job.customerName &&
      format(new Date(apt.date), 'yyyy-MM-dd') === jobDate
    );
    return matchingAppointment?.time;
  };

  // Helper function to get appointment notes
  const getAppointmentNotes = (job: Job): string | undefined => {
    const jobDate = format(new Date(job.scheduledDate), 'yyyy-MM-dd');
    const matchingAppointment = appointments.find(apt =>
      apt.customerName === job.customerName &&
      format(new Date(apt.date), 'yyyy-MM-dd') === jobDate
    );
    return matchingAppointment?.notes;
  };

  // Helper function to get quote notes
  const getQuoteNotes = (job: Job): string | undefined => {
    // Match by quoteId if available, otherwise match by customer name
    if (job.quoteId) {
      const matchingQuote = quotes.find(q => q.id === job.quoteId);
      return matchingQuote?.notes;
    }
    // Fallback: match by customer name
    const matchingQuote = quotes.find(q => q.customerName === job.customerName);
    return matchingQuote?.notes;
  };

  // Save jobs to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('kr-jobs', JSON.stringify(jobs));
      // Don't dispatch the event here - it causes infinite loops
      // Only external components (QuotesTab) should dispatch this event
    }
  }, [jobs, isInitialized]);

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(job => job.status === filter);

  const handleStatusChange = (jobId: string, newStatus: Job['status']) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!selectedJob || !e.target.files?.[0]) return;
    
    // In a real app, this would upload to a server
    const newPhoto: JobPhoto = {
      id: Math.random().toString(),
      url: URL.createObjectURL(e.target.files[0]),
      type,
      uploadedAt: new Date()
    };

    setJobs(jobs.map(j =>
      j.id === selectedJob.id
        ? { ...j, photos: [...j.photos, newPhoto] }
        : j
    ));
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!selectedJob) return;

    // Update the jobs state to remove the photo
    const updatedJobs = jobs.map(j =>
      j.id === selectedJob.id
        ? { ...j, photos: j.photos.filter(p => p.id !== photoId) }
        : j
    );
    setJobs(updatedJobs);

    // Also update the selectedJob to reflect the change in the dialog
    setSelectedJob({
      ...selectedJob,
      photos: selectedJob.photos.filter(p => p.id !== photoId)
    });
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs(jobs.filter(j => j.id !== jobId));
    
    // Track deleted jobs so QuotesTab doesn't recreate them
    const deletedJobs = localStorage.getItem('kr-deleted-jobs');
    const deletedJobsList = deletedJobs ? JSON.parse(deletedJobs) : [];
    
    // Find the job being deleted to get its quoteId
    const jobToDelete = jobs.find(j => j.id === jobId);
    if (jobToDelete && jobToDelete.quoteId) {
      // Store the quoteId to prevent recreation
      deletedJobsList.push(jobToDelete.quoteId);
      localStorage.setItem('kr-deleted-jobs', JSON.stringify(deletedJobsList));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full max-w-md">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{job.customerName}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{job.id}</p>
                </div>
                <Badge
                  variant={
                    job.status === 'completed'
                      ? 'default'
                      : job.status === 'in-progress'
                      ? 'secondary'
                      : job.status === 'scheduled'
                      ? 'outline'
                      : 'destructive'
                  }
                >
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{job.service}</p>
                <p className="text-sm text-gray-500 mt-1">{job.address}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="size-4" />
                {format(new Date(job.scheduledDate), 'MMM d, yyyy')}
                {getJobTime(job) && (
                  <>
                    <Clock className="size-4 ml-2" />
                    {getJobTime(job)}
                  </>
                )}
              </div>

              <div className="text-sm">
                <span className="text-gray-500">Technician: </span>
                <span className="font-medium">{job.assignedCrew}</span>
              </div>

              {/* Notes Section */}
              {(getAppointmentNotes(job) || getQuoteNotes(job) || job.notes) && (
                <div className="space-y-2 border-t pt-3">
                  {getAppointmentNotes(job) && (
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="size-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-500 font-medium">Appointment: </span>
                        <span className="text-gray-700">{getAppointmentNotes(job)}</span>
                      </div>
                    </div>
                  )}
                  {getQuoteNotes(job) && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="size-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-500 font-medium">Quote: </span>
                        <span className="text-gray-700">{getQuoteNotes(job)}</span>
                      </div>
                    </div>
                  )}
                  {job.notes && !getAppointmentNotes(job) && !getQuoteNotes(job) && (
                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="size-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-500 font-medium">Notes: </span>
                        <span className="text-gray-700">{job.notes}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Photo Preview Section */}
              {job.photos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Photos ({job.photos.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Before Photos */}
                    {job.photos.filter(p => p.type === 'before').length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-400 uppercase">Before</span>
                        <div className="flex gap-1">
                          {job.photos
                            .filter(p => p.type === 'before')
                            .slice(0, 2)
                            .map(photo => (
                              <div key={photo.id} className="relative size-12 rounded overflow-hidden">
                                <ImageWithFallback
                                  src={photo.url}
                                  alt="Before"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          {job.photos.filter(p => p.type === 'before').length > 2 && (
                            <div className="size-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              +{job.photos.filter(p => p.type === 'before').length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* After Photos */}
                    {job.photos.filter(p => p.type === 'after').length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-400 uppercase">After</span>
                        <div className="flex gap-1">
                          {job.photos
                            .filter(p => p.type === 'after')
                            .slice(0, 2)
                            .map(photo => (
                              <div key={photo.id} className="relative size-12 rounded overflow-hidden">
                                <ImageWithFallback
                                  src={photo.url}
                                  alt="After"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          {job.photos.filter(p => p.type === 'after').length > 2 && (
                            <div className="size-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              +{job.photos.filter(p => p.type === 'after').length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedJob(job);
                    setIsPhotoDialogOpen(true);
                  }}
                >
                  <ImageIcon className="size-4 mr-2" />
                  Photos ({job.photos.length})
                </Button>
                <Select
                  value={job.status}
                  onValueChange={(value: Job['status']) => handleStatusChange(job.id, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete job"
                      onClick={() => setSelectedJob(job)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete job {job.id} for {job.customerName}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteJob(job.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Job Photos - {selectedJob?.customerName} ({selectedJob?.id})
            </DialogTitle>
            <DialogDescription>
              Upload before and after photos for the job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Before Photos</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="before-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'before')}
                  />
                  <label htmlFor="before-upload" className="cursor-pointer">
                    <Upload className="size-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload</p>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedJob?.photos
                    .filter(p => p.type === 'before')
                    .map(photo => (
                      <div key={photo.id} className="relative aspect-square group">
                        <ImageWithFallback
                          src={photo.url}
                          alt="Before"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete photo"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>After Photos</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="after-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'after')}
                  />
                  <label htmlFor="after-upload" className="cursor-pointer">
                    <Upload className="size-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload</p>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedJob?.photos
                    .filter(p => p.type === 'after')
                    .map(photo => (
                      <div key={photo.id} className="relative aspect-square group">
                        <ImageWithFallback
                          src={photo.url}
                          alt="After"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete photo"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
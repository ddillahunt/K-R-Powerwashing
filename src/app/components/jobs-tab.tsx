import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Calendar, Upload, Image as ImageIcon, Trash2, Edit, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  customerEmail?: string;
  service: string;
  address: string;
  scheduledDate: string; // Changed to string for localStorage
  assignedCrew: string;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  photos: JobPhoto[];
  notes: string;
  reminderSent?: boolean;
  completedDate?: string;
  yearlyReminderSent?: boolean;
}

const mockJobs: Job[] = [
  {
    id: 'J-001',
    customerName: 'John Smith',
    service: 'House Exterior Wash',
    address: '123 Main St, Springfield, IL',
    scheduledDate: new Date(2026, 0, 31).toISOString(),
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
    assignedCrew: 'Team A',
    status: 'cancelled',
    photos: [],
    notes: 'Wood deck restoration',
    completedDate: new Date(2025, 1, 15).toISOString(), // Completed Feb 15, 2025 (almost 1 year ago)
    reminderSent: true
  }
];

export function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);
  
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

    // Listen for storage changes from other tabs/windows only (not same component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kr-jobs') {
        loadJobs();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save jobs to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('kr-jobs', JSON.stringify(jobs));
      // Dispatch event to notify other components (including crew app)
      window.dispatchEvent(new Event('kr-jobs-updated'));
    }
  }, [jobs, isInitialized]);

  // Load customers
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

  // Load crew members
  useEffect(() => {
    const loadCrewMembers = () => {
      const savedCrewMembers = localStorage.getItem('kr-crew-members');
      if (savedCrewMembers) {
        setCrewMembers(JSON.parse(savedCrewMembers));
      }
    };

    loadCrewMembers();
    
    const handleCrewMembersUpdate = () => {
      loadCrewMembers();
    };
    
    window.addEventListener('kr-crew-members-updated', handleCrewMembersUpdate);
    return () => window.removeEventListener('kr-crew-members-updated', handleCrewMembersUpdate);
  }, []);

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

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setEditingJob(job);
    setEditJobForm({
      customerName: job.customerName,
      service: job.service,
      address: job.address,
      scheduledDate: format(new Date(job.scheduledDate), 'yyyy-MM-dd'), // Use format to ensure proper date
      assignedCrew: job.assignedCrew,
      status: job.status,
      notes: job.notes
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditJob = () => {
    if (!editingJob) return;
    
    // Create a date at noon local time to avoid timezone issues
    const [year, month, day] = editJobForm.scheduledDate.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day, 12, 0, 0).toISOString();
    
    const updatedJob: Job = {
      ...editingJob,
      customerName: editJobForm.customerName,
      service: editJobForm.service,
      address: editJobForm.address,
      scheduledDate, // Use the properly constructed date
      assignedCrew: editJobForm.assignedCrew,
      status: editJobForm.status,
      notes: editJobForm.notes
    };

    setJobs(jobs.map(j => j.id === editingJob.id ? updatedJob : j));
    setIsEditDialogOpen(false);
  };

  const handleSendReminder = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      // Simulate sending a reminder
      toast.success(`Reminder sent to ${job.customerName}`);
      setJobs(jobs.map(j => j.id === jobId ? { ...j, reminderSent: true } : j));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full max-w-2xl">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
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
                  className={
                    job.status === 'completed'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : job.status === 'cancelled'
                      ? 'bg-red-700 hover:bg-red-800 text-white'
                      : ''
                  }
                  variant={
                    job.status === 'completed' || job.status === 'cancelled'
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
              </div>

              <div className="text-sm">
                <span className="text-gray-500">Crew: </span>
                <span className="font-medium">{job.assignedCrew}</span>
              </div>

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
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditJob(job)}
                >
                  <Edit className="size-4 mr-2" />
                  Edit
                </Button>
                {job.status === 'scheduled' && !job.reminderSent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSendReminder(job.id)}
                  >
                    <Bell className="size-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
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
                      <div key={photo.id} className="relative aspect-square">
                        <ImageWithFallback
                          src={photo.url}
                          alt="Before"
                          className="w-full h-full object-cover rounded-lg"
                        />
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
                      <div key={photo.id} className="relative aspect-square">
                        <ImageWithFallback
                          src={photo.url}
                          alt="After"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Edit Job - {editingJob?.customerName} ({editingJob?.id})
            </DialogTitle>
            <DialogDescription>
              Update the details of the job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={editJobForm.customerName}
                  onChange={(e) => setEditJobForm({ ...editJobForm, customerName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editJobForm.address}
                  onChange={(e) => setEditJobForm({ ...editJobForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={editJobForm.scheduledDate}
                  onChange={(e) => setEditJobForm({ ...editJobForm, scheduledDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned Crew</Label>
                <Select
                  value={editJobForm.assignedCrew}
                  onValueChange={(value) => setEditJobForm({ ...editJobForm, assignedCrew: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {crewMembers.map(member => (
                      <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editJobForm.status}
                  onValueChange={(value) => setEditJobForm({ ...editJobForm, status: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
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

              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={editJobForm.notes}
                  onChange={(e) => setEditJobForm({ ...editJobForm, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleSaveEditJob}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
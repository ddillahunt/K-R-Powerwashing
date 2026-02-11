import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, Mail, Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface CrewMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

const crewRoles = [
  'Lead Technician',
  'Sr. Technician',
  'Technician',
  'Apprentice',
  'Helper',
  'Equipment Operator',
  'Foreman'
];

const defaultCrewMembers: CrewMember[] = [
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

export function CrewManagementDialog() {
  const [open, setOpen] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchivedDialogOpen, setIsArchivedDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [archivedCrewMembers, setArchivedCrewMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    email: '',
    role: ''
  });

  // Load crew members from localStorage
  useEffect(() => {
    if (open) {
      const savedCrewMembers = localStorage.getItem('kr-crew-members');
      if (savedCrewMembers) {
        setCrewMembers(JSON.parse(savedCrewMembers));
      } else {
        // Initialize with default crew members
        setCrewMembers(defaultCrewMembers);
        localStorage.setItem('kr-crew-members', JSON.stringify(defaultCrewMembers));
      }

      // Load archived crew members
      const savedArchivedCrewMembers = localStorage.getItem('kr-archived-crew-members');
      if (savedArchivedCrewMembers) {
        setArchivedCrewMembers(JSON.parse(savedArchivedCrewMembers));
      }
    }
  }, [open]);

  // Save crew members to localStorage whenever they change
  useEffect(() => {
    if (crewMembers.length > 0) {
      localStorage.setItem('kr-crew-members', JSON.stringify(crewMembers));
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('kr-crew-members-updated'));
    }
  }, [crewMembers]);

  const handleAddMember = () => {
    const member: CrewMember = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...newMember
    };
    setCrewMembers([...crewMembers, member]);
    setNewMember({ name: '', phone: '', email: '', role: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditMember = () => {
    if (editingMember) {
      const updatedMembers = crewMembers.map(member =>
        member.id === editingMember.id ? { ...member, ...newMember } : member
      );
      setCrewMembers(updatedMembers);
      setEditingMember(null);
      setNewMember({ name: '', phone: '', email: '', role: '' });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (member: CrewMember) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      phone: member.phone,
      email: member.email,
      role: member.role
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteMember = (memberId: string) => {
    setCrewMembers(crewMembers.filter(member => member.id !== memberId));
  };

  const handleArchiveMember = (member: CrewMember) => {
    // Add timestamp to archived member
    const archivedMember = {
      ...member,
      archivedDate: new Date().toISOString()
    };
    
    // Add to archived crew members
    const updatedArchivedMembers = [...archivedCrewMembers, archivedMember];
    setArchivedCrewMembers(updatedArchivedMembers);
    localStorage.setItem('kr-archived-crew-members', JSON.stringify(updatedArchivedMembers));
    
    // Remove from active crew members
    const updatedMembers = crewMembers.filter(m => m.id !== member.id);
    setCrewMembers(updatedMembers);
  };

  const handleRestoreMember = (archivedMember: any) => {
    // Remove archivedDate field before restoring
    const { archivedDate, ...memberData } = archivedMember;
    
    // Add back to active crew members
    const updatedMembers = [...crewMembers, memberData as CrewMember];
    setCrewMembers(updatedMembers);
    
    // Remove from archived crew members
    const updatedArchivedMembers = archivedCrewMembers.filter(m => m.id !== archivedMember.id);
    setArchivedCrewMembers(updatedArchivedMembers);
    localStorage.setItem('kr-archived-crew-members', JSON.stringify(updatedArchivedMembers));
  };

  const handlePermanentDelete = (archivedMember: any) => {
    // Permanently remove from archived crew members
    const updatedArchivedMembers = archivedCrewMembers.filter(m => m.id !== archivedMember.id);
    setArchivedCrewMembers(updatedArchivedMembers);
    localStorage.setItem('kr-archived-crew-members', JSON.stringify(updatedArchivedMembers));
  };

  const handleSendDailySchedule = (member: CrewMember) => {
    // Get today's date in yyyy-MM-dd format
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Load jobs from localStorage
    const savedJobs = localStorage.getItem('kr-jobs');
    const allJobs = savedJobs ? JSON.parse(savedJobs) : [];
    
    // Filter jobs for this crew member for today
    const todaysJobs = allJobs.filter((job: any) => {
      const jobDate = job.scheduledDate.split('T')[0];
      return jobDate === today && job.assignedCrew === member.name;
    });
    
    // Compose email
    const subject = `K&R POWERWASHING - Your Schedule for ${format(new Date(), 'MMMM d, yyyy')}`;
    
    let body = `Hello ${member.name},\n\n`;
    body += `Here is your work schedule for today, ${format(new Date(), 'MMMM d, yyyy')}:\n\n`;
    
    if (todaysJobs.length === 0) {
      body += `You have no jobs scheduled for today.\n\n`;
    } else {
      body += `You have ${todaysJobs.length} job(s) scheduled:\n\n`;
      
      todaysJobs.forEach((job: any, index: number) => {
        body += `Job ${index + 1}:\n`;
        body += `  Customer: ${job.customerName}\n`;
        body += `  Service: ${job.service}\n`;
        body += `  Address: ${job.address}\n`;
        body += `  Status: ${job.status}\n`;
        if (job.notes) {
          body += `  Notes: ${job.notes}\n`;
        }
        body += `\n`;
      });
    }
    
    body += `If you have any questions, please contact the office.\n\n`;
    body += `Thank you,\nK&R POWERWASHING`;
    
    // Create mailto link
    const mailtoLink = `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open email client
    window.location.href = mailtoLink;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white hover:bg-gray-50"
        >
          <Users className="size-4 mr-2" />
          Crew
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col resize overflow-auto" style={{ minWidth: '800px', minHeight: '600px' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Crew Management</DialogTitle>
          <DialogDescription>
            Manage your crew members and their roles. Drag the corner to resize this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {/* Summary Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-900">
                    {crewMembers.length}
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Total Crew Members</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isArchivedDialogOpen} onOpenChange={setIsArchivedDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white border-gray-600 text-gray-600 hover:bg-gray-50">
                        <Archive className="size-4 mr-2" />
                        View Archived ({archivedCrewMembers.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Archived Crew Members</DialogTitle>
                        <DialogDescription>
                          View and manage archived crew members. You can restore members to the active list or permanently delete them.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        {archivedCrewMembers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No archived crew members found.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Archived Date</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {archivedCrewMembers.map((archivedMember: any) => (
                                <TableRow key={archivedMember.id}>
                                  <TableCell className="font-medium">{archivedMember.name}</TableCell>
                                  <TableCell>{archivedMember.phone}</TableCell>
                                  <TableCell>{archivedMember.email}</TableCell>
                                  <TableCell>{archivedMember.role}</TableCell>
                                  <TableCell className="text-sm">
                                    {new Date(archivedMember.archivedDate).toLocaleDateString('en-US', {
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
                                        onClick={() => handleRestoreMember(archivedMember)}
                                        title="Restore member to active list"
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
                                            title="Permanently delete member"
                                            className="border-red-600 text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="size-4 mr-1" />
                                            Delete
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Permanently Delete Crew Member?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will permanently delete {archivedMember.name} from the archive. This action cannot be undone and all data will be lost.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handlePermanentDelete(archivedMember)} className="bg-red-600 hover:bg-red-700">
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
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                        <Plus className="size-4 mr-2" />
                        Add Crew Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Crew Member</DialogTitle>
                        <DialogDescription>
                          Add a new employee to your crew.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={newMember.name}
                            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={newMember.phone}
                            onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newMember.email}
                            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                            placeholder="john@krpowerwashing.org"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select
                            id="role"
                            value={newMember.role}
                            onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Technician">{newMember.role}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {crewRoles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAddMember} className="w-full">
                          Add Crew Member
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crew Members Table */}
          <Card>
            <CardContent className="pt-6">
              {crewMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(member)}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Archive crew member">
                                  <Trash2 className="size-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive Crew Member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will archive {member.name}'s information. The crew member data will be saved and can be retrieved later if needed. They will be removed from the active crew list.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleArchiveMember(member)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Archive Crew Member
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendDailySchedule(member)}
                            >
                              <Mail className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">No crew members found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Crew Member</DialogTitle>
              <DialogDescription>
                Update crew member information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="john@krpowerwashing.org"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  id="edit-role"
                  value={newMember.role}
                  onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Technician">{newMember.role}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {crewRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditMember} className="w-full">
                Update Crew Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
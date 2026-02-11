import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Bell, X, Calendar, User, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface CrewNotification {
  id: string;
  crewMemberName: string;
  type: 'schedule_changed' | 'new_assignment' | 'assignment_removed' | 'date_changed' | 'time_changed';
  message: string;
  details: {
    customerName?: string;
    date?: string;
    time?: string;
    address?: string;
    oldDate?: string;
    newDate?: string;
    oldTime?: string;
    newTime?: string;
  };
  timestamp: string;
  read: boolean;
}

// Helper function to create notifications
export function createCrewNotification(notification: Omit<CrewNotification, 'id' | 'timestamp' | 'read'>) {
  const newNotification: CrewNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false
  };

  const existingNotifications = JSON.parse(localStorage.getItem('kr-crew-notifications') || '[]');
  const updatedNotifications = [newNotification, ...existingNotifications];
  localStorage.setItem('kr-crew-notifications', JSON.stringify(updatedNotifications));
  window.dispatchEvent(new Event('kr-crew-notifications-updated'));

  return newNotification;
}

export function CrewNotificationListener() {
  const [notifications, setNotifications] = useState<CrewNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<CrewNotification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = () => {
      const saved = localStorage.getItem('kr-crew-notifications');
      if (saved) {
        const allNotifications: CrewNotification[] = JSON.parse(saved);
        const unreadNotifications = allNotifications.filter(n => !n.read);
        setNotifications(unreadNotifications);
        
        // Show the most recent unread notification
        if (unreadNotifications.length > 0 && !currentNotification) {
          setCurrentNotification(unreadNotifications[0]);
          setIsDialogOpen(true);
        }
      }
    };

    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('kr-crew-notifications-updated', handleUpdate);
    return () => window.removeEventListener('kr-crew-notifications-updated', handleUpdate);
  }, [currentNotification]);

  const markAsRead = (notificationId: string) => {
    const saved = localStorage.getItem('kr-crew-notifications');
    if (saved) {
      const allNotifications: CrewNotification[] = JSON.parse(saved);
      const updated = allNotifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem('kr-crew-notifications', JSON.stringify(updated));
      
      // Update local state
      const remaining = notifications.filter(n => n.id !== notificationId);
      setNotifications(remaining);
      
      // Show next unread notification if any
      if (remaining.length > 0) {
        setCurrentNotification(remaining[0]);
      } else {
        setCurrentNotification(null);
        setIsDialogOpen(false);
      }
    }
  };

  const dismissAll = () => {
    if (currentNotification) {
      markAsRead(currentNotification.id);
    }
    setIsDialogOpen(false);
  };

  const getNotificationIcon = (type: CrewNotification['type']) => {
    switch (type) {
      case 'date_changed':
      case 'time_changed':
        return <Calendar className="size-5 text-blue-600" />;
      case 'new_assignment':
        return <User className="size-5 text-green-600" />;
      case 'assignment_removed':
        return <X className="size-5 text-red-600" />;
      default:
        return <Bell className="size-5 text-orange-600" />;
    }
  };

  const getNotificationColor = (type: CrewNotification['type']) => {
    switch (type) {
      case 'new_assignment':
        return 'bg-green-50 border-green-200';
      case 'assignment_removed':
        return 'bg-red-50 border-red-200';
      case 'date_changed':
      case 'time_changed':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-orange-50 border-orange-200';
    }
  };

  if (!currentNotification) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
              <Bell className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle>Schedule Update</DialogTitle>
              <DialogDescription>
                Notification for {currentNotification.crewMemberName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Card className={`border-2 ${getNotificationColor(currentNotification.type)}`}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(currentNotification.type)}
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-semibold text-gray-900">{currentNotification.message}</p>
                
                {currentNotification.details.customerName && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="size-4" />
                    <span>{currentNotification.details.customerName}</span>
                  </div>
                )}

                {currentNotification.details.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="size-4" />
                    <span>{currentNotification.details.address}</span>
                  </div>
                )}

                {currentNotification.details.oldDate && currentNotification.details.newDate && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-red-600">
                      <Calendar className="size-4" />
                      <span className="line-through">
                        {format(new Date(currentNotification.details.oldDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <Calendar className="size-4" />
                      <span>
                        {format(new Date(currentNotification.details.newDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                )}

                {currentNotification.details.oldTime && currentNotification.details.newTime && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-red-600">
                      <Clock className="size-4" />
                      <span className="line-through">{currentNotification.details.oldTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <Clock className="size-4" />
                      <span>{currentNotification.details.newTime}</span>
                    </div>
                  </div>
                )}

                {currentNotification.details.date && !currentNotification.details.oldDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="size-4" />
                    <span>{format(new Date(currentNotification.details.date), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {currentNotification.details.time && !currentNotification.details.oldTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="size-4" />
                    <span>{currentNotification.details.time}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t">
                  {format(new Date(currentNotification.timestamp), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {notifications.length > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Badge variant="secondary">{notifications.length - 1} more</Badge>
            <span>notification{notifications.length - 1 !== 1 ? 's' : ''} pending</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => markAsRead(currentNotification.id)} className="flex-1">
            Got it
          </Button>
          {notifications.length > 1 && (
            <Button variant="outline" onClick={dismissAll}>
              Dismiss All
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

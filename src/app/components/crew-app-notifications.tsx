/**
 * CREW APP NOTIFICATION COMPONENT
 * 
 * Copy this component to your K&R Crew Schedule app in Figma.
 * This will automatically receive and display notifications sent from the admin app.
 * 
 * The admin app stores notifications in localStorage with key: 'kr-crew-notifications'
 * This component reads from that same storage to display pop-ups.
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Bell, X, Calendar, User, MapPin, Clock, CheckCircle } from 'lucide-react';
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

interface CrewAppNotificationsProps {
  crewMemberName: string; // Pass the logged-in crew member's name
}

export function CrewAppNotifications({ crewMemberName }: CrewAppNotificationsProps) {
  const [notifications, setNotifications] = useState<CrewNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<CrewNotification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = () => {
      const saved = localStorage.getItem('kr-crew-notifications');
      if (saved) {
        const allNotifications: CrewNotification[] = JSON.parse(saved);
        
        // Filter notifications for this crew member only
        const myNotifications = allNotifications.filter(
          n => n.crewMemberName === crewMemberName && !n.read
        );
        
        setNotifications(myNotifications);
        setUnreadCount(myNotifications.length);
        
        // Show the most recent unread notification
        if (myNotifications.length > 0 && !currentNotification) {
          setCurrentNotification(myNotifications[0]);
          setIsDialogOpen(true);
        }
      }
    };

    loadNotifications();

    // Listen for new notifications from admin app
    const handleUpdate = () => {
      loadNotifications();
    };

    // Check for updates every 2 seconds (in case admin is on different device)
    const interval = setInterval(loadNotifications, 2000);

    window.addEventListener('kr-crew-notifications-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('kr-crew-notifications-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [crewMemberName, currentNotification]);

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
      setUnreadCount(remaining.length);
      
      // Show next unread notification if any
      if (remaining.length > 0) {
        setCurrentNotification(remaining[0]);
      } else {
        setCurrentNotification(null);
        setIsDialogOpen(false);
      }
    }
  };

  const markAllAsRead = () => {
    const saved = localStorage.getItem('kr-crew-notifications');
    if (saved) {
      const allNotifications: CrewNotification[] = JSON.parse(saved);
      const updated = allNotifications.map(n => 
        n.crewMemberName === crewMemberName ? { ...n, read: true } : n
      );
      localStorage.setItem('kr-crew-notifications', JSON.stringify(updated));
      setNotifications([]);
      setUnreadCount(0);
      setCurrentNotification(null);
      setIsDialogOpen(false);
    }
  };

  const getNotificationIcon = (type: CrewNotification['type']) => {
    switch (type) {
      case 'date_changed':
      case 'time_changed':
        return <Calendar className="size-6 text-blue-600" />;
      case 'new_assignment':
        return <CheckCircle className="size-6 text-green-600" />;
      case 'assignment_removed':
        return <X className="size-6 text-red-600" />;
      default:
        return <Bell className="size-6 text-orange-600" />;
    }
  };

  const getNotificationColor = (type: CrewNotification['type']) => {
    switch (type) {
      case 'new_assignment':
        return 'bg-green-50 border-green-300';
      case 'assignment_removed':
        return 'bg-red-50 border-red-300';
      case 'date_changed':
      case 'time_changed':
        return 'bg-blue-50 border-blue-300';
      default:
        return 'bg-orange-50 border-orange-300';
    }
  };

  const getBadgeColor = (type: CrewNotification['type']) => {
    switch (type) {
      case 'new_assignment':
        return 'bg-green-600';
      case 'assignment_removed':
        return 'bg-red-600';
      case 'date_changed':
      case 'time_changed':
        return 'bg-blue-600';
      default:
        return 'bg-orange-600';
    }
  };

  return (
    <>
      {/* Notification Badge Icon - Show in your crew app header */}
      {unreadCount > 0 && (
        <button
          onClick={() => {
            if (notifications.length > 0 && !isDialogOpen) {
              setCurrentNotification(notifications[0]);
              setIsDialogOpen(true);
            }
          }}
          className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="size-6 text-gray-700" />
          <Badge className={`absolute -top-1 -right-1 ${getBadgeColor(notifications[0]?.type || 'schedule_changed')} text-white px-2 py-0.5 text-xs`}>
            {unreadCount}
          </Badge>
        </button>
      )}

      {/* Notification Dialog */}
      {currentNotification && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                  <Bell className="size-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Schedule Update!</DialogTitle>
                  <DialogDescription className="text-base">
                    Hi {crewMemberName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Card className={`border-2 ${getNotificationColor(currentNotification.type)}`}>
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(currentNotification.type)}
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="font-bold text-lg text-gray-900">{currentNotification.message}</p>
                    
                    {currentNotification.details.customerName && (
                      <div className="flex items-center gap-2 text-base text-gray-700">
                        <User className="size-5 flex-shrink-0" />
                        <span className="font-semibold">{currentNotification.details.customerName}</span>
                      </div>
                    )}

                    {currentNotification.details.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin className="size-5 flex-shrink-0 mt-0.5" />
                        <span>{currentNotification.details.address}</span>
                      </div>
                    )}

                    {currentNotification.details.oldDate && currentNotification.details.newDate && (
                      <div className="space-y-2 bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Date Changed:</p>
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <Calendar className="size-4" />
                          <span className="line-through">
                            {format(new Date(currentNotification.details.oldDate), 'EEEE, MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-base text-green-600 font-bold">
                          <Calendar className="size-5" />
                          <span>
                            {format(new Date(currentNotification.details.newDate), 'EEEE, MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentNotification.details.oldTime && currentNotification.details.newTime && (
                      <div className="space-y-2 bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Time Changed:</p>
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <Clock className="size-4" />
                          <span className="line-through">{currentNotification.details.oldTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-base text-green-600 font-bold">
                          <Clock className="size-5" />
                          <span>{currentNotification.details.newTime}</span>
                        </div>
                      </div>
                    )}

                    {currentNotification.details.date && !currentNotification.details.oldDate && (
                      <div className="flex items-center gap-2 text-base text-gray-700 font-semibold">
                        <Calendar className="size-5" />
                        <span>{format(new Date(currentNotification.details.date), 'EEEE, MMM d, yyyy')}</span>
                      </div>
                    )}

                    {currentNotification.details.time && !currentNotification.details.oldTime && (
                      <div className="flex items-center gap-2 text-base text-gray-700 font-semibold">
                        <Clock className="size-5" />
                        <span>{currentNotification.details.time}</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-3 border-t">
                      Received: {format(new Date(currentNotification.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {notifications.length > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {notifications.length - 1}
                </Badge>
                <span className="font-semibold">more notification{notifications.length - 1 !== 1 ? 's' : ''} waiting</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => markAsRead(currentNotification.id)} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg py-6"
              >
                <CheckCircle className="size-5 mr-2" />
                Got it!
              </Button>
              {notifications.length > 1 && (
                <Button 
                  variant="outline" 
                  onClick={markAllAsRead}
                  className="text-base py-6"
                >
                  Clear All
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * USAGE IN YOUR CREW APP:
 * 
 * 1. Copy this file to your crew app
 * 2. Add to your crew app's main component:
 * 
 * import { CrewAppNotifications } from './components/crew-app-notifications';
 * 
 * function CrewApp() {
 *   const [crewMemberName, setCrewMemberName] = useState('John Smith'); // Your logged-in crew member
 *   
 *   return (
 *     <div>
 *       <header>
 *         <h1>My Schedule</h1>
 *         <CrewAppNotifications crewMemberName={crewMemberName} />
 *       </header>
 *       // ... rest of your app
 *     </div>
 *   );
 * }
 */

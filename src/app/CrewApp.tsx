import { CrewApp } from '@/app/components/crew-app';
import { Toaster } from '@/app/components/ui/sonner';

/**
 * K&R POWERWASHING - Crew App Entry Point
 * 
 * This is the separate crew app interface that displays weekly schedules for crew members.
 * 
 * AUTO-REFRESH FEATURES:
 * - Listens for 'kr-jobs-updated' and 'kr-appointments-updated' events
 * - Listens for localStorage 'storage' events for cross-tab synchronization
 * - Polls localStorage every 2 seconds to detect changes from the admin app
 * - Displays real-time pop-up notifications when assignments change
 * 
 * USAGE:
 * - Admin staff use /src/app/App.tsx (main admin dashboard)
 * - Crew members use this CrewApp.tsx to view their schedules
 * - When admins schedule/modify jobs in the admin app, crew app automatically refreshes
 */
export default function CrewAppPage() {
  return (
    <>
      <CrewApp />
      <Toaster position="top-right" richColors />
    </>
  );
}
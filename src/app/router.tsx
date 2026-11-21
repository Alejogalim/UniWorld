import { createMemoryRouter, Navigate } from 'react-router';
import { AppShell } from '@/ui/layout/AppShell';
import { CounselorScreen } from '@/ui/screens/Counselor';
import { FinderScreen } from '@/ui/screens/Finder';
import { MyUnisScreen } from '@/ui/screens/MyUnis';
import { OnboardingScreen } from '@/ui/screens/Onboarding';
import { SettingsScreen } from '@/ui/screens/Settings';
import { FirstLaunchGate, RootRedirect } from './FirstLaunchGate';

// Desktop app: in-memory history, no URL bar.
export const router = createMemoryRouter([
  {
    element: <FirstLaunchGate />,
    children: [
      { index: true, element: <RootRedirect /> },
      {
        element: <AppShell />,
        children: [
          { path: 'onboarding', element: <OnboardingScreen /> },
          { path: 'counselor', element: <CounselorScreen /> },
          { path: 'finder', element: <FinderScreen /> },
          { path: 'my-unis', element: <MyUnisScreen /> },
          { path: 'settings', element: <SettingsScreen /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

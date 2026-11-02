import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { DashboardPage } from '@/pages/DashboardPage';
import { DispatchDetailPage } from '@/pages/DispatchDetailPage';
import { DispatchesPage } from '@/pages/DispatchesPage';
import { CreateDriverPage } from '@/pages/CreateDriverPage';
import { CreateTruckTypePage } from '@/pages/CreateTruckTypePage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { TripsPage } from '@/pages/TripsPage';
import { TruckTypeDetailPage } from '@/pages/TruckTypeDetailPage';
import { TruckTypesPage } from '@/pages/TruckTypesPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { UsersPage } from '@/pages/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="dispatches" element={<DispatchesPage />} />
              <Route path="dispatches/:id" element={<DispatchDetailPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="trips/:id" element={<TripDetailPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/drivers/new" element={<CreateDriverPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="truck-types" element={<TruckTypesPage />} />
              <Route path="truck-types/new" element={<CreateTruckTypePage />} />
              <Route path="truck-types/:id" element={<TruckTypeDetailPage />} />
              <Route
                path="commissions"
                element={
                  <PlaceholderPage
                    title="Commissions"
                    phase="Phase A6"
                    blurb="Ledger list, summary, and admin confirm."
                  />
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

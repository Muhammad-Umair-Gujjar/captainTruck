import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { DashboardPage } from '@/pages/DashboardPage';
import { DispatchDetailPage } from '@/pages/DispatchDetailPage';
import { DispatchesPage } from '@/pages/DispatchesPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { TripsPage } from '@/pages/TripsPage';

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
              <Route
                path="users"
                element={
                  <PlaceholderPage
                    title="Users"
                    phase="Phase A4"
                    blurb="Customers, drivers, and create-driver flow."
                  />
                }
              />
              <Route
                path="truck-types"
                element={
                  <PlaceholderPage
                    title="Truck types"
                    phase="Phase A5"
                    blurb="Catalog and base-rate history."
                  />
                }
              />
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

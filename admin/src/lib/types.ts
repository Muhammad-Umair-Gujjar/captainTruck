export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};

export type BillBreakdown = {
  currency: 'PKR';
  lockedBaseRateCents: number;
  aiTripCostCents: number;
  perTruckCents: number;
  truckCount: number;
  totalBillCents: number;
  authoritative: true;
  flaggedOutlier: boolean;
};

export type DispatchCustomer = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export type DispatchTruckType = {
  id: string;
  code: string;
  name: string;
  capacity: string | null;
};

export type RouteOption = {
  id?: string;
  isSelected: boolean;
  aiCostCents: number;
  distanceMeters: number;
  durationSeconds?: number;
  polyline?: string;
};

export type DispatchTrip = {
  id: string;
  status: string;
  driverId?: string;
  driver?: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string;
    driverProfile?: {
      vehiclePlate: string | null;
      licenseNumber: string | null;
      isAvailable: boolean;
    } | null;
  };
};

export type Dispatch = {
  id: string;
  customerId: string;
  truckTypeId: string;
  status: string;
  truckCount: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  pickupAt: string | null;
  notes: string | null;
  lockedBaseRateCents: number | null;
  paymentMethod: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  truckType: DispatchTruckType | null;
  customer: DispatchCustomer | null;
  routeOptions?: RouteOption[];
  trip: DispatchTrip | null;
  billBreakdown: BillBreakdown | null;
  assignmentNote?: string;
};

export type DriverUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  driverProfile: {
    vehiclePlate: string | null;
    licenseNumber: string | null;
    isAvailable: boolean;
  } | null;
};

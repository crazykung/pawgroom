// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for PawGroom frontend
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  tenantId: string;
  branchId?: string;
  isSuperAdmin?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
  address?: string;
  note?: string;
  totalVisits: number;
  totalSpent: number;
  createdAt: string;
  pets?: Pet[];
}

export interface Pet {
  id: string;
  customerId: string;
  name: string;
  species: 'DOG' | 'CAT' | 'OTHER';
  breed?: string;
  gender?: 'MALE' | 'FEMALE';
  weight?: number;
  birthDate?: string;
  allergies?: string;
  note?: string;
  photoUrl?: string;
  customer?: Customer;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  durationMin: number;
  description?: string;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  customerId: string;
  petId: string;
  branchId: string;
  scheduledAt: string;
  endAt?: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  note?: string;
  customer?: Customer;
  pet?: Pet;
  services?: Service[];
}

export interface QueueTicket {
  id: string;
  ticketNumber: number;
  branchId: string;
  customerId: string;
  petId: string;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'DONE' | 'SKIPPED';
  calledAt?: string;
  startAt?: string;
  doneAt?: string;
  estimatedWait?: number;
  customer?: Customer;
  pet?: Pet;
}

export interface JobOrder {
  id: string;
  appointmentId?: string;
  queueTicketId?: string;
  branchId: string;
  customerId: string;
  petId: string;
  groomerId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  startAt?: string;
  doneAt?: string;
  note?: string;
  customer?: Customer;
  pet?: Pet;
  groomer?: User;
  invoice?: Invoice;
  services?: JobService[];
}

export interface JobService {
  id: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  service?: Service;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobOrderId: string;
  customerId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
  issuedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface CompPlan {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED' | 'TIERED' | 'SPLIT' | 'BONUS';
  value: number;
  isActive: boolean;
}

export interface CompTransaction {
  id: string;
  userId: string;
  invoiceId: string;
  amount: number;
  period: string;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  user?: User;
  invoice?: Invoice;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  layout: any;
  datasetType: string;
  isPublic: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

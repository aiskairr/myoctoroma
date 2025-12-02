import { apiGetJson, apiPostJson } from '@/lib/api';

// ============================================================================
// ТИПЫ ДАННЫХ
// ============================================================================

// Организация
export interface Organization {
  id: number;
  name: string;
  user_id: number;
  branches: number;
  paidDate: string;
  isActive: boolean;
}

// Филиал
export interface Branch {
  id: number;
  organization_id: number;
  name: string;
  phone: string;
  address: string;
  timezone: string;
  isActive: boolean;
}

// Сотрудник (Staff)
export interface StaffMember {
  id: number;
  organization: {
    id: number;
    name: string;
  };
  branches: {
    id: number;
    name: string;
    address: string;
  }[];
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  role: 'manager' | 'employee';
  customRole?: string;
  specialty?: string;
  description?: string;
  is_active: boolean;
  photo_url?: string;
  createdAt: string;
  updatedAt: string;
  first_name?: string;
  last_name?: string;
}

// Ответ с списком сотрудников
export interface StaffListResponse {
  success: boolean;
  count: number;
  data: StaffMember[];
}

// Запрос на создание записи (Assignment)
export interface CreateAssignmentRequest {
  organizationId: number;
  branchId: number;
  client: {
    id?: string;
    firstname: string;
    phoneNumber: string;
  };
  employeeId: number;
  assignmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  notes?: string;
  source?: string;
  discount?: number;
  paid?: 'paid' | 'unpaid' | 'partial';
  certificateNumber?: string;
  paymentMethod?: {
    type: 'cash' | 'card' | 'transfer' | 'certificate';
    amount: number;
    name?: string;
  }[];
  service: {
    id: number;
    name: string;
    price: number;
    duration: number;
  };
  additionalServices?: {
    id: number;
    name: string;
    price: number;
    duration: number;
  }[];
}

// Ответ при создании записи
export interface CreateAssignmentResponse {
  success: boolean;
  data: {
    id: number;
    organization_id: number;
    branch_id: number;
    client_id: string;
    employee_id: number;
    client_snapshot: {
      first_name: string;
      last_name: string;
      phone_number: string;
    };
    employee_snapshot: {
      first_name: string;
      last_name: string;
      role: string;
    };
    manager_snapshot?: {
      first_name: string;
      last_name: string;
      role: string;
    };
    service_snapshot: {
      id: number;
      name: string;
      price: number;
      duration: number;
    };
    additional_services?: {
      id: number;
      name: string;
      price: number;
      duration: number;
    }[];
    assignment_date: string;
    start_time: string;
    end_time: string;
    status: 'new' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    paid: 'paid' | 'unpaid' | 'partial';
    payment_method: {
      methods: {
        type: 'cash' | 'card' | 'transfer' | 'certificate';
        amount: number;
        name?: string;
      }[];
      total: number;
    };
    discount: number;
    final_price: number;
    total_duration: number;
    timezone: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

// Гостевой токен
export interface GuestTokenResponse {
  token: string;
}

// ============================================================================
// API ФУНКЦИИ
// ============================================================================

const SECONDARY_API_BASE_URL = import.meta.env.VITE_SECONDARY_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

/**
 * Получить список организаций
 * @param ownerId - ID владельца организации (опционально)
 * @param name - Поиск по имени (опционально)
 */
export const getOrganizations = async (
  ownerId?: number,
  name?: string
): Promise<Organization[]> => {
  const params = new URLSearchParams();
  if (ownerId) params.append('ownerId', ownerId.toString());
  if (name) params.append('name', name);

  const url = `/booking/organizations${params.toString() ? `?${params.toString()}` : ''}`;
  return apiGetJson<Organization[]>(url);
};

/**
 * Получить организацию по ID
 * @param id - ID организации
 */
export const getOrganizationById = async (id: number): Promise<Organization> => {
  return apiGetJson<Organization>(`/booking/organizations/${id}`);
};

/**
 * Получить список филиалов
 * @param organizationId - ID организации (обязательно для admin)
 * @param name - Поиск по имени (опционально)
 */
export const getBranches = async (
  organizationId: number,
  name?: string
): Promise<Branch[]> => {
  const params = new URLSearchParams();
  params.append('organizationId', organizationId.toString());
  if (name) params.append('name', name);

  const url = `/booking/branches?${params.toString()}`;
  return apiGetJson<Branch[]>(url);
};

/**
 * Получить филиал по ID
 * @param branchId - ID филиала
 */
export const getBranchById = async (branchId: number): Promise<Branch> => {
  return apiGetJson<Branch>(`/booking/branches/${branchId}`);
};

/**
 * Получить список сотрудников
 * @param organizationId - ID организации (обязательно если нет branchId)
 * @param branchId - ID филиала (опционально)
 * @param role - Роль сотрудника (опционально)
 */
export const getStaff = async (
  organizationId?: string,
  branchId?: string,
  role?: 'manager' | 'employee'
): Promise<StaffListResponse> => {
  const params = new URLSearchParams();
  if (organizationId) params.append('organizationId', organizationId);
  if (branchId) params.append('branchId', branchId);
  if (role) params.append('role', role);

  const url = `/booking/staff?${params.toString()}`;
  return apiGetJson<StaffListResponse>(url);
};

/**
 * Получить гостевой токен для организации
 * @param organizationId - ID организации
 */
export const getGuestToken = async (organizationId: number): Promise<GuestTokenResponse> => {
  return apiGetJson<GuestTokenResponse>(`/booking/auth/${organizationId}`);
};

/**
 * Создать новую запись (assignment)
 * @param assignment - Данные для создания записи
 */
export const createAssignment = async (
  assignment: CreateAssignmentRequest
): Promise<CreateAssignmentResponse> => {
  return apiPostJson<CreateAssignmentResponse>('/booking/assignments', assignment);
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Получить полное имя сотрудника
 */
export const getStaffFullName = (staff: StaffMember): string => {
  return `${staff.firstname || staff.first_name || ''} ${staff.lastname || staff.last_name || ''}`.trim();
};

/**
 * Проверить, активен ли филиал
 */
export const isBranchActive = (branch: Branch): boolean => {
  return branch.isActive === true;
};

/**
 * Проверить, активна ли организация
 */
export const isOrganizationActive = (organization: Organization): boolean => {
  return organization.isActive === true;
};

/**
 * Форматировать дату для API (YYYY-MM-DD)
 */
export const formatDateForBookingAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Форматировать время для API (HH:mm)
 */
export const formatTimeForBookingAPI = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

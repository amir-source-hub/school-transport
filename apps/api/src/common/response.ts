export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, string[]>;
    requestId?: string;
  };
  meta?: {
    requestId?: string;
    snapshotAt?: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  data: T,
  meta?: { requestId?: string; snapshotAt?: string },
): ApiResponse<T> {
  return { success: true, data, meta };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
  meta?: { requestId?: string; snapshotAt?: string },
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
    meta,
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function parsePagination(query: {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: string;
}): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10) || 20));
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { page, pageSize, sortBy: query.sortBy, sortOrder };
}

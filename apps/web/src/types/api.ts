export type ApiMeta = { requestId?: string; snapshotAt?: string };

export type ApiPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
  pagination?: ApiPagination;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, string | string[]>;
    requestId?: string;
  };
  meta?: ApiMeta;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

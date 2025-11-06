/**
 * Pagination Utilities
 * Helpers for cursor-based and offset-based pagination
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  cursor?: {
    next?: string;
    prev?: string;
  };
  hasMore: boolean;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number = 1,
  pageSize: number = 20
): PaginationResult<any>['pagination'] {
  const totalPages = Math.ceil(total / pageSize);

  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Get skip and take values for Prisma queries
 */
export function getPaginationSkipTake(
  page: number = 1,
  pageSize: number = 20
): { skip: number; take: number } {
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { skip, take };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: number,
  pageSize?: number
): { page: number; pageSize: number } {
  const validPage = Math.max(1, page || 1);
  const validPageSize = Math.min(100, Math.max(1, pageSize || 20)); // Max 100 items per page

  return { page: validPage, pageSize: validPageSize };
}

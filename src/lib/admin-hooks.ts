/**
 * Shared React hooks for admin panel
 * Extracted from the monolithic admin/page.tsx
 */

"use client";

import { useState, useCallback } from "react";
import { Message } from "./admin-types";

/**
 * Hook for fetching admin data with error handling
 */
export const useAdminFetch = () => {
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      setLoading(true);
      try {
        const response = await fetch(endpoint, {
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          ...options,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch from ${endpoint}`);
        }

        return await response.json();
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { fetchData, loading };
};

/**
 * Hook for message state management
 */
export const useMessage = () => {
  const [message, setMessage] = useState<Message | null>(null);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    // Auto-clear after 5 seconds
    const timeout = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const clearMessage = useCallback(() => setMessage(null), []);

  return { message, showMessage, clearMessage };
};

/**
 * Hook for pagination state
 */
export const usePagination = (initialPage = 1, limit = 10) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
  });

  const updatePagination = useCallback(
    (data: { totalPages: number; totalCount: number }) => {
      setPagination(data);
    },
    []
  );

  return {
    currentPage,
    setCurrentPage,
    pagination,
    updatePagination,
  };
};

/**
 * Hook for form reset
 */
export const useFormReset = <T,>(initialState: T) => {
  const [form, setForm] = useState(initialState);

  const resetForm = useCallback(() => {
    setForm(initialState);
  }, [initialState]);

  const updateForm = useCallback((updates: Partial<T>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  return { form, setForm, resetForm, updateForm };
};

/**
 * Hook for confirmation dialog
 */
export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void) => {
      setConfirmState({ message, onConfirm });
    },
    []
  );

  const confirm = useCallback(() => {
    if (confirmState?.onConfirm) {
      confirmState.onConfirm();
    }
    setConfirmState(null);
  }, [confirmState]);

  const cancel = useCallback(() => {
    setConfirmState(null);
  }, []);

  return { confirmState, showConfirm, confirm, cancel };
};

/**
 * Hook for loading state
 */
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);
  const toggleLoading = useCallback(() => setLoading((prev) => !prev), []);

  return { loading, setLoading, startLoading, stopLoading, toggleLoading };
};

/**
 * Hook for bulk selection
 */
export const useBulkSelect = () => {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: number[]) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      const allSelected = ids.every((id) => newSet.has(id));

      if (allSelected) {
        ids.forEach((id) => newSet.delete(id));
      } else {
        ids.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  return { selected, toggleSelect, toggleSelectAll, clearSelection };
};

/**
 * Shared utility functions for admin panel
 */

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format price with currency
 */
export const formatPrice = (amount: number, currency = "৳"): string => {
  return `${currency}${amount.toLocaleString()}`;
};

/**
 * Calculate expiry date
 */
export const calculateExpiry = (months: number, days: number = 0): Date => {
  const now = new Date();
  now.setMonth(now.getMonth() + months);
  now.setDate(now.getDate() + days);
  return now;
};

/**
 * Check if upgrade code is premium
 */
export const isPremium = (code: {
  is_active: boolean;
  expires_at: string | null;
}): boolean => {
  if (!code.is_active) return false;
  if (code.expires_at === null) return true;
  return new Date(code.expires_at) > new Date();
};

/**
 * Validate form data
 */
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, string>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.includes("required") && !value) {
      errors[field] = "This field is required";
    }

    if (rule.includes("email") && value && !isValidEmail(value)) {
      errors[field] = "Invalid email address";
    }

    if (rule.includes("min:")) {
      const minLength = parseInt(rule.match(/min:(\d+)/)?.[1] || "0");
      if (value && value.toString().length < minLength) {
        errors[field] = `Minimum ${minLength} characters required`;
      }
    }

    if (rule.includes("max:")) {
      const maxLength = parseInt(rule.match(/max:(\d+)/)?.[1] || "999");
      if (value && value.toString().length > maxLength) {
        errors[field] = `Maximum ${maxLength} characters allowed`;
      }
    }

    if (rule.includes("number") && value && isNaN(Number(value))) {
      errors[field] = "Must be a number";
    }

    if (rule.includes("positive") && value && Number(value) <= 0) {
      errors[field] = "Must be a positive number";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Generate random string
 */
export const generateRandomString = (
  length: number = 8,
  chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Truncate text
 */
export const truncateText = (
  text: string,
  maxLength: number = 50,
  suffix: string = "..."
): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

/**
 * Calculate statistics
 */
export const calculateStats = <T extends Record<string, any>>(
  items: T[],
  selector: (item: T) => number
): {
  total: number;
  average: number;
  min: number;
  max: number;
} => {
  if (items.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 };
  }

  const values = items.map(selector);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { total, average, min, max };
};

/**
 * Get color for status
 */
export const getStatusColor = (
  status: string
): "success" | "error" | "warning" | "info" => {
  switch (status.toLowerCase()) {
    case "approved":
    case "active":
    case "completed":
      return "success";
    case "rejected":
    case "inactive":
    case "error":
      return "error";
    case "pending":
    case "waiting":
      return "warning";
    default:
      return "info";
  }
};

/**
 * Convert to kebab-case
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
    .toLowerCase();
};

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

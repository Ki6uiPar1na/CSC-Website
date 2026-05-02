"use client";

import { Message } from "@/lib/admin-types";

interface AdminPageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  actionButton?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    icon?: React.ReactNode;
  };
  message?: Message | null;
}

export const AdminPageHeader = ({
  title,
  icon,
  count,
  actionButton,
  message,
}: AdminPageHeaderProps) => {
  return (
    <div className="mb-8">
      {/* Header with title and button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {count !== undefined && (
              <p className="text-sm text-gray-400">Total: {count}</p>
            )}
          </div>
        </div>
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            disabled={actionButton.loading}
            className="accent px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {actionButton.loading ? (
              <>
                <span className="animate-spin">⟳</span>
                {actionButton.label}...
              </>
            ) : (
              <>
                {actionButton.icon}
                {actionButton.label}
              </>
            )}
          </button>
        )}
      </div>

      {/* Message display */}
      {message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          <span className="text-lg">
            {message.type === "success" ? "✓" : "✕"}
          </span>
          {message.text}
        </div>
      )}
    </div>
  );
};

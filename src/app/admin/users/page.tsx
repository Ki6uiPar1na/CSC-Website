"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  KeyRound,
  Trash2,
  Loader2,
  Crown,
  User,
  Users,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Mail,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { UserWithPremium } from "@/lib/admin-types";
import { useToast } from "@/components/ToastProvider";
import { useLoading, usePagination, useBulkSelect } from "@/lib/admin-hooks";

type SortField = "username" | "email" | "role_id" | "total_points" | "status" | "created_at";
type SortDir = "asc" | "desc";

const ROLE_STYLES: Record<number, { label: string; dot: string; text: string; bg: string }> = {
  1: { label: "Admin", dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/8" },
  2: { label: "Instructor", dot: "bg-green-400", text: "text-green-400", bg: "bg-green-500/8" },
  3: { label: "User", dot: "bg-blue-400", text: "text-blue-400", bg: "bg-blue-500/8" },
};

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  approved: { dot: "bg-green-400", text: "text-green-400", bg: "bg-green-500/8" },
  pending: { dot: "bg-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500/8" },
  rejected: { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/8" },
};

interface ContextMenu {
  x: number;
  y: number;
  user: UserWithPremium;
}

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserWithPremium[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { loading: mainLoading, setLoading } = useLoading(true);
  const { loading: isRevokingPremium, setLoading: setIsRevokingPremium } = useLoading();
  const { loading: isResettingPassword, setLoading: setIsResettingPassword } = useLoading();
  const { loading: isUpdatingRole, setLoading: setIsUpdatingRole } = useLoading();
  const { currentPage, setCurrentPage, pagination, updatePagination } = usePagination(1, 25);
  const { toast, confirm } = useToast();
  const { selected, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelect();

  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [rejectUser, setRejectUser] = useState<{ userId: number; username: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [roleToUpdate, setRoleToUpdate] = useState<{
    userId: number;
    username: string;
    newRoleId: number;
    step: number;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>("username");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const contextMenuJustOpened = useRef(false);

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, currentPage]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuJustOpened.current) return;
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&status=${statusFilter}&page=${currentPage}&limit=25`
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch users");
      }
      setUsers(data.users || []);
      if (data.pagination) updatePagination(data.pagination);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "username": cmp = a.username.localeCompare(b.username); break;
      case "email": cmp = a.email.localeCompare(b.email); break;
      case "role_id": cmp = a.role_id - b.role_id; break;
      case "total_points": cmp = a.total_points - b.total_points; break;
      case "status": cmp = a.status.localeCompare(b.status); break;
      case "created_at": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleRoleChangeInitiate = (userId: number, username: string, newRoleId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role_id === newRoleId) return;
    setRoleToUpdate({ userId, username, newRoleId, step: 1 });
  };

  const handleRoleChangeConfirm = async () => {
    if (!roleToUpdate) return;
    const { userId, username, newRoleId, step } = roleToUpdate;
    if (newRoleId === 1 && step === 1) {
      setRoleToUpdate({ ...roleToUpdate, step: 2 });
      return;
    }
    setIsUpdatingRole(true);
    setRoleToUpdate(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: newRoleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      toast.success(`Role updated for ${username}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve user");
      }
      toast.success("User approved successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${rejectUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject user");
      }
      toast.success("User rejected successfully");
      setRejectUser(null);
      setRejectionReason("");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePremium = async (userId: number) => {
    if (!(await confirm({ message: "Revoke premium access for this user?", danger: true, confirmLabel: "Revoke" }))) return;
    setIsRevokingPremium(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to revoke premium");
      const data = await res.json();
      setUsers(data.users || []);
      toast.success("Premium access revoked");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRevokingPremium(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!resetPasswordValue.trim()) {
      toast.error("Password cannot be empty");
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }
      toast.success("Password reset successfully");
      setResetPasswordUserId(null);
      setResetPasswordValue("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!(await confirm({ message: `Delete user "${username}"? This cannot be undone.`, danger: true, confirmLabel: "Delete" }))) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u.id !== userId));
      clearSelection();
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = Array.from(selected).filter(id => {
      const u = users.find(u => u.id === id);
      return u && u.status !== "approved";
    });
    if (pendingIds.length === 0) return;
    setLoading(true);
    let successCount = 0;
    for (const id of pendingIds) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        if (res.ok) successCount++;
      } catch {}
    }
    clearSelection();
    toast.success(`${successCount} user(s) approved`);
    fetchUsers();
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!(await confirm({ message: `Delete ${selected.size} user(s)? This cannot be undone.`, danger: true, confirmLabel: "Delete All" }))) return;
    let successCount = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch {}
    }
    clearSelection();
    toast.success(`${successCount} user(s) deleted`);
    fetchUsers();
  };

  const handleContextMenu = (e: React.MouseEvent, user: UserWithPremium) => {
    e.preventDefault();
    contextMenuJustOpened.current = true;
    requestAnimationFrame(() => { contextMenuJustOpened.current = false; });
    setContextMenu({ x: e.clientX, y: e.clientY, user });
  };

  const handleRowClick = (userId: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
    setSelectedRow(userId);
  };

  const totalUsers = pagination?.totalCount || 0;
  const selectedCount = selected.size;
  const allVisibleSelected = sortedUsers.length > 0 && sortedUsers.every(u => selected.has(u.id));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />;
    return sortDir === "asc" ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />;
  };

  const getContextMenuItems = (user: UserWithPremium) => {
    const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }[] = [];

    if (user.status !== "approved") {
      items.push({
        label: "Approve",
        icon: <Check size={14} />,
        onClick: () => handleApprove(user.id),
      });
    }
    if (user.status === "pending") {
      items.push({
        label: "Reject",
        icon: <Ban size={14} />,
        onClick: () => setRejectUser({ userId: user.id, username: user.username }),
        danger: true,
      });
    }
    items.push({
      label: "Reset Password",
      icon: <KeyRound size={14} />,
      onClick: () => setResetPasswordUserId(user.id),
    });
    if (user.is_premium) {
      items.push({
        label: "Revoke Premium",
        icon: <Crown size={14} />,
        onClick: () => handleRevokePremium(user.id),
        danger: true,
      });
    }
    items.push({
      label: "Delete User",
      icon: <Trash2 size={14} />,
      onClick: () => handleDeleteUser(user.id, user.username),
      danger: true,
    });
    return items;
  };

  return (
    <div className="space-y-0 animate-in fade-in duration-500">
      <AdminPageHeader
        title="User Management"
        icon={<Users className="text-primary" />}
        count={totalUsers}
      />

      {/* Toolbar */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-t-xl px-4 py-2.5 flex flex-wrap items-center gap-3 sticky top-0 z-30">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-black/50 border border-gray-700/60 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 pl-3 pr-8 bg-black/50 border border-gray-700/60 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="1">Admin</option>
              <option value="2">Instructor</option>
              <option value="3">User</option>
            </select>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 pl-3 pr-8 bg-black/50 border border-gray-700/60 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchUsers}
            className="h-9 px-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 hover:text-white border border-gray-700/40 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={mainLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto pl-3 border-l border-gray-700/50">
            <span className="text-xs text-gray-400 font-medium">{selectedCount} selected</span>
            <button
              onClick={handleBulkApprove}
              className="h-8 px-3 bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Check size={12} /> Approve
            </button>
            <button
              onClick={handleBulkDelete}
              className="h-8 px-3 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={clearSelection}
              className="h-8 px-2 bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 border border-gray-700/40 rounded-md transition-colors"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {mainLoading ? (
        <div className="bg-gray-900/40 border-x border-b border-gray-800/80 rounded-b-xl text-center py-20">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading users...</p>
        </div>
      ) : (
        <div className="bg-gray-900/40 border-x border-b border-gray-800/80 rounded-b-xl overflow-hidden">
          <div ref={tableRef} className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-700/60 bg-gray-800/30">
                  <th className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => toggleSelectAll(sortedUsers.map(u => u.id))}
                      className="w-4 h-4 rounded border-gray-600 bg-black/40 text-primary focus:ring-primary/30 cursor-pointer accent-[#00f0ff]"
                    />
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort("username")}
                  >
                    <div className="flex items-center gap-1.5">
                      User <SortIcon field="username" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort("role_id")}
                  >
                    <div className="flex items-center gap-1.5">
                      Role <SortIcon field="role_id" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort("total_points")}
                  >
                    <div className="flex items-center gap-1.5">
                      Points <SortIcon field="total_points" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Premium
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1.5">
                      Joined <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th className="w-10 px-3 py-2.5 text-center">
                    <MoreHorizontal size={14} className="text-gray-500 mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, idx) => {
                  const roleStyle = ROLE_STYLES[user.role_id] || ROLE_STYLES[3];
                  const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.pending;
                  const isSelected = selected.has(user.id);
                  const isRowSelected = selectedRow === user.id;

                  return (
                    <tr
                      key={user.id}
                      onContextMenu={(e) => handleContextMenu(e, user)}
                      onClick={(e) => handleRowClick(user.id, e)}
                      className={`border-b border-gray-800/40 transition-colors cursor-default select-none
                        ${idx % 2 === 0 ? "bg-transparent" : "bg-gray-800/10"}
                        ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}
                        ${isRowSelected && !isSelected ? "bg-gray-800/20" : ""}
                        hover:bg-gray-800/20
                      `}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(user.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-black/40 text-primary focus:ring-primary/30 cursor-pointer accent-[#00f0ff]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white text-[13px] truncate leading-tight">{user.username}</p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate leading-tight">
                              <Mail size={10} className="shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={user.role_id}
                          onChange={(e) => handleRoleChangeInitiate(user.id, user.username, parseInt(e.target.value))}
                          disabled={isUpdatingRole}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold bg-transparent border cursor-pointer focus:outline-none focus:border-primary transition-colors ${roleStyle.text} border-current/20`}
                        >
                          <option value="1" className="bg-gray-900 text-red-400">Admin</option>
                          <option value="2" className="bg-gray-900 text-green-400">Instructor</option>
                          <option value="3" className="bg-gray-900 text-blue-400">User</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[13px] text-accent font-semibold tabular-nums">{user.total_points.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-2">
                        {user.is_premium ? (
                          <div className="flex items-center gap-1.5">
                            <Crown size={12} className="text-yellow-400 shrink-0" />
                            <span className="text-[11px] text-yellow-400 font-medium">Premium</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500">Free</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusStyle.text} ${statusStyle.bg} border border-current/10`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${user.status === "pending" ? "animate-pulse" : ""}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, user); }}
                          className="p-1.5 rounded-md hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-16">
              <User className="mx-auto mb-2 text-gray-700" size={40} />
              <p className="text-gray-500 text-sm">No users found</p>
              {(searchQuery || roleFilter || statusFilter) && (
                <button
                  onClick={() => { setSearchQuery(""); setRoleFilter(""); setStatusFilter(""); setCurrentPage(1); }}
                  className="text-primary/70 hover:text-primary text-xs mt-2 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Status Bar */}
          <div className="border-t border-gray-700/60 bg-gray-800/20 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-4">
              <span>{totalUsers} total users</span>
              {selectedCount > 0 && <span className="text-primary/80">{selectedCount} selected</span>}
              {roleFilter && <span className="text-gray-400">Role: {ROLE_STYLES[parseInt(roleFilter)]?.label}</span>}
              {statusFilter && <span className="text-gray-400">Status: {statusFilter}</span>}
            </div>
            <div className="flex items-center gap-3">
              {pagination.totalPages > 1 && (
                <>
                  <span>
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<React.ReactNode[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push(<span key={`e-${p}`} className="text-gray-600 px-0.5">...</span>);
                        }
                        acc.push(
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[22px] h-[22px] rounded text-[11px] font-medium transition-colors ${
                              p === currentPage
                                ? "bg-primary/20 text-primary"
                                : "hover:bg-gray-700/50 text-gray-400"
                            }`}
                          >
                            {p}
                          </button>
                        );
                        return acc;
                      }, [])}
                    <button
                      onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1 rounded hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[70] min-w-[180px] bg-[#1a1f27] border border-gray-700/80 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-700/50">
            <p className="text-xs font-semibold text-white">{contextMenu.user.username}</p>
            <p className="text-[10px] text-gray-500">{contextMenu.user.email}</p>
          </div>
          {getContextMenuItems(contextMenu.user).map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setContextMenu(null); }}
              className={`w-full px-3 py-2 text-left text-[12px] flex items-center gap-2.5 transition-colors ${
                item.danger
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-gray-300 hover:bg-gray-700/50"
              } ${item.disabled ? "opacity-40 pointer-events-none" : ""}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#11161c] rounded-xl p-5 max-w-sm w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset Password</h3>
                <p className="text-[11px] text-gray-400">
                  {users.find((u) => u.id === resetPasswordUserId)?.username}
                </p>
              </div>
            </div>
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary mb-3"
              onKeyPress={(e) => e.key === "Enter" && handleResetPassword(resetPasswordUserId)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleResetPassword(resetPasswordUserId)}
                disabled={isResettingPassword}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                {isResettingPassword ? <><Loader2 size={12} className="animate-spin" /> Resetting...</> : "Reset Password"}
              </button>
              <button
                onClick={() => { setResetPasswordUserId(null); setResetPasswordValue(""); }}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#11161c] rounded-xl p-5 max-w-sm w-full mx-4 border border-red-500/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <Ban size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reject User</h3>
                <p className="text-[11px] text-gray-400">{rejectUser.username}</p>
              </div>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500 mb-3 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={mainLoading}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                {mainLoading ? <><Loader2 size={12} className="animate-spin" /> Rejecting...</> : "Confirm Reject"}
              </button>
              <button
                onClick={() => { setRejectUser(null); setRejectionReason(""); }}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Confirmation Modal */}
      {roleToUpdate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className={`bg-[#11161c] rounded-xl p-5 max-w-sm w-full mx-4 border shadow-2xl ${roleToUpdate.newRoleId === 1 ? "border-red-500/40" : "border-gray-700"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg border ${roleToUpdate.newRoleId === 1 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-primary/10 border-primary/20 text-primary"}`}>
                {roleToUpdate.newRoleId === 1 ? <ShieldCheck size={18} /> : <User size={18} />}
              </div>
              <h3 className="text-sm font-bold text-white">Change User Role</h3>
            </div>
            <div className="mb-5">
              {roleToUpdate.newRoleId === 1 ? (
                roleToUpdate.step === 1 ? (
                  <div className="p-3 bg-red-900/15 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 font-bold mb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Security Warning
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      You are about to grant <span className="text-white font-bold">Admin</span> access to <span className="text-primary font-bold">{roleToUpdate.username}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-gray-300">
                      Confirm promoting <span className="text-white font-medium">{roleToUpdate.username}</span> to Administrator?
                    </p>
                  </div>
                )
              ) : (
                <p className="text-xs text-gray-300">
                  Change <span className="text-primary font-bold">{roleToUpdate.username}</span> to{" "}
                  <span className="text-white font-bold">{roleToUpdate.newRoleId === 2 ? "Instructor" : "User"}</span>?
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRoleChangeConfirm}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  roleToUpdate.newRoleId === 1 ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                }`}
              >
                {roleToUpdate.newRoleId === 1 && roleToUpdate.step === 1 ? "I Understand" : "Confirm"}
              </button>
              <button
                onClick={() => setRoleToUpdate(null)}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

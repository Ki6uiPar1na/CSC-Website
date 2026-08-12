"use client";

import { useEffect, useState } from "react";
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
  Clock,
  ChevronLeft,
  ChevronRight,
  Mail,
  Ban,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { UserWithPremium } from "@/lib/admin-types";
import { useToast } from "@/components/ToastProvider";
import { useLoading, usePagination } from "@/lib/admin-hooks";

const ROLE_STYLES: Record<number, { label: string; badge: string; select: string }> = {
  1: {
    label: "Admin",
    badge: "bg-red-500/10 text-red-400 border border-red-500/30",
    select: "text-red-400 border-red-500/30",
  },
  2: {
    label: "Instructor",
    badge: "bg-green-500/10 text-green-400 border border-green-500/30",
    select: "text-green-400 border-green-500/30",
  },
  3: {
    label: "User",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
    select: "text-blue-400 border-blue-500/30",
  },
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400 border border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 animate-pulse",
  rejected: "bg-red-500/10 text-red-400 border border-red-500/30",
};

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
  const { currentPage, setCurrentPage, pagination, updatePagination } = usePagination(1, 10);
  const { toast, confirm } = useToast();
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

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, currentPage]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&status=${statusFilter}&page=${currentPage}&limit=15`
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
      if (data.pagination) {
        updatePagination(data.pagination);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeInitiate = (userId: number, username: string, newRoleId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role_id === newRoleId) return;

    setRoleToUpdate({ userId, username, newRoleId, step: 1 });
  };

  const handleRoleChangeConfirm = async () => {
    if (!roleToUpdate) return;
    const { userId, username, newRoleId, step } = roleToUpdate;

    // Handle two-step confirmation for Admin role
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
        body: JSON.stringify({ status: 'approved' }),
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
        body: JSON.stringify({ status: 'rejected', rejectionReason }),
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u.id !== userId));
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const totalUsers = pagination?.totalCount || 0;
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const premiumCount = users.filter((u) => u.is_premium).length;
  const adminCount = users.filter((u) => u.role_id === 1).length;

  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: <Users size={18} />,
      iconClass: "bg-primary/10 text-primary border-primary/30",
    },
    {
      label: "Admin Accounts",
      value: adminCount,
      icon: <ShieldCheck size={18} />,
      iconClass: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    {
      label: "Premium",
      value: premiumCount,
      icon: <Crown size={18} />,
      iconClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    {
      label: "Pending Approval",
      value: pendingCount,
      icon: <Clock size={18} />,
      iconClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
  ];

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader
        title="User Management"
        icon={<Users className="text-primary" />}
        count={totalUsers}
      />

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 transition-all duration-300"
          >
            <div className={`shrink-0 p-2.5 rounded-xl border ${stat.iconClass}`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-white font-mono leading-none">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1.5 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 bg-black/40 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-44">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">All Roles</option>
              <option value="1">Admin</option>
              <option value="2">Instructor</option>
              <option value="3">User</option>
            </select>
          </div>
          <div className="relative w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      {mainLoading ? (
        <div className="text-center py-20">
          <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading users...</p>
        </div>
      ) : (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/40 border-b border-gray-800">
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-gray-400">User</th>
                  <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Role</th>
                  <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Points</th>
                  <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Premium</th>
                  <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-gray-400">Account</th>
                  <th className="text-right py-4 px-6 font-semibold text-xs uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleStyle = ROLE_STYLES[user.role_id] || ROLE_STYLES[3];
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors last:border-0"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {getInitials(user.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{user.username}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <Mail size={11} className="shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={user.role_id}
                          onChange={(e) => handleRoleChangeInitiate(user.id, user.username, parseInt(e.target.value))}
                          disabled={isUpdatingRole}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-transparent border focus:outline-none focus:border-primary cursor-pointer ${roleStyle.select}`}
                        >
                          <option value="1" className="bg-gray-900 text-red-400">Admin</option>
                          <option value="2" className="bg-gray-900 text-green-400">Instructor</option>
                          <option value="3" className="bg-gray-900 text-blue-400">User</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-accent font-semibold">{user.total_points}</span>
                      </td>
                      <td className="py-4 px-4">
                        {user.is_premium ? (
                          <div className="space-y-1.5 min-w-[160px]">
                            <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 w-fit px-2.5 py-1 rounded-full font-semibold text-xs border border-yellow-500/20">
                              <Crown size={12} /> Premium
                            </span>
                            {user.premium_code && (
                              <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">Upgrade code</p>
                                <p
                                  className="font-mono text-[11px] text-yellow-300/90 bg-black/40 border border-gray-800 rounded px-2 py-1 break-all cursor-help"
                                  title={`Code: ${user.premium_code}`}
                                >
                                  {user.premium_code}
                                </p>
                              </div>
                            )}
                            {user.code_expires_at && (
                              <p className="text-[10px] text-gray-500">
                                Expires: {new Date(user.code_expires_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs font-medium">Free</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[user.status] || ""}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 justify-end flex-wrap">
                          {user.status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Approve user"
                            >
                              Approve
                            </button>
                          )}
                          {user.status === 'pending' && (
                            <button
                              onClick={() => setRejectUser({ userId: user.id, username: user.username })}
                              className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Reject user"
                            >
                              <Ban size={12} />
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => setResetPasswordUserId(user.id)}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Reset password"
                          >
                            <KeyRound size={12} />
                            Reset
                          </button>
                          {user.is_premium && (
                            <button
                              onClick={() => handleRevokePremium(user.id)}
                              disabled={isRevokingPremium}
                              className="px-3 py-1.5 bg-orange-600/20 text-orange-400 hover:bg-orange-600/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Revoke premium access"
                            >
                              {isRevokingPremium ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />
                                  Revoking...
                                </>
                              ) : (
                                <>
                                  <Crown size={12} />
                                  Revoke
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="px-3 py-1.5 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Delete user"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-16 bg-gray-900/30">
              <User className="mx-auto mb-3 text-gray-700" size={48} />
              <p className="text-gray-500 text-sm">No users found</p>
              {(searchQuery || roleFilter || statusFilter) && (
                <p className="text-gray-600 text-xs mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<React.ReactNode[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push(<span key={`e-${p}`} className="text-gray-600 px-1">...</span>);
                }
                acc.push(
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p === currentPage
                        ? "bg-primary text-background shadow-glow-primary"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                );
                return acc;
              }, [])}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
            disabled={currentPage === pagination.totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#11161c] rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Password</h3>
                <p className="text-sm text-gray-400">
                  User: <span className="font-semibold text-white">{users.find((u) => u.id === resetPasswordUserId)?.username}</span>
                </p>
              </div>
            </div>
            <input
              type="password"
              placeholder="New password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary mb-2"
              onKeyPress={(e) =>
                e.key === "Enter" && handleResetPassword(resetPasswordUserId)
              }
            />
            <p className="text-xs text-gray-500 mb-4">Minimum 6 characters</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResetPassword(resetPasswordUserId)}
                disabled={isResettingPassword}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Reset Password
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setResetPasswordUserId(null);
                  setResetPasswordValue("");
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
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
          <div className="bg-[#11161c] rounded-2xl p-6 max-w-md w-full mx-4 border border-red-500/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <Ban size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reject User</h3>
                <p className="text-sm text-gray-400">
                  Rejecting <span className="font-semibold text-white">{rejectUser.username}</span>
                </p>
              </div>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 mb-2 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mb-4">The reason will be included in the notification email.</p>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={mainLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {mainLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Confirm Reject"
                )}
              </button>
              <button
                onClick={() => {
                  setRejectUser(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
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
          <div className={`bg-[#11161c] rounded-2xl p-6 max-w-md w-full mx-4 border shadow-2xl ${roleToUpdate.newRoleId === 1 ? 'border-red-500/50 shadow-glow-primary' : 'border-gray-700'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl border ${roleToUpdate.newRoleId === 1 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                {roleToUpdate.newRoleId === 1 ? <ShieldCheck size={22} /> : <User size={22} />}
              </div>
              <h3 className="text-lg font-bold text-white">Change User Role</h3>
            </div>

            <div className="space-y-4 mb-6">
              {roleToUpdate.newRoleId === 1 ? (
                <>
                  {roleToUpdate.step === 1 ? (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                      <p className="text-red-400 font-bold mb-2 text-xs flex items-center gap-2 uppercase tracking-wider">
                        <ShieldCheck size={14} /> Security Warning
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        You are about to grant <span className="text-white font-bold">Admin</span> access to <span className="text-primary font-bold">{roleToUpdate.username}</span>. 
                        Admin users have complete control over the system, including deleting users and modifying configurations.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                      <p className="text-white font-bold mb-1">Final Confirmation Required</p>
                      <p className="text-sm text-gray-400">
                        Please confirm that you definitely want to promote <span className="text-white font-medium">{roleToUpdate.username}</span> to Administrator.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-300">
                  Are you sure you want to change the role of <span className="text-primary font-bold">{roleToUpdate.username}</span> to 
                  <span className="text-white font-bold ml-1">
                    {roleToUpdate.newRoleId === 2 ? "Instructor" : "User"}
                  </span>?
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRoleChangeConfirm}
                className={`flex-1 px-4 py-2.5 rounded-lg font-bold transition-all ${
                  roleToUpdate.newRoleId === 1 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-primary hover:brightness-110 text-black'
                }`}
              >
                {roleToUpdate.newRoleId === 1 && roleToUpdate.step === 1 ? "I Understand, Proceed" : "Confirm Change"}
              </button>
              <button
                onClick={() => setRoleToUpdate(null)}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-colors"
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

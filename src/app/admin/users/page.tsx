"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { KeyRound, Trash2, Loader2, Crown, User } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { UserWithPremium, Message, PaginationInfo } from "@/lib/admin-types";
import { useMessage, useLoading, usePagination } from "@/lib/admin-hooks";

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
  const { message, showMessage } = useMessage();
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
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
        `/api/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&status=${statusFilter}&page=${currentPage}&limit=10`
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
      showMessage("error", error.message);
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
      showMessage("success", `Role updated for ${username}`);
      fetchUsers();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleStatusUpdate = async (userId: number, newStatus: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${newStatus} this user?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${newStatus} user`);
      }
      showMessage("success", `User ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`);
      fetchUsers();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePremium = async (userId: number) => {
    if (!confirm("Revoke premium access for this user?")) return;
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
      showMessage("success", "Premium access revoked");
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setIsRevokingPremium(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!resetPasswordValue.trim()) {
      showMessage("error", "Password cannot be empty");
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
      showMessage("success", "Password reset successfully");
      setResetPasswordUserId(null);
      setResetPasswordValue("");
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u.id !== userId));
      showMessage("success", "User deleted successfully");
    } catch (error: any) {
      showMessage("error", error.message);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Users"
        icon={<span>👥</span>}
        count={pagination?.totalCount || 0}
      />

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
          >
            <option value="">All Roles</option>
            <option value="1">Admin</option>
            <option value="2">Instructor</option>
            <option value="3">User</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          <span className="text-lg">{message.type === "success" ? "✓" : "✕"}</span>
          {message.text}
        </div>
      )}

      {/* Users table */}
      {mainLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold">Username</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Points</th>
                  <th className="text-left py-3 px-4 font-semibold">Premium</th>
                  <th className="text-left py-3 px-4 font-semibold">Account</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{user.username}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{user.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={user.role_id}
                        onChange={(e) => handleRoleChangeInitiate(user.id, user.username, parseInt(e.target.value))}
                        disabled={isUpdatingRole}
                        className={`px-2 py-1 rounded text-xs font-semibold bg-transparent border border-gray-700 focus:outline-none focus:border-primary ${
                          user.role_id === 1
                            ? "text-red-400 border-red-500/30"
                            : user.role_id === 2
                            ? "text-green-400 border-green-500/30"
                            : "text-blue-400 border-blue-500/30"
                        }`}
                      >
                        <option value="1" className="bg-gray-900">Admin</option>
                        <option value="2" className="bg-gray-900">Instructor</option>
                        <option value="3" className="bg-gray-900">User</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono text-accent font-semibold">{user.total_points}</td>
                    <td className="py-3 px-4">
                      {user.is_premium ? (
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 w-fit px-2 py-1 rounded font-semibold text-xs">
                            <Crown size={14} /> Premium
                          </span>
                          {user.code_expires_at && (
                            <p className="text-gray-500 text-xs">
                              Expires: {new Date(user.code_expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs font-medium">Free</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        user.status === 'approved' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : user.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 flex-wrap">
                        {user.status !== 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(user.id, 'approved')}
                            className="px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Approve user"
                          >
                            Approve
                          </button>
                        )}
                        {user.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(user.id, 'rejected')}
                            className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Reject user"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => setResetPasswordUserId(user.id)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Reset password"
                        >
                          <KeyRound size={12} />
                          Reset
                        </button>
                        {user.is_premium && (
                          <button
                            onClick={() => handleRevokePremium(user.id)}
                            disabled={isRevokingPremium}
                            className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
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
                          className="px-3 py-1 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Delete user"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <p className="text-center text-gray-400 mt-4">No users found</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-400">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Reset Password</h3>
            <p className="text-gray-400 text-sm mb-4">
              User: <span className="font-semibold">{users.find((u) => u.id === resetPasswordUserId)?.username}</span>
            </p>
            <input
              type="password"
              placeholder="New password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-primary mb-2"
              onKeyPress={(e) =>
                e.key === "Enter" && handleResetPassword(resetPasswordUserId)
              }
            />
            <p className="text-xs text-gray-500 mb-4">Minimum 6 characters</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleResetPassword(resetPasswordUserId)}
                disabled={isResettingPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
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
          <div className={`bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border ${roleToUpdate.newRoleId === 1 ? 'border-red-500/50 shadow-glow-red' : 'border-gray-700 shadow-xl'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${roleToUpdate.newRoleId === 1 ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                {roleToUpdate.newRoleId === 1 ? <Crown size={24} /> : <User size={24} />}
              </div>
              <h3 className="text-xl font-bold">Change User Role</h3>
            </div>

            <div className="space-y-4 mb-6">
              {roleToUpdate.newRoleId === 1 ? (
                <>
                  {roleToUpdate.step === 1 ? (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 font-bold mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
                        ⚠️ Security Warning
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        You are about to grant <span className="text-white font-bold">Admin</span> access to <span className="text-primary font-bold">{roleToUpdate.username}</span>. 
                        Admin users have complete control over the system, including deleting users and modifying configurations.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
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
                className={`flex-1 px-4 py-2.5 rounded font-bold transition-all ${
                  roleToUpdate.newRoleId === 1 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20' 
                    : 'bg-primary hover:bg-primary-dark text-black'
                }`}
              >
                {roleToUpdate.newRoleId === 1 && roleToUpdate.step === 1 ? "I Understand, Proceed" : "Confirm Change"}
              </button>
              <button
                onClick={() => setRoleToUpdate(null)}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded font-bold hover:bg-gray-600 transition-colors"
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

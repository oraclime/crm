import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lock,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { CrmUser, UserRole } from '../types/crm';

export const UserManagementModule: React.FC = () => {
  const {
    currentUser,
    users,
    activeLeads,
    activityLogs,
    createUserAccount,
    updateUserAccount,
    adminResetUserPassword,
    adminDeleteUserAccount,
  } = useCrm();

  // Add New User Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'Deactivated'>('Active');
  const [assignedManagerId, setAssignedManagerId] = useState('usr-mgr-1');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('New Delhi');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<CrmUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STAFF');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState<CrmUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetStatusMsg, setResetStatusMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // User Activity Drawer/Modal State
  const [activityTargetUser, setActivityTargetUser] = useState<CrmUser | null>(null);

  // Delete User Account Confirmation Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<CrmUser | null>(null);
  const [deleteLeadHandling, setDeleteLeadHandling] = useState<'unassign' | 'reassign'>('unassign');
  const [deleteReassignToName, setDeleteReassignToName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Strict Admin-Only Guard
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">
          Restricted Administrator Module
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Only users with the verified database role <strong>ADMIN</strong> can access the User Management System. Managers and Staff cannot create, edit, or delete user accounts.
        </p>
      </div>
    );
  }

  const managerUsers = users.filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN');
  const activeAdminCount = users.filter((u) => u.role === 'ADMIN' && u.active).length;

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Full Name and Email Address are required.');
      return;
    }
    if (initialPassword.length < 6) {
      setFormError('Initial Password must be at least 6 characters long.');
      return;
    }
    if (initialPassword !== confirmPassword) {
      setFormError('Initial Password and Confirm Password do not match.');
      return;
    }

    const res = createUserAccount({
      name: fullName.trim(),
      email: email.trim(),
      passwordPlain: initialPassword,
      role,
      phone: phone.trim() || '+91 98100 00000',
      city: city.trim() || 'New Delhi',
      assignedManagerId: role === 'STAFF' ? assignedManagerId : '',
      active: accountStatus === 'Active',
    });

    if (!res.ok) {
      setFormError(res.error || 'Failed to create user account.');
      return;
    }

    setFormSuccess(
      `Successfully created ${role} account for ${fullName.trim()} (${email.trim()}). Password has been cryptographically hashed.`
    );
    setFullName('');
    setEmail('');
    setInitialPassword('');
    setConfirmPassword('');
    setPhone('');
  };

  const openEditModal = (u: CrmUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPhone(u.phone);
    setEditCity(u.city);
    setEditManagerId(u.assignedManagerId || '');
    setEditActive(u.active);
    setEditError(null);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    const res = updateUserAccount(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      phone: editPhone.trim(),
      city: editCity.trim(),
      assignedManagerId: editRole === 'STAFF' ? editManagerId : '',
      active: editActive,
    });

    if (!res.ok) {
      setEditError(res.error || 'Unable to update user details.');
      return;
    }
    setEditingUser(null);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetStatusMsg(null);

    if (newResetPassword.length < 6) {
      setResetStatusMsg({
        type: 'err',
        text: 'New password must be at least 6 characters.',
      });
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetStatusMsg({
        type: 'err',
        text: 'New Password and Confirm Password do not match.',
      });
      return;
    }

    const res = adminResetUserPassword(resetTargetUser.id, newResetPassword);
    if (!res.ok) {
      setResetStatusMsg({
        type: 'err',
        text: res.error || 'Password reset failed.',
      });
      return;
    }

    setResetStatusMsg({
      type: 'ok',
      text: `Password reset and hashed for ${resetTargetUser.name}.`,
    });
    setNewResetPassword('');
    setConfirmResetPassword('');
  };

  const openDeleteModal = (u: CrmUser) => {
    setDeleteTargetUser(u);
    setDeleteError(null);
    setDeleteLeadHandling('unassign');
    const replacementCandidates = users.filter((item) => item.id !== u.id && item.active);
    setDeleteReassignToName(replacementCandidates[0]?.name || '');
  };

  const handleConfirmDeleteAccount = () => {
    if (!deleteTargetUser) return;
    setDeleteError(null);
    setFormError(null);

    const res = adminDeleteUserAccount(deleteTargetUser.id, {
      leadHandling: deleteLeadHandling,
      reassignToUserName:
        deleteLeadHandling === 'reassign' ? deleteReassignToName : undefined,
    });

    if (!res.ok) {
      setDeleteError(res.error || 'Unable to delete user account.');
      return;
    }

    const affected = res.affectedLeadsCount ?? 0;
    const handlingNote =
      affected > 0
        ? deleteLeadHandling === 'reassign' && deleteReassignToName
          ? `${affected} assigned lead(s) reassigned to ${deleteReassignToName}.`
          : `${affected} assigned lead(s) safely unassigned and available for reassignment.`
        : 'All existing CRM leads remain untouched.';

    setFormSuccess(
      `Deleted user account "${deleteTargetUser.name}" (${deleteTargetUser.email}, Role: ${deleteTargetUser.role}). Active login access revoked and audit log recorded. ${handlingNote}`
    );
    setDeleteTargetUser(null);
  };

  const userActivityEntries = activityTargetUser
    ? activityLogs.filter(
        (log) =>
          log.performedBy.toLowerCase() === activityTargetUser.name.toLowerCase() ||
          log.createdByUid === activityTargetUser.uid ||
          log.details.toLowerCase().includes(activityTargetUser.email.toLowerCase())
      )
    : [];

  const deleteTargetAssignedLeadsCount = deleteTargetUser
    ? activeLeads.filter(
        (l) =>
          l.assignedStaff.toLowerCase() === deleteTargetUser.name.toLowerCase() ||
          l.assignedManager.toLowerCase() === deleteTargetUser.name.toLowerCase()
      ).length
    : 0;

  const isDeletingSelf =
    deleteTargetUser &&
    (deleteTargetUser.id === currentUser.id ||
      deleteTargetUser.email.toLowerCase() === currentUser.email.toLowerCase());

  const isDeletingLastAdmin =
    deleteTargetUser &&
    deleteTargetUser.role === 'ADMIN' &&
    deleteTargetUser.active &&
    activeAdminCount <= 1;

  const replacementUsersForDelete = deleteTargetUser
    ? users.filter((u) => u.id !== deleteTargetUser.id && u.active)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1F3A] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator-Only Access Control Module</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            ORA CRM User Management System
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Create Admin, Manager, and Staff accounts, assign roles, hash passwords, prevent duplicate email accounts, and manage or delete user accounts safely.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs shrink-0">
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500">Total Users</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {users.length}
            </div>
          </div>
          <div className="px-3.5 py-2 bg-emerald-50/60 border border-emerald-200 rounded-lg">
            <div className="text-emerald-800">Active Accounts</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-900">
              {users.filter((u) => u.active).length}
            </div>
          </div>
          <div className="px-3.5 py-2 bg-red-50/60 border border-red-200 rounded-lg">
            <div className="text-red-800">Deactivated</div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-900">
              {users.filter((u) => !u.active).length}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: New User Creation Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#0B1F3A]" />
            <h3 className="text-base font-bold text-slate-900">
              Add New User Account
            </h3>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Passwords are automatically hashed before storage
          </span>
        </div>

        {formError && (
          <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form
          onSubmit={handleCreateUserSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Suresh Nair"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="suresh.nair@oraclime.in"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              User Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-[#0B1F3A]"
            >
              <option value="STAFF">STAFF</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Account Status *
            </label>
            <select
              value={accountStatus}
              onChange={(e) =>
                setAccountStatus(e.target.value as 'Active' | 'Deactivated')
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Manager (Optional / For Staff)
            </label>
            <select
              value={assignedManagerId}
              onChange={(e) => setAssignedManagerId(e.target.value)}
              disabled={role !== 'STAFF'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- Direct to Admin --</option>
              {managerUsers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.name} ({mgr.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98100..."
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New Delhi"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              After creation, the user can immediately sign in from the ORA CRM Login screen and will be routed to their assigned <strong>{role}</strong> dashboard.
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create User Account
            </button>
          </div>
        </form>
      </section>

      {/* Registered ORA CRM User Accounts & Administrative Controls Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Registered ORA CRM User Accounts ({users.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage roles, activate or deactivate login access, reset passwords, edit user profiles, audit activity, or delete user accounts.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-3">Full Name & Email</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Assigned Manager</th>
                <th className="py-3 px-3">City & Phone</th>
                <th className="py-3 px-3">Leads</th>
                <th className="py-3 px-3">Created Date</th>
                <th className="py-3 px-3">Last Login</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const mgr = users.find((m) => m.id === u.assignedManagerId);
                const assignedCount = activeLeads.filter(
                  (l) =>
                    l.assignedStaff.toLowerCase() === u.name.toLowerCase() ||
                    l.assignedManager.toLowerCase() === u.name.toLowerCase()
                ).length;
                const isSelfRow =
                  u.id === currentUser.id ||
                  u.email.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isSelfRow && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateUserAccount(u.id, {
                            role: e.target.value as UserRole,
                          })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-[#0B1F3A] cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {u.role === 'STAFF'
                        ? mgr?.name || 'Direct to Admin'
                        : '—'}
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-800">{u.city}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.phone}</div>
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums font-bold text-slate-800">
                      {assignedCount}
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => updateUserAccount(u.id, { active: !u.active })}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold cursor-pointer whitespace-nowrap ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                        title="Click to toggle Active / Deactivated status"
                      >
                        {u.active ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            <span>Deactivated</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Edit User Details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUser(u);
                            setNewResetPassword('');
                            setConfirmResetPassword('');
                            setResetStatusMsg(null);
                          }}
                          className="px-2 py-1 text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Reset User Password"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityTargetUser(u)}
                          className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="View User Activity History"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Activity</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(u)}
                          className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Details Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Edit User Details · {editingUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    User Role *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editActive ? 'Active' : 'Deactivated'}
                    onChange={(e) => setEditActive(e.target.value === 'Active')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {editRole === 'STAFF' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Manager
                  </label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Direct to Admin --</option>
                    {managerUsers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset User Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Reset Password · {resetTargetUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetStatusMsg && (
              <div
                className={`p-3 text-xs rounded-lg border ${
                  resetStatusMsg.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {resetStatusMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg font-semibold cursor-pointer"
                >
                  Update Hashed Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Activity History Modal */}
      {activityTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  User Activity Log · {activityTargetUser.name} ({activityTargetUser.role})
                </h3>
                <p className="text-xs text-slate-500">
                  Account Created:{' '}
                  {new Date(activityTargetUser.createdAt).toLocaleDateString('en-IN')} · Last Login:{' '}
                  {activityTargetUser.lastLoginAt
                    ? new Date(activityTargetUser.lastLoginAt).toLocaleString('en-IN')
                    : 'Never'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivityTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {userActivityEntries.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  No recorded CRM activities yet for {activityTargetUser.name}.
                </div>
              ) : (
                userActivityEntries.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1F3A]">{act.actionType}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(act.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-700">{act.details}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActivityTargetUser(null)}
                className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete User Account
                  </h3>
                  <p className="text-xs font-semibold text-red-700 mt-0.5">
                    Are you sure you want to delete this user account?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Account Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">User Full Name:</span>
                <span className="font-bold text-slate-900">{deleteTargetUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-mono text-slate-800">{deleteTargetUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-bold text-[#0B1F3A]">{deleteTargetUser.role}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">Assigned Showroom Leads:</span>
                <span className="font-mono font-bold text-slate-900">
                  {deleteTargetAssignedLeadsCount} lead(s)
                </span>
              </div>
            </div>

            {/* Security Protection Warnings */}
            {(isDeletingSelf || isDeletingLastAdmin) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Protected Admin Account</div>
                  <p className="mt-0.5">
                    {isDeletingSelf
                      ? 'You cannot delete your own currently logged-in account.'
                      : 'Cannot delete the last active ADMIN account in ORA CRM.'}
                  </p>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {deleteError}
              </div>
            )}

            {/* Safe Lead Assignment Handling (When user is eligible for deletion) */}
            {!isDeletingSelf && !isDeletingLastAdmin && (
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-slate-700 leading-relaxed">
                  <strong>Lead & Audit Safety:</strong> Deleting this user revokes their login access and removes their CRM profile, while keeping all showroom leads, follow-ups, and audit history 100% intact.
                </div>

                {deleteTargetAssignedLeadsCount > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <label className="block font-semibold text-slate-800">
                      How should {deleteTargetAssignedLeadsCount} assigned lead(s) be handled?
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="leadHandling"
                          checked={deleteLeadHandling === 'unassign'}
                          onChange={() => setDeleteLeadHandling('unassign')}
                        />
                        <span>
                          Unassign affected leads (keep leads available for reassignment)
                        </span>
                      </label>
                      {replacementUsersForDelete.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="leadHandling"
                            checked={deleteLeadHandling === 'reassign'}
                            onChange={() => setDeleteLeadHandling('reassign')}
                          />
                          <span>Reassign affected leads to another active team member</span>
                        </label>
                      )}
                    </div>

                    {deleteLeadHandling === 'reassign' &&
                      replacementUsersForDelete.length > 0 && (
                        <div className="pt-1">
                          <select
                            value={deleteReassignToName}
                            onChange={(e) => setDeleteReassignToName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                          >
                            {replacementUsersForDelete.map((candidate) => (
                              <option key={candidate.id} value={candidate.name}>
                                {candidate.name} ({candidate.role} · {candidate.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(isDeletingSelf || isDeletingLastAdmin)}
                onClick={handleConfirmDeleteAccount}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

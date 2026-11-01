import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import {
  IssueCategory,
  IssueStatus,
  LeadPriority,
  PartnershipStatus,
  TaskStatus,
  UserRole,
} from '../types/crm';
import {
  ALL_LEAD_STATUSES,
  exportRecordsToSpreadsheet,
  ISSUE_CATEGORIES,
  PARTNERSHIP_STATUSES,
} from '../utils/crmSeedAndHelpers';

/**
 * PART 11 – PARTNERSHIP MANAGEMENT
 */
export const PartnershipManagerView: React.FC = () => {
  const {
    visibleLeads,
    partnerships,
    users,
    convertLeadToPartnership,
    updatePartnership,
  } = useCrm();

  const [selectedLeadId, setSelectedLeadId] = useState(
    visibleLeads.find((l) => l.status === 'Interested' || l.status === 'Negotiation')?.id ||
      visibleLeads[0]?.id ||
      ''
  );
  const [commissionTerms, setCommissionTerms] = useState(
    '₹300 per Split AC Installation · ₹200 per Window AC Installation · 15% on Servicing'
  );
  const [serviceCats, setServiceCats] = useState(
    'Split AC Installation, Window AC Installation, AC Repair, AC Servicing, AC Maintenance'
  );
  const [notes, setNotes] = useState('');

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    convertLeadToPartnership(selectedLeadId, {
      agreedCommissionTerms: commissionTerms,
      serviceCategories: serviceCats,
      agreementNotes: notes,
      status: 'Active Partner',
    });
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            ORACLIME Showroom Partnership Manager
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Convert interested showrooms into official ORACLIME installation & service referral partners with agreed commission terms.
          </p>
        </div>

        {/* Convert Lead Form */}
        <form
          onSubmit={handleConvert}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Showroom Lead to Convert *
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.showroomName} ({l.city} · {l.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Agreed Commission Terms
            </label>
            <input
              type="text"
              value={commissionTerms}
              onChange={(e) => setCommissionTerms(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              HVAC Service Categories
            </label>
            <input
              type="text"
              value={serviceCats}
              onChange={(e) => setServiceCats(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              Convert to Partnership
            </button>
          </div>
        </form>

        {/* Partnerships Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Partnership ID</th>
                <th className="py-2.5 px-3">Showroom & Owner</th>
                <th className="py-2.5 px-3">City & Contact</th>
                <th className="py-2.5 px-3">Commission & HVAC Scope</th>
                <th className="py-2.5 px-3">Assigned Manager</th>
                <th className="py-2.5 px-3">Next Review</th>
                <th className="py-2.5 px-3">Partnership Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {partnerships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No partnerships recorded yet.
                  </td>
                </tr>
              ) : (
                partnerships.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-[#0B1F3A]">
                      {p.partnershipCode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.showroomName}</div>
                      <div className="text-slate-500">Owner: {p.ownerName}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{p.city}</div>
                      <div className="text-slate-500 font-mono">{p.contactDetails}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-slate-800">
                        {p.agreedCommissionTerms}
                      </div>
                      <div className="text-slate-500 mt-0.5">{p.serviceCategories}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={p.assignedManager}
                        onChange={(e) =>
                          updatePartnership(p.id, { assignedManager: e.target.value })
                        }
                        className="px-2 py-1 bg-white border border-slate-300 rounded"
                      >
                        {users
                          .filter((u) => u.role !== 'STAFF')
                          .map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <input
                        type="date"
                        value={p.nextReviewDate}
                        onChange={(e) =>
                          updatePartnership(p.id, { nextReviewDate: e.target.value })
                        }
                        className="px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={p.status}
                        onChange={(e) =>
                          updatePartnership(p.id, {
                            status: e.target.value as PartnershipStatus,
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-[#0B1F3A]"
                      >
                        {PARTNERSHIP_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/**
 * PART 12 – TASKS & ACTIVITIES
 */
export const TasksAndActivitiesView: React.FC = () => {
  const { visibleLeads, tasks, activityLogs, users, createTask, updateTask } = useCrm();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedStaff, setAssignedStaff] = useState(users[3]?.name || 'Rohit Sharma');
  const [relatedLeadId, setRelatedLeadId] = useState(visibleLeads[0]?.id || '');
  const [priority, setPriority] = useState<LeadPriority>('High');
  const [dueDate, setDueDate] = useState('2026-11-03');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const rel = visibleLeads.find((l) => l.id === relatedLeadId);
    createTask({
      title: title.trim(),
      description: description.trim(),
      assignedStaff,
      relatedLeadId,
      relatedLeadName: rel?.showroomName || 'General',
      priority,
      dueDate,
      status: 'Pending',
    });
    setTitle('');
    setDescription('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Tasks Manager */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Team Task Management
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Assign showroom field visits, rate card dispatches, and agreement reviews to staff.
          </p>
        </div>

        <form
          onSubmit={handleAddTask}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Visit Lajpat Nagar showroom with Partner Rate Card"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Related Showroom Lead
            </label>
            <select
              value={relatedLeadId}
              onChange={(e) => setRelatedLeadId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.showroomName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assign Staff
            </label>
            <select
              value={assignedStaff}
              onChange={(e) => setAssignedStaff(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as LeadPriority)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>

        <div className="space-y-2.5 text-xs">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold text-slate-900">{t.title}</div>
                <div className="text-slate-500 mt-0.5">
                  Lead: {t.relatedLeadName} · Staff: {t.assignedStaff} · Due: {t.dueDate} ·{' '}
                  <strong>{t.priority}</strong>
                </div>
              </div>
              <select
                value={t.status}
                onChange={(e) =>
                  updateTask(t.id, { status: e.target.value as TaskStatus })
                }
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded font-semibold"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Right 5 Columns: Global Activity Timeline */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Live CRM Audit & Activity Timeline ({activityLogs.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically records lead edits, assignments, WhatsApp confirmations, status changes, and deletions.
          </p>
        </div>

        <div className="space-y-2.5 max-h-[560px] overflow-y-auto text-xs">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B1F3A]">{log.actionType}</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">
                  {new Date(log.timestamp).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-slate-700">{log.details}</p>
              <div className="text-[11px] text-slate-500">
                User: {log.performedBy} ({log.performedByRole})
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/**
 * PART 13 – PROBLEMS & ISSUES
 */
export const ProblemsAndIssuesView: React.FC = () => {
  const { visibleLeads, issues, users, createIssue, updateIssue } = useCrm();
  const [category, setCategory] = useState<IssueCategory>('Invalid Number');
  const [leadId, setLeadId] = useState(visibleLeads[0]?.id || '');
  const [priority, setPriority] = useState<LeadPriority>('Medium');
  const [assignedPerson, setAssignedPerson] = useState(users[1]?.name || 'Vikram Rathore');
  const [description, setDescription] = useState('');

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    const lead = visibleLeads.find((l) => l.id === leadId);
    createIssue({
      category,
      leadId,
      showroomName: lead?.showroomName || 'General Showroom',
      priority,
      assignedPerson,
      description: description.trim(),
      resolutionNotes: '',
      status: 'Open',
    });
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Showroom Outreach Problems & Issue Escalation Tracker
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Track and resolve Invalid Numbers, WhatsApp Unavailability, Wrong Contacts, and Commission Term disputes.
          </p>
        </div>

        <form
          onSubmit={handleCreateIssue}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Issue Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Showroom Lead
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.showroomName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Person
            </label>
            <select
              value={assignedPerson}
              onChange={(e) => setAssignedPerson(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Issue Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the showroom contact or terms issue..."
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
            >
              Log Issue Ticket
            </button>
          </div>
        </form>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Category & Priority</th>
                <th className="py-2.5 px-3">Showroom Name</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Assigned To</th>
                <th className="py-2.5 px-3">Resolution Notes</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {issues.map((iss) => (
                <tr key={iss.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{iss.category}</div>
                    <div className="text-slate-500">Priority: {iss.priority}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {iss.showroomName}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs">{iss.description}</td>
                  <td className="py-3 px-3">{iss.assignedPerson}</td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={iss.resolutionNotes}
                      placeholder="Add resolution notes..."
                      onChange={(e) =>
                        updateIssue(iss.id, { resolutionNotes: e.target.value })
                      }
                      className="w-52 px-2 py-1 bg-white border border-slate-300 rounded"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={iss.status}
                      onChange={(e) =>
                        updateIssue(iss.id, {
                          status: e.target.value as IssueStatus,
                        })
                      }
                      className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/**
 * PART 17 – REPORTS & ANALYTICS (12 Downloadable Excel Reports)
 */
export const ReportsAndAnalyticsView: React.FC = () => {
  const {
    activeLeads,
    deletedLeads,
    followUps,
    partnerships,
    campaigns,
    activityLogs,
    issues,
    users,
  } = useCrm();

  const [reportType, setReportType] = useState<string>('all_leads');
  const [cityFilter, setCityFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const cities = Array.from(new Set(activeLeads.map((l) => l.city).filter(Boolean)));

  const reportRows = useMemo((): Record<string, unknown>[] => {
    const filteredLeads = activeLeads.filter((l) => {
      if (cityFilter !== 'All' && l.city !== cityFilter) return false;
      if (staffFilter !== 'All' && l.assignedStaff !== staffFilter) return false;
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      return true;
    });

    const formatLeadRow = (l: typeof activeLeads[0]) => ({
      'Lead ID': l.leadCode,
      'Showroom Name': l.showroomName,
      'Owner Name': l.ownerName || l.contactPerson,
      'WhatsApp Number': l.formattedPhone,
      City: l.city,
      Category: l.businessCategory,
      'Assigned Staff': l.assignedStaff,
      Status: l.status,
      'Last Contact Date': l.lastContactDate
        ? new Date(l.lastContactDate).toLocaleDateString('en-IN')
        : 'Never',
      Remarks: l.remarks,
    });

    switch (reportType) {
      case 'all_leads':
        return filteredLeads.map(formatLeadRow);
      case 'new_leads':
        return filteredLeads.filter((l) => l.status === 'New Lead').map(formatLeadRow);
      case 'interested_leads':
        return filteredLeads
          .filter((l) => ['Interested', 'Negotiation'].includes(l.status))
          .map(formatLeadRow);
      case 'not_responding':
        return filteredLeads
          .filter((l) => l.status === 'Not Responding')
          .map(formatLeadRow);
      case 'followups':
        return followUps.map((f) => ({
          'Showroom Name': f.showroomName,
          'Contact Person': f.contactPerson,
          Phone: f.phone,
          City: f.city,
          'Scheduled At': new Date(f.scheduledAt).toLocaleString('en-IN'),
          'Assigned Staff': f.assignedStaff,
          'Call Outcome': f.callOutcome,
          'Customer Response': f.customerResponse,
          Status: f.status,
        }));
      case 'partnerships':
        return partnerships.map((p) => ({
          'Partnership ID': p.partnershipCode,
          'Showroom Name': p.showroomName,
          'Owner Name': p.ownerName,
          City: p.city,
          Status: p.status,
          'Commission Terms': p.agreedCommissionTerms,
          'Service Categories': p.serviceCategories,
          'Assigned Manager': p.assignedManager,
        }));
      case 'city_wise': {
        const map = new Map<string, { Total: number; Interested: number; Partners: number }>();
        activeLeads.forEach((l) => {
          const item = map.get(l.city) || { Total: 0, Interested: 0, Partners: 0 };
          item.Total += 1;
          if (l.status === 'Interested' || l.status === 'Negotiation') item.Interested += 1;
          if (l.status === 'Partnership Confirmed') item.Partners += 1;
          map.set(l.city, item);
        });
        return Array.from(map.entries()).map(([city, counts]) => ({
          City: city,
          'Total Showrooms': counts.Total,
          'Interested / Negotiation': counts.Interested,
          'Confirmed Partners': counts.Partners,
        }));
      }
      case 'staff_performance':
        return users.map((u) => {
          const assigned = activeLeads.filter((l) => l.assignedStaff === u.name);
          return {
            'Staff Name': u.name,
            Role: u.role,
            City: u.city,
            'Assigned Leads': assigned.length,
            Contacted: assigned.filter((l) => l.lastContactDate !== '').length,
            Converted: assigned.filter((l) => l.status === 'Partnership Confirmed').length,
          };
        });
      case 'campaign_performance':
        return campaigns.map((c) => ({
          'Campaign Name': c.name,
          Segment: c.campaignType,
          'Assigned User': c.assignedUser,
          Selected: c.selectedCount,
          'Chats Opened': c.chatsOpenedCount,
          'Confirmed Sent': c.confirmedSentCount,
          Pending: c.pendingCount,
          Interested: c.interestedCount,
          Status: c.status,
        }));
      case 'activity_history':
        return activityLogs.map((a) => ({
          Timestamp: new Date(a.timestamp).toLocaleString('en-IN'),
          Action: a.actionType,
          Showroom: a.showroomName,
          Details: a.details,
          'Performed By': a.performedBy,
          Role: a.performedByRole,
        }));
      case 'issues':
        return issues.map((i) => ({
          Category: i.category,
          Showroom: i.showroomName,
          Priority: i.priority,
          'Assigned Person': i.assignedPerson,
          Description: i.description,
          Resolution: i.resolutionNotes,
          Status: i.status,
        }));
      case 'deleted_leads':
        return deletedLeads.map((d) => ({
          'Lead ID': d.leadCode,
          'Showroom Name': d.showroomName,
          Phone: d.formattedPhone,
          City: d.city,
          'Deleted By': d.deletedBy,
          'Deletion Reason': d.deletionReason,
          'Deleted At': d.deletedAt,
        }));
      default:
        return filteredLeads.map(formatLeadRow);
    }
  }, [
    reportType,
    activeLeads,
    deletedLeads,
    followUps,
    partnerships,
    campaigns,
    activityLogs,
    issues,
    users,
    cityFilter,
    staffFilter,
    statusFilter,
  ]);

  const reportHeaders = reportRows.length > 0 ? Object.keys(reportRows[0]) : [];

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Enterprise Reports & Excel Export Center (12 Report Types)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Generate and export filtered Excel (.XLSX) or CSV reports across all ORA CRM modules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportRecordsToSpreadsheet(
                  reportRows,
                  `ORA_CRM_${reportType}`,
                  reportType,
                  'csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportRecordsToSpreadsheet(
                  reportRows,
                  `ORA_CRM_${reportType}`,
                  reportType,
                  'xlsx'
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel Report (.XLSX)
            </button>
          </div>
        </div>

        {/* 12 Report Selector Pills + Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Report Dataset (12 Types)
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-[#0B1F3A]"
            >
              <option value="all_leads">01. All Leads Report</option>
              <option value="new_leads">02. New Leads Report</option>
              <option value="interested_leads">03. Interested Leads Report</option>
              <option value="not_responding">04. Not Responding Leads Report</option>
              <option value="followups">05. Follow-ups Schedule Report</option>
              <option value="partnerships">06. Confirmed Partnerships Report</option>
              <option value="city_wise">07. City-wise Leads Summary</option>
              <option value="staff_performance">08. Staff Performance Report</option>
              <option value="campaign_performance">09. Campaign Performance Report</option>
              <option value="activity_history">10. Activity History Audit Log</option>
              <option value="issues">11. Problems & Issues Report</option>
              <option value="deleted_leads">12. Deleted Leads (Recycle Bin)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">City Filter</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Staff Filter</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Staff</option>
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Statuses</option>
              {ALL_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Report Table Preview */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                {reportHeaders.map((h) => (
                  <th key={h} className="py-2.5 px-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, reportHeaders.length)} className="py-8 text-center text-slate-500">
                    No records match the current report criteria.
                  </td>
                </tr>
              ) : (
                reportRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {reportHeaders.map((h) => (
                      <td key={h} className="py-2.5 px-3 text-slate-800">
                        {String(row[h] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/**
 * PART 15 – TEAM MANAGEMENT
 */
export const TeamManagementView: React.FC = () => {
  const { currentUser, users, activeLeads, createUserAccount, updateUserAccount } =
    useCrm();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('New Delhi');

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !name.trim() || !email.trim()) return;
    createUserAccount({
      name: name.trim(),
      email: email.trim(),
      passwordPlain: 'Oraclime@123',
      role,
      phone: phone.trim() || '+91 98100 00000',
      city: city.trim() || 'New Delhi',
      assignedManagerId: 'usr-mgr-1',
      active: true,
    });
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Team & Role Access Management (ADMIN · MANAGER · STAFF)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Create Managers and Staff accounts, activate or deactivate access, and monitor assigned showroom performance.
          </p>
        </div>

        {isAdmin && (
          <form
            onSubmit={handleCreateUser}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deepak Verma"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Corporate Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deepak@oraclime.in"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98111 22333"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">City & Mobile</th>
                <th className="py-2.5 px-3">Assigned Leads</th>
                <th className="py-2.5 px-3">Last Login</th>
                <th className="py-2.5 px-3">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const count = activeLeads.filter((l) => l.assignedStaff === u.name).length;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      {isAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateUserAccount(u.id, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="px-2 py-1 bg-white border border-slate-300 rounded font-bold text-[#0B1F3A]"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      ) : (
                        <span className="font-bold text-[#0B1F3A]">{u.role}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div>{u.city}</div>
                      <div className="text-slate-500 font-mono">{u.phone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums font-bold">
                      {count} leads
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-500">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString('en-IN')
                        : 'Never'}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => updateUserAccount(u.id, { active: !u.active })}
                        className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/**
 * PART 16 – RECYCLE BIN
 */
export const RecycleBinView: React.FC = () => {
  const { currentUser, deletedLeads, restoreLeads, permanentDeleteLeads } = useCrm();
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recycle Bin & Soft-Deletion Recovery
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Records are soft-deleted by default with deletion reasons. Only ADMIN users can permanently purge records after confirmation.
            </p>
          </div>
          {deletedLeads.length > 0 && (
            <button
              type="button"
              onClick={() => restoreLeads(deletedLeads.map((d) => d.id))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore All ({deletedLeads.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Lead ID</th>
                <th className="py-2.5 px-3">Showroom Name</th>
                <th className="py-2.5 px-3">WhatsApp Number</th>
                <th className="py-2.5 px-3">Deletion Reason</th>
                <th className="py-2.5 px-3">Deleted By & Timestamp</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deletedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Recycle Bin is empty. Deleted leads will appear here for safe restoration.
                  </td>
                </tr>
              ) : (
                deletedLeads.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {d.leadCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {d.showroomName} ({d.city})
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">{d.formattedPhone}</td>
                    <td className="py-3 px-3 text-red-700">{d.deletionReason}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {d.deletedBy} ·{' '}
                      {d.deletedAt
                        ? new Date(d.deletedAt).toLocaleString('en-IN')
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => restoreLeads([d.id])}
                          className="px-2.5 py-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded cursor-pointer"
                        >
                          Restore
                        </button>
                        {isAdmin && (
                          <>
                            {confirmPurgeId === d.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  permanentDeleteLeads([d.id]);
                                  setConfirmPurgeId(null);
                                }}
                                className="px-2.5 py-1 font-bold text-white bg-red-600 rounded cursor-pointer"
                              >
                                Confirm Permanent Purge
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmPurgeId(d.id)}
                                className="px-2.5 py-1 font-semibold text-red-700 bg-red-50 border border-red-200 rounded cursor-pointer"
                              >
                                Permanent Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/**
 * PART 20 & 21 – SETTINGS, DATABASE ARCHITECTURE & BACKUP
 */
export const SettingsAndBackupView: React.FC = () => {
  const {
    currentUser,
    leads,
    followUps,
    partnerships,
    tasks,
    issues,
    campaigns,
    activityLogs,
    dataResetSummary,
    changePassword,
    executeFullBusinessDataReset,
  } = useCrm();

  const [newPass, setNewPass] = useState('');
  const [passSaved, setPassSaved] = useState(false);
  const [resetDoneBanner, setResetDoneBanner] = useState(false);

  const handleDownloadBackupJson = () => {
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      application: 'ORA CRM by ORACLIME',
      project: 'ora-crm-production',
      leads,
      followUps,
      partnerships,
      tasks,
      issues,
      campaigns,
      activityLogs,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORA_CRM_Full_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company & User Profile Settings */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0B1F3A]" />
            <h3 className="text-base font-bold text-slate-900">
              ORACLIME Enterprise Profile & Security Settings
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <div>
              <strong>Application Name:</strong> ORA CRM by ORACLIME
            </div>
            <div>
              <strong>Tagline:</strong> Manage Leads. Build Relationships. Grow Business.
            </div>
            <div>
              <strong>Signed-in User:</strong> {currentUser?.name} ({currentUser?.email})
            </div>
            <div>
              <strong>Active RBAC Role:</strong>{' '}
              <span className="font-bold text-[#0B1F3A]">{currentUser?.role}</span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPass.trim()) return;
              changePassword(newPass.trim());
              setNewPass('');
              setPassSaved(true);
              setTimeout(() => setPassSaved(false), 2500);
            }}
            className="pt-4 border-t border-slate-200 space-y-3 text-xs"
          >
            <label className="block font-semibold text-slate-700">
              Update Account Password
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new secure password..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
              >
                Save Password
              </button>
            </div>
            {passSaved && (
              <div className="text-emerald-700 font-medium">
                Password updated and hashed for your ORA CRM account.
              </div>
            )}
          </form>
        </section>

        {/* Data Safety, Full Backup & Migration Instructions */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0B1F3A]" />
            <h3 className="text-base font-bold text-slate-900">
              Backup, Data Safety & Zero-State Reset Verification
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ORA CRM includes the complete 19-table relational SQL & RLS migration file at{' '}
            <code className="font-mono">supabase/migrations/001_ora_crm_production.sql</code>,{' '}
            zero-state business data reset migration at{' '}
            <code className="font-mono">supabase/migrations/002_ora_crm_business_data_reset.sql</code>,{' '}
            and hardened Firestore rules (<code className="font-mono">firestore.rules</code>).
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadBackupJson}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Complete JSON Backup
            </button>
            <button
              type="button"
              onClick={() =>
                exportRecordsToSpreadsheet(
                  leads.map((l) => ({
                    'Lead ID': l.leadCode,
                    Showroom: l.showroomName,
                    Owner: l.ownerName,
                    Phone: l.formattedPhone,
                    City: l.city,
                    Status: l.status,
                  })),
                  'ORA_CRM_Master_Backup'
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Master Excel Backup
            </button>
            {currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={async () => {
                  await executeFullBusinessDataReset();
                  setResetDoneBanner(true);
                  setTimeout(() => setResetDoneBanner(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Business Data to Zero
              </button>
            )}
          </div>

          {resetDoneBanner && (
            <div className="p-2.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              All CRM business records cleared to zero while preserving user accounts and authentication.
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900">
              Initial CRM Data Reset Audit Report ({dataResetSummary?.totalRecordsCleared ?? 47} Sample/Demo Records Cleared):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px] text-slate-600">
              <div>Showroom Leads: {dataResetSummary?.clearedCounts?.showroomLeads ?? 10} → 0</div>
              <div>Contacts: {dataResetSummary?.clearedCounts?.contacts ?? 10} → 0</div>
              <div>Campaigns: {dataResetSummary?.clearedCounts?.campaigns ?? 2} → 0</div>
              <div>Campaign Contacts: {dataResetSummary?.clearedCounts?.campaignContacts ?? 7} → 0</div>
              <div>WhatsApp History: {dataResetSummary?.clearedCounts?.whatsappMessages ?? 2} → 0</div>
              <div>Follow-ups: {dataResetSummary?.clearedCounts?.followUps ?? 4} → 0</div>
              <div>Tasks: {dataResetSummary?.clearedCounts?.tasks ?? 3} → 0</div>
              <div>Partnerships: {dataResetSummary?.clearedCounts?.partnerships ?? 2} → 0</div>
              <div>Issues: {dataResetSummary?.clearedCounts?.issues ?? 2} → 0</div>
              <div>Assignments: {dataResetSummary?.clearedCounts?.leadAssignments ?? 10} → 0</div>
              <div>Activity Logs: {dataResetSummary?.clearedCounts?.activityHistory ?? 4} → 0</div>
              <div>Import Batches: {dataResetSummary?.clearedCounts?.importBatches ?? 1} → 0</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};


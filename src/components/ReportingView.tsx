import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { FollowUpStatus, ShowroomContact } from '../types/outreach';
import { exportOutreachReport, FOLLOW_UP_STATUSES } from '../utils/phoneAndExcel';

interface ReportingViewProps {
  showrooms: ShowroomContact[];
}

export const ReportingView: React.FC<ReportingViewProps> = ({ showrooms }) => {
  const [filterFollowUp, setFilterFollowUp] = useState<FollowUpStatus | 'All'>('All');
  const [filterCampaign, setFilterCampaign] = useState<string>('All');

  const filteredReportRows = showrooms.filter((s) => {
    if (filterFollowUp !== 'All' && s.followUpStatus !== filterFollowUp) return false;
    if (filterCampaign !== 'All' && s.campaignStatus !== filterCampaign) return false;
    return true;
  });

  const confirmedPartners = showrooms.filter(
    (s) => s.followUpStatus === 'Partnership Confirmed'
  ).length;
  const interestedCount = showrooms.filter(
    (s) => s.followUpStatus === 'Interested'
  ).length;
  const actionRequiredCount = showrooms.filter(
    (s) =>
      s.followUpStatus === 'Call Required' || s.followUpStatus === 'Meeting Required'
  ).length;
  const totalContacted = showrooms.filter((s) => s.campaignStatus === 'Sent').length;

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              ORACLIME Showroom Partnership Outreach Reports
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Export complete Excel (.xlsx) or CSV reports containing Showroom Name, Contact Person, Mobile Number, City, Campaign Status, Follow-up Status, Notes, and Last Contact Date.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => exportOutreachReport(filteredReportRows, 'csv')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Filtered CSV ({filteredReportRows.length})
            </button>
            <button
              type="button"
              onClick={() => exportOutreachReport(filteredReportRows, 'xlsx')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel Report (.XLSX)
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="pt-3 sm:pt-0 sm:px-4 first:pl-0">
            <div className="text-xs text-slate-500">Total Showrooms Contacted</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalContacted}{' '}
              <span className="text-xs font-normal text-slate-500">
                / {showrooms.length}
              </span>
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Partnership Confirmed</div>
            <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {confirmedPartners}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Interested Showrooms</div>
            <div className="text-2xl font-bold text-[#0B1F3A] font-mono tabular-nums mt-1">
              {interestedCount}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Call / Meeting Required</div>
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
              {actionRequiredCount}
            </div>
          </div>
        </div>

        {/* Report Filter Controls */}
        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">
                Campaign Status:
              </label>
              <select
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              >
                <option value="All">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Skipped">Skipped</option>
                <option value="Invalid Number">Invalid Number</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">
                Follow-Up Status:
              </label>
              <select
                value={filterFollowUp}
                onChange={(e) =>
                  setFilterFollowUp(e.target.value as FollowUpStatus | 'All')
                }
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              >
                <option value="All">All Follow-Up States</option>
                {FOLLOW_UP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Showing {filteredReportRows.length} of {showrooms.length} records in report preview
          </div>
        </div>

        {/* Exact 8-Column Export Table Preview */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Showroom Name</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3">Mobile Number</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Campaign Status</th>
                <th className="py-2.5 px-3">Follow-up Status</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3">Last Contact Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredReportRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {row.showroomName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {row.contactPerson || 'Not Specified'}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900">
                    {row.formattedPhone || row.rawPhone}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{row.city}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {row.campaignStatus}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#0B1F3A]">
                    {row.followUpStatus}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={row.notes}>
                    {row.notes || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                    {row.lastContactDate
                      ? new Date(row.lastContactDate).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never Contacted'}
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

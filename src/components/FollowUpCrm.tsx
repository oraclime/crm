import React, { useState } from 'react';
import {
  ExternalLink,
  Search,
  Wrench,
} from 'lucide-react';
import {
  FollowUpStatus,
  HvacServiceScope,
  ShowroomContact,
} from '../types/outreach';
import {
  buildOfficialWhatsAppUrl,
  FOLLOW_UP_STATUSES,
  personalizeShowroomMessage,
} from '../utils/phoneAndExcel';

interface FollowUpCrmProps {
  showrooms: ShowroomContact[];
  messageTemplate: string;
  useWhatsAppWebUrl: boolean;
  onUpdateShowroom: (id: string, patch: Partial<ShowroomContact>) => void;
}

const HVAC_SERVICES: HvacServiceScope[] = [
  'Split AC Installation',
  'Window AC Installation',
  'AC Repair',
  'AC Servicing',
  'AC Maintenance',
];

const QUICK_NOTE_SNIPPETS = [
  'Sent ORACLIME Split & Window AC installation partner payout chart.',
  'Owner interested in referring summer Split AC installations.',
  'Call required tomorrow at 11:30 AM with showroom owner.',
  'Showroom meeting required to sign dealer referral agreement.',
  'Partnership confirmed — assigned dedicated ORACLIME service technician.',
];

export const FollowUpCrm: React.FC<FollowUpCrmProps> = ({
  showrooms,
  messageTemplate,
  useWhatsAppWebUrl,
  onUpdateShowroom,
}) => {
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'All'>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNoteShowroomId, setActiveNoteShowroomId] = useState<string>(
    showrooms[0]?.id || ''
  );

  const uniqueCities = Array.from(
    new Set(showrooms.map((s) => s.city.trim()).filter(Boolean))
  );

  const filteredShowrooms = showrooms.filter((s) => {
    if (statusFilter !== 'All' && s.followUpStatus !== statusFilter) return false;
    if (cityFilter !== 'All' && s.city !== cityFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.showroomName.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.formattedPhone.toLowerCase().includes(q) ||
      s.notes.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  const selectedShowroom =
    showrooms.find((s) => s.id === activeNoteShowroomId) ||
    filteredShowrooms[0] ||
    showrooms[0];

  const handleToggleHvacService = (showroom: ShowroomContact, service: HvacServiceScope) => {
    const exists = showroom.interestedServices.includes(service);
    const updated = exists
      ? showroom.interestedServices.filter((item) => item !== service)
      : [...showroom.interestedServices, service];
    onUpdateShowroom(showroom.id, { interestedServices: updated });
  };

  return (
    <div className="space-y-8">
      {/* Follow-Up Pipeline Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Showroom Follow-Up & Dealer Partnership CRM
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Track showroom responses, schedule dealer calls or visits, log HVAC service referral scope, and record personal partnership notes.
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Confirmed Partners:{' '}
            <strong className="text-emerald-700">
              {showrooms.filter((s) => s.followUpStatus === 'Partnership Confirmed').length}
            </strong>{' '}
            · Interested / Action Needed:{' '}
            <strong className="text-[#0B1F3A]">
              {
                showrooms.filter((s) =>
                  ['Interested', 'Call Required', 'Meeting Required'].includes(
                    s.followUpStatus
                  )
                ).length
              }
            </strong>
          </div>
        </div>

        {/* Interactive Follow-Up Status Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'All'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({showrooms.length})
          </button>
          {FOLLOW_UP_STATUSES.map((status) => {
            const count = showrooms.filter((s) => s.followUpStatus === status).length;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-[#0B1F3A] font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & City Filter */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search showroom, owner, phone, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">City:</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            >
              <option value="All">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main 2-Column Follow-Up Table & Showroom Note Inspector */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Follow-Up Table */}
          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Showroom & Contact</th>
                  <th className="py-2.5 px-3">WhatsApp Mobile</th>
                  <th className="py-2.5 px-3">Follow-Up Status</th>
                  <th className="py-2.5 px-3">Personal Notes</th>
                  <th className="py-2.5 px-3 text-right">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredShowrooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No showrooms match the selected follow-up filter.
                    </td>
                  </tr>
                ) : (
                  filteredShowrooms.map((item) => {
                    const isSelected = selectedShowroom?.id === item.id;
                    const personalizedMsg = personalizeShowroomMessage(
                      messageTemplate,
                      item
                    );
                    const waUrl = buildOfficialWhatsAppUrl(
                      item.normalizedPhone,
                      personalizedMsg,
                      useWhatsAppWebUrl
                    );

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setActiveNoteShowroomId(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">
                            {item.showroomName}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            <span>{item.contactPerson || 'Owner'}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{item.city}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-800">
                          {item.formattedPhone}
                        </td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={item.followUpStatus}
                            onChange={(e) =>
                              onUpdateShowroom(item.id, {
                                followUpStatus: e.target.value as FollowUpStatus,
                                lastContactDate:
                                  item.lastContactDate || new Date().toISOString(),
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                          >
                            {FOLLOW_UP_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 max-w-[200px]">
                          {item.notes ? (
                            <p className="text-slate-700 truncate" title={item.notes}>
                              {item.notes}
                            </p>
                          ) : (
                            <span className="text-slate-400">Click to add note...</span>
                          )}
                        </td>
                        <td
                          className="py-3 px-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.isValidPhone ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0B1F3A] bg-white hover:bg-slate-100 border border-slate-300 rounded-md"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Chat
                            </a>
                          ) : (
                            <span className="text-red-600 text-[11px]">Invalid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right 5 Columns: Selected Showroom Detail & Personal Notes Editor */}
          {selectedShowroom && (
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="pb-3 border-b border-slate-200">
                <div className="text-xs font-medium text-slate-500">
                  Showroom Partnership Dossier
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedShowroom.showroomName}
                </h3>
                <div className="text-xs text-slate-600 mt-1">
                  <span>{selectedShowroom.contactPerson || 'No Owner Name'}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">
                    {selectedShowroom.formattedPhone}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{selectedShowroom.city}</span>
                </div>
              </div>

              {/* Follow-up Status Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Follow-Up Status
                </label>
                <select
                  value={selectedShowroom.followUpStatus}
                  onChange={(e) =>
                    onUpdateShowroom(selectedShowroom.id, {
                      followUpStatus: e.target.value as FollowUpStatus,
                      lastContactDate:
                        selectedShowroom.lastContactDate || new Date().toISOString(),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                >
                  {FOLLOW_UP_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* ORACLIME HVAC Service Referral Scope */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                  <Wrench className="w-3.5 h-3.5 text-[#0B1F3A]" />
                  <span>Target ORACLIME Referral Services</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HVAC_SERVICES.map((service) => {
                    const active = selectedShowroom.interestedServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleToggleHvacService(selectedShowroom, service)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Notes Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Personal Notes & Discussion Log
                  </label>
                  <span className="text-[11px] text-slate-400">Auto-saved locally</span>
                </div>
                <textarea
                  rows={5}
                  value={selectedShowroom.notes}
                  onChange={(e) =>
                    onUpdateShowroom(selectedShowroom.id, { notes: e.target.value })
                  }
                  placeholder="Add personal notes about owner discussion, referral commission rate, AC volume, or next visit date..."
                  className="w-full p-3 text-xs leading-relaxed bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />

                {/* Quick Note Snippets */}
                <div className="mt-2 space-y-1">
                  <div className="text-[11px] font-medium text-slate-500">
                    Quick Append Note:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_NOTE_SNIPPETS.map((snippet) => (
                      <button
                        key={snippet}
                        type="button"
                        onClick={() => {
                          const updatedNote = selectedShowroom.notes
                            ? `${selectedShowroom.notes.trim()} | ${snippet}`
                            : snippet;
                          onUpdateShowroom(selectedShowroom.id, { notes: updatedNote });
                        }}
                        className="text-left px-2 py-1 text-[11px] text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                      >
                        + {snippet}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

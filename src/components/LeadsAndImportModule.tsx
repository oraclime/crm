import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import {
  BusinessCategory,
  CrmLead,
  LeadPriority,
  LeadStageStatus,
} from '../types/crm';
import {
  ALL_LEAD_STATUSES,
  BUSINESS_CATEGORIES,
  exportRecordsToSpreadsheet,
  isSuspectedFakeLead,
  PIPELINE_ADDITIONAL_STATUSES,
  PIPELINE_MAIN_STAGES,
  validateAndFormatLeadPhone,
} from '../utils/crmSeedAndHelpers';
import {
  downloadSampleShowroomExcel,
  parseExcelOrCsvFile,
  SAMPLE_EXCEL_UPLOAD_ROWS,
} from '../utils/phoneAndExcel';

interface StagedImportRow {
  rowIndex: number;
  showroomName: string;
  ownerName: string;
  contactPerson: string;
  whatsappNumber: string;
  normalizedPhone: string;
  formattedPhone: string;
  isValidPhone: boolean;
  phoneReason: string;
  email: string;
  city: string;
  state: string;
  address: string;
  businessCategory: BusinessCategory;
  isDupInFile: boolean;
  isDupInDb: boolean;
  isSuspectedFake: boolean;
  fakeReason: string;
  selected: boolean;
}

export const LeadsManagerView: React.FC = () => {
  const {
    currentUser,
    visibleLeads,
    activeLeads,
    users,
    activityLogs,
    importBatches,
    createLead,
    updateLead,
    bulkAssignLeads,
    bulkUpdateLeadStatus,
    softDeleteLeads,
    importLeadsBatch,
    convertLeadToPartnership,
  } = useCrm();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sub-panel toggle: 'list' | 'import' | 'add'
  const [subMode, setSubMode] = useState<'list' | 'import' | 'add'>('list');

  // Search, Filters, Sorting, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'priority'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkManager, setBulkManager] = useState('');
  const [bulkStaff, setBulkStaff] = useState('');
  const [bulkStatus, setBulkStatus] = useState<LeadStageStatus | ''>('');
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Lead Dossier / Edit Drawer state
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // Add / Edit Form state
  const [formLead, setFormLead] = useState<Partial<CrmLead>>({
    showroomName: '',
    businessName: '',
    ownerName: '',
    contactPerson: '',
    whatsappNumber: '',
    alternativeNumber: '',
    email: '',
    city: 'New Delhi',
    state: 'Delhi',
    fullAddress: '',
    businessCategory: 'AC Showroom',
    leadSource: 'Manual Entry',
    assignedManager: 'Vikram Rathore',
    assignedStaff: 'Rohit Sharma',
    priority: 'Medium',
    status: 'New Lead',
    nextFollowUpDate: '',
    remarks: '',
  });

  // Excel Import State
  const [importFileName, setImportFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, unknown>[]>([]);
  const [colMap, setColMap] = useState({
    showroomName: '',
    ownerName: '',
    contactPerson: '',
    whatsappNumber: '',
    email: '',
    city: '',
    state: '',
    address: '',
    businessCategory: '',
  });
  const [stagedRows, setStagedRows] = useState<StagedImportRow[]>([]);
  const [importFilter, setImportFilter] = useState<
    'all' | 'valid' | 'dup_file' | 'dup_db' | 'invalid' | 'fake'
  >('all');
  const [importSummaryMsg, setImportSummaryMsg] = useState<string | null>(null);

  const canImport = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canAssign = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const uniqueCities = useMemo(
    () => Array.from(new Set(visibleLeads.map((l) => l.city).filter(Boolean))),
    [visibleLeads]
  );

  const filteredLeads = useMemo(() => {
    const list = visibleLeads.filter((l) => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (cityFilter !== 'All' && l.city !== cityFilter) return false;
      if (categoryFilter !== 'All' && l.businessCategory !== categoryFilter) return false;
      if (staffFilter !== 'All' && l.assignedStaff !== staffFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.leadCode.toLowerCase().includes(q) ||
        l.showroomName.toLowerCase().includes(q) ||
        l.businessName.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q) ||
        l.contactPerson.toLowerCase().includes(q) ||
        l.whatsappNumber.toLowerCase().includes(q) ||
        l.formattedPhone.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.showroomName.localeCompare(b.showroomName);
      if (sortBy === 'priority') {
        const order = { High: 1, Medium: 2, Low: 3 };
        return order[a.priority] - order[b.priority];
      }
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
  }, [visibleLeads, statusFilter, cityFilter, categoryFilter, staffFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Auto-detect columns and build staged rows
  const buildStagedImportRows = (
    rows: Record<string, unknown>[],
    mapping: typeof colMap
  ): StagedImportRow[] => {
    const existingPhones = new Set(
      activeLeads.map((l) => l.normalizedPhone).filter(Boolean)
    );
    const seenInFile = new Set<string>();

    // Support 5,000+ rows smoothly
    return rows.slice(0, 5000).map((row, idx) => {
      const showroomName = mapping.showroomName ? String(row[mapping.showroomName] ?? '').trim() : '';
      const ownerName = mapping.ownerName ? String(row[mapping.ownerName] ?? '').trim() : '';
      const contactPerson = mapping.contactPerson
        ? String(row[mapping.contactPerson] ?? '').trim()
        : ownerName;
      const rawPhone = mapping.whatsappNumber ? String(row[mapping.whatsappNumber] ?? '').trim() : '';
      const email = mapping.email ? String(row[mapping.email] ?? '').trim() : '';
      const city = mapping.city ? String(row[mapping.city] ?? '').trim() : 'New Delhi';
      const state = mapping.state ? String(row[mapping.state] ?? '').trim() : 'Delhi';
      const address = mapping.address ? String(row[mapping.address] ?? '').trim() : '';
      const rawCat = mapping.businessCategory
        ? String(row[mapping.businessCategory] ?? '').trim()
        : 'AC Showroom';

      const phoneCheck = validateAndFormatLeadPhone(rawPhone);
      const phoneKey = phoneCheck.normalized || phoneCheck.raw;

      const isDupInFile = Boolean(phoneKey && seenInFile.has(phoneKey));
      if (phoneKey) seenInFile.add(phoneKey);

      const isDupInDb = Boolean(
        phoneCheck.normalized && existingPhones.has(phoneCheck.normalized)
      );
      const fakeCheck = isSuspectedFakeLead(showroomName, ownerName, rawPhone);

      const validCat: BusinessCategory = BUSINESS_CATEGORIES.includes(
        rawCat as BusinessCategory
      )
        ? (rawCat as BusinessCategory)
        : 'AC Showroom';

      return {
        rowIndex: idx + 1,
        showroomName: showroomName || `Showroom Row #${idx + 1}`,
        ownerName,
        contactPerson,
        whatsappNumber: rawPhone,
        normalizedPhone: phoneCheck.normalized,
        formattedPhone: phoneCheck.formatted,
        isValidPhone: phoneCheck.isValid,
        phoneReason: phoneCheck.reason,
        email,
        city: city || 'New Delhi',
        state: state || 'Delhi',
        address,
        businessCategory: validCat,
        isDupInFile,
        isDupInDb,
        isSuspectedFake: fakeCheck.suspected,
        fakeReason: fakeCheck.reason,
        selected:
          phoneCheck.isValid && !isDupInFile && !isDupInDb && !fakeCheck.suspected,
      };
    });
  };

  const autoDetectMapping = (headers: string[]) => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const next = {
      showroomName: '',
      ownerName: '',
      contactPerson: '',
      whatsappNumber: '',
      email: '',
      city: '',
      state: '',
      address: '',
      businessCategory: '',
    };
    headers.forEach((h) => {
      const n = norm(h);
      if (!next.showroomName && (n.includes('showroom') || n.includes('business') || n.includes('dealer')))
        next.showroomName = h;
      else if (!next.ownerName && (n.includes('owner') || n.includes('contactperson') || n === 'name'))
        next.ownerName = h;
      else if (!next.contactPerson && n.includes('contact'))
        next.contactPerson = h;
      else if (!next.whatsappNumber && (n.includes('whatsapp') || n.includes('mobile') || n.includes('phone') || n.includes('number')))
        next.whatsappNumber = h;
      else if (!next.email && n.includes('mail'))
        next.email = h;
      else if (!next.city && n.includes('city'))
        next.city = h;
      else if (!next.state && n.includes('state'))
        next.state = h;
      else if (!next.address && n.includes('address'))
        next.address = h;
      else if (!next.businessCategory && (n.includes('category') || n.includes('type')))
        next.businessCategory = h;
    });
    if (!next.contactPerson) next.contactPerson = next.ownerName;
    return next;
  };

  const handleExcelUpload = async (file: File) => {
    setImportSummaryMsg(null);
    const { headers, rows } = await parseExcelOrCsvFile(file);
    const detected = autoDetectMapping(headers);
    setImportFileName(file.name);
    setRawHeaders(headers);
    setRawExcelRows(rows);
    setColMap(detected);
    setStagedRows(buildStagedImportRows(rows, detected));
    setSubMode('import');
  };

  const handleLoadSampleImport = () => {
    setImportSummaryMsg(null);
    const headers = Object.keys(SAMPLE_EXCEL_UPLOAD_ROWS[0]);
    const detected = autoDetectMapping(headers);
    setImportFileName('ORACLIME_Dealer_Master_Batch.xlsx');
    setRawHeaders(headers);
    setRawExcelRows(SAMPLE_EXCEL_UPLOAD_ROWS);
    setColMap(detected);
    setStagedRows(buildStagedImportRows(SAMPLE_EXCEL_UPLOAD_ROWS, detected));
    setSubMode('import');
  };

  const handleCommitBatchImport = () => {
    const toImport = stagedRows.filter((r) => r.selected);
    if (toImport.length === 0) return;

    // Process in manageable chunks
    const nowIso = new Date().toISOString();
    const baseNum = 1001 + activeLeads.length;
    const createdLeads: CrmLead[] = toImport.map((r, i) => ({
      id: `lead-imp-${Date.now()}-${i}`,
      leadCode: `ORA-LD-${baseNum + i}`,
      showroomName: r.showroomName,
      businessName: r.showroomName,
      ownerName: r.ownerName,
      contactPerson: r.contactPerson || r.ownerName,
      whatsappNumber: r.whatsappNumber,
      normalizedPhone: r.normalizedPhone,
      formattedPhone: r.formattedPhone,
      isValidPhone: r.isValidPhone,
      alternativeNumber: '',
      email: r.email,
      city: r.city,
      state: r.state,
      fullAddress: r.address,
      businessCategory: r.businessCategory,
      leadSource: `Excel Import (${importFileName})`,
      assignedManager: 'Vikram Rathore',
      assignedStaff: 'Rohit Sharma',
      priority: 'Medium',
      status: r.isValidPhone ? 'New Lead' : 'Invalid Lead',
      createdDate: nowIso,
      lastContactDate: '',
      nextFollowUpDate: '',
      remarks: '',
      optedOut: false,
      isDeleted: false,
      deletedAt: '',
      deletedBy: '',
      deletionReason: '',
      createdByUid: currentUser?.uid || 'usr-admin-1',
    }));

    const dupCount = stagedRows.filter((r) => r.isDupInFile || r.isDupInDb).length;
    const invCount = stagedRows.filter((r) => !r.isValidPhone).length;
    const fakeCount = stagedRows.filter((r) => r.isSuspectedFake).length;

    importLeadsBatch(createdLeads, {
      fileName: importFileName,
      totalRows: stagedRows.length,
      importedCount: createdLeads.length,
      duplicateCount: dupCount,
      invalidCount: invCount,
      suspectedFakeCount: fakeCount,
    });

    setImportSummaryMsg(
      `Imported ${createdLeads.length} showroom leads from ${importFileName} (${dupCount} duplicates skipped, ${invCount} invalid numbers flagged).`
    );
    setStagedRows([]);
    setSubMode('list');
  };

  const handleExportFailedImportRows = () => {
    const failed = stagedRows
      .filter((r) => !r.isValidPhone || r.isDupInFile || r.isDupInDb || r.isSuspectedFake)
      .map((r) => ({
        Row: r.rowIndex,
        'Showroom Name': r.showroomName,
        'Owner Name': r.ownerName,
        'WhatsApp Number': r.whatsappNumber,
        City: r.city,
        'Diagnostic Issue': !r.isValidPhone
          ? r.phoneReason
          : r.isDupInFile
          ? 'Duplicate in File'
          : r.isDupInDb
          ? 'Existing Lead in Database'
          : r.fakeReason,
      }));
    exportRecordsToSpreadsheet(failed, 'ORA_CRM_Failed_Import_Records', 'Failed_Rows');
  };

  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead(formLead);
    setSubMode('list');
  };

  const activeLead = visibleLeads.find((l) => l.id === activeLeadId) || null;
  const activeLeadTimeline = useMemo(
    () =>
      activityLogs.filter(
        (log) => log.leadId === activeLeadId || (activeLead && log.showroomName === activeLead.showroomName)
      ),
    [activityLogs, activeLeadId, activeLead]
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Enterprise Leads Manager & Excel Batch Importer
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Manage AC Showrooms, Multi-brand Dealers, and Electronics Retailers across the full ORACLIME partnership lifecycle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSubMode('list')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                subMode === 'list'
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Leads ({filteredLeads.length})
            </button>
            {canImport && (
              <button
                type="button"
                onClick={() => setSubMode('import')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  subMode === 'import'
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-blue-50 text-[#0B1F3A] border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Excel / CSV Batch Import
              </button>
            )}
            <button
              type="button"
              onClick={() => setSubMode('add')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                subMode === 'add'
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Lead
            </button>
          </div>
        </div>

        {importSummaryMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{importSummaryMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportSummaryMsg(null)}
              className="text-emerald-700 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* SUB-MODE: ADD NEW LEAD */}
      {subMode === 'add' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <h3 className="text-base font-bold text-slate-900">
              Create New Showroom Lead Record
            </h3>
            <button
              type="button"
              onClick={() => setSubMode('list')}
              className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateLeadSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Showroom Name *
              </label>
              <input
                type="text"
                required
                value={formLead.showroomName || ''}
                onChange={(e) => setFormLead({ ...formLead, showroomName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Business Name
              </label>
              <input
                type="text"
                value={formLead.businessName || ''}
                onChange={(e) => setFormLead({ ...formLead, businessName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={formLead.ownerName || ''}
                onChange={(e) =>
                  setFormLead({
                    ...formLead,
                    ownerName: e.target.value,
                    contactPerson: formLead.contactPerson || e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                value={formLead.contactPerson || ''}
                onChange={(e) => setFormLead({ ...formLead, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Number (Indian 10-Digit) *
              </label>
              <input
                type="text"
                required
                value={formLead.whatsappNumber || ''}
                onChange={(e) => setFormLead({ ...formLead, whatsappNumber: e.target.value })}
                placeholder="9810423189"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternative Number
              </label>
              <input
                type="text"
                value={formLead.alternativeNumber || ''}
                onChange={(e) => setFormLead({ ...formLead, alternativeNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formLead.email || ''}
                onChange={(e) => setFormLead({ ...formLead, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formLead.city || ''}
                onChange={(e) => setFormLead({ ...formLead, city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formLead.state || ''}
                onChange={(e) => setFormLead({ ...formLead, state: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Category
              </label>
              <select
                value={formLead.businessCategory}
                onChange={(e) =>
                  setFormLead({
                    ...formLead,
                    businessCategory: e.target.value as BusinessCategory,
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formLead.priority}
                onChange={(e) =>
                  setFormLead({ ...formLead, priority: e.target.value as LeadPriority })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Staff
              </label>
              <select
                value={formLead.assignedStaff}
                onChange={(e) => setFormLead({ ...formLead, assignedStaff: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Address
              </label>
              <input
                type="text"
                value={formLead.fullAddress || ''}
                onChange={(e) => setFormLead({ ...formLead, fullAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Follow-up Date
              </label>
              <input
                type="datetime-local"
                value={formLead.nextFollowUpDate || ''}
                onChange={(e) => setFormLead({ ...formLead, nextFollowUpDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks
              </label>
              <textarea
                rows={2}
                value={formLead.remarks || ''}
                onChange={(e) => setFormLead({ ...formLead, remarks: e.target.value })}
                className="w-full p-3 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
              >
                Create Showroom Lead
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SUB-MODE: EXCEL IMPORT SYSTEM (Part 6) */}
      {subMode === 'import' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Enterprise Excel & CSV Batch Import Engine (Up to 5,000+ Records/Batch)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Validates Indian mobile numbers, detects in-file and database duplicates, flags suspected fake leads, and exports failed rows.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadSampleShowroomExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample .XLSX
              </button>
              <button
                type="button"
                onClick={handleLoadSampleImport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Load Sample Upload Batch
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleExcelUpload(file);
            }}
            className="border-2 border-dashed border-slate-300 hover:border-[#0B1F3A] rounded-xl p-6 text-center bg-slate-50/70"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleExcelUpload(file);
                e.target.value = '';
              }}
              className="hidden"
            />
            <p className="text-sm font-semibold text-slate-900">
              Drag & Drop Excel (.XLSX, .XLS) or CSV file here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports Showroom Name, Owner Name, Contact Person, WhatsApp Number, Email, City, State, Address, Business Category
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              Browse Spreadsheet File
            </button>
          </div>

          {stagedRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-900">
                  Previewing Batch: {importFileName} ({stagedRows.length} rows)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportFailedImportRows}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Failed / Duplicate Rows
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitBatchImport}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
                  >
                    Import {stagedRows.filter((r) => r.selected).length} Selected Leads
                  </button>
                </div>
              </div>

              {/* Manual Column Mapper */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                {(
                  [
                    { key: 'showroomName', label: 'Showroom Name' },
                    { key: 'ownerName', label: 'Owner Name' },
                    { key: 'whatsappNumber', label: 'WhatsApp Number' },
                    { key: 'city', label: 'City' },
                    { key: 'businessCategory', label: 'Category' },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {label}
                    </label>
                    <select
                      value={colMap[key]}
                      onChange={(e) => {
                        const updated = { ...colMap, [key]: e.target.value };
                        setColMap(updated);
                        setStagedRows(buildStagedImportRows(rawExcelRows, updated));
                      }}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="">-- Unmapped --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Diagnostic Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'all', label: `All (${stagedRows.length})` },
                    {
                      id: 'valid',
                      label: `Ready (${stagedRows.filter((r) => r.isValidPhone && !r.isDupInFile && !r.isDupInDb).length})`,
                    },
                    {
                      id: 'dup_file',
                      label: `In-File Duplicates (${stagedRows.filter((r) => r.isDupInFile).length})`,
                    },
                    {
                      id: 'dup_db',
                      label: `Existing DB Leads (${stagedRows.filter((r) => r.isDupInDb).length})`,
                    },
                    {
                      id: 'invalid',
                      label: `Invalid Mobile (${stagedRows.filter((r) => !r.isValidPhone).length})`,
                    },
                    {
                      id: 'fake',
                      label: `Suspected Fake (${stagedRows.filter((r) => r.isSuspectedFake).length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setImportFilter(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      importFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Staged Preview Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Import</th>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Showroom Name</th>
                      <th className="py-2 px-3">Owner / Contact</th>
                      <th className="py-2 px-3">WhatsApp Number</th>
                      <th className="py-2 px-3">City</th>
                      <th className="py-2 px-3">Validation Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stagedRows
                      .filter((r) => {
                        if (importFilter === 'valid')
                          return r.isValidPhone && !r.isDupInFile && !r.isDupInDb;
                        if (importFilter === 'dup_file') return r.isDupInFile;
                        if (importFilter === 'dup_db') return r.isDupInDb;
                        if (importFilter === 'invalid') return !r.isValidPhone;
                        if (importFilter === 'fake') return r.isSuspectedFake;
                        return true;
                      })
                      .map((row) => (
                        <tr key={row.rowIndex} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) =>
                                setStagedRows((prev) =>
                                  prev.map((item) =>
                                    item.rowIndex === row.rowIndex
                                      ? { ...item, selected: e.target.checked }
                                      : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                            #{row.rowIndex}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.showroomName}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {row.ownerName || 'Missing Name'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {row.formattedPhone}
                          </td>
                          <td className="py-2 px-3">{row.city}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.isValidPhone ? (
                                <span className="text-emerald-700 font-medium">
                                  Valid Mobile
                                </span>
                              ) : (
                                <span className="text-red-700 font-medium">
                                  {row.phoneReason}
                                </span>
                              )}
                              {row.isDupInFile && (
                                <span className="text-amber-700 font-medium">
                                  · Duplicate in File
                                </span>
                              )}
                              {row.isDupInDb && (
                                <span className="text-amber-700 font-medium">
                                  · Existing Lead in DB
                                </span>
                              )}
                              {row.isSuspectedFake && (
                                <span className="text-red-700 font-medium">
                                  · Suspected Fake ({row.fakeReason})
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import History Table */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              Recent Excel Import Batch History
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Batch File Name</th>
                    <th className="py-2 px-3">Total Rows</th>
                    <th className="py-2 px-3">Imported</th>
                    <th className="py-2 px-3">Duplicates</th>
                    <th className="py-2 px-3">Invalid</th>
                    <th className="py-2 px-3">Imported By</th>
                    <th className="py-2 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {importBatches.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2 px-3 font-medium text-slate-900">{b.fileName}</td>
                      <td className="py-2 px-3 font-mono tabular-nums">{b.totalRows}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-emerald-700 font-semibold">
                        {b.importedCount}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-amber-700">
                        {b.duplicateCount}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-red-700">
                        {b.invalidCount}
                      </td>
                      <td className="py-2 px-3">{b.importedBy}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                        {new Date(b.timestamp).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SUB-MODE: LEADS LIST & BULK OPERATIONS */}
      {subMode === 'list' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          {/* Search & Multi-Filter Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Lead ID, showroom, owner, phone, or city..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="All">All Statuses</option>
                {ALL_LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="All">All Cities</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="All">All Categories</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={staffFilter}
                onChange={(e) => {
                  setStaffFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="All">All Assigned Staff</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'name' | 'priority')}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="name">Sort: Showroom A-Z</option>
                <option value="priority">Sort: High Priority First</option>
              </select>
            </div>
          </div>

          {/* Bulk Operations Toolbar when rows are selected */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-semibold text-[#0B1F3A]">
                {selectedIds.length} Lead(s) Selected
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canAssign && (
                  <>
                    <select
                      value={bulkStaff}
                      onChange={(e) => setBulkStaff(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded"
                    >
                      <option value="">Assign Staff...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (bulkStaff || bulkManager) {
                          bulkAssignLeads(selectedIds, bulkManager, bulkStaff);
                          setSelectedIds([]);
                        }
                      }}
                      className="px-2.5 py-1 font-semibold text-white bg-[#0B1F3A] rounded cursor-pointer"
                    >
                      Apply Assign
                    </button>
                  </>
                )}

                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as LeadStageStatus)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded"
                >
                  <option value="">Bulk Status...</option>
                  {ALL_LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (bulkStatus) {
                      bulkUpdateLeadStatus(selectedIds, bulkStatus);
                      setSelectedIds([]);
                    }
                  }}
                  className="px-2.5 py-1 font-semibold text-white bg-blue-700 rounded cursor-pointer"
                >
                  Update Status
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selectedRecords = filteredLeads
                      .filter((l) => selectedIds.includes(l.id))
                      .map((l) => ({
                        'Lead ID': l.leadCode,
                        'Showroom Name': l.showroomName,
                        'Owner Name': l.ownerName,
                        'WhatsApp Number': l.formattedPhone,
                        City: l.city,
                        Category: l.businessCategory,
                        Status: l.status,
                        'Assigned Staff': l.assignedStaff,
                      }));
                    exportRecordsToSpreadsheet(selectedRecords, 'ORA_CRM_Selected_Leads');
                  }}
                  className="px-2.5 py-1 font-semibold text-slate-700 bg-white border border-slate-300 rounded cursor-pointer"
                >
                  Export Selected
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-2.5 py-1 font-semibold text-red-700 bg-red-50 border border-red-200 rounded cursor-pointer"
                >
                  Move to Recycle Bin
                </button>
              </div>
            </div>
          )}

          {/* Soft Delete Confirmation Modal */}
          {showBulkDeleteModal && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1">
                <div className="font-bold text-red-900">
                  Soft-Delete {selectedIds.length} Lead(s) to Recycle Bin
                </div>
                <input
                  type="text"
                  value={bulkDeleteReason}
                  onChange={(e) => setBulkDeleteReason(e.target.value)}
                  placeholder="Enter deletion reason (e.g. Closed showroom / Duplicate record)..."
                  className="mt-1.5 w-full max-w-md px-2.5 py-1 bg-white border border-red-300 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-white border border-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    softDeleteLeads(
                      selectedIds,
                      bulkDeleteReason.trim() || 'Moved to Recycle Bin by user'
                    );
                    setSelectedIds([]);
                    setBulkDeleteReason('');
                    setShowBulkDeleteModal(false);
                  }}
                  className="px-3 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                >
                  Confirm Soft Delete
                </button>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        paginatedLeads.length > 0 &&
                        paginatedLeads.every((l) => selectedIds.includes(l.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(paginatedLeads.map((l) => l.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-3">Lead ID</th>
                  <th className="py-2.5 px-3">Showroom & Category</th>
                  <th className="py-2.5 px-3">Owner / Contact</th>
                  <th className="py-2.5 px-3">WhatsApp Mobile</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Assigned Staff</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500">
                      No leads available. Import your first Excel file to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, lead.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== lead.id));
                            }
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-[#0B1F3A]">
                        {lead.leadCode}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{lead.showroomName}</div>
                        <div className="text-slate-500">
                          <span>{lead.businessCategory}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{lead.leadSource}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">
                          {lead.ownerName || lead.contactPerson || 'Not Specified'}
                        </div>
                        {lead.email && <div className="text-slate-500">{lead.email}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        <div className={lead.isValidPhone ? 'text-slate-900 font-medium' : 'text-red-600'}>
                          {lead.formattedPhone}
                        </div>
                        {lead.alternativeNumber && (
                          <div className="text-slate-400 text-[11px]">
                            Alt: {lead.alternativeNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{lead.city}</div>
                        <div className="text-slate-400">{lead.state}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{lead.assignedStaff}</div>
                        <div className="text-slate-400 text-[11px]">Mgr: {lead.assignedManager}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            lead.priority === 'High'
                              ? 'text-red-700'
                              : lead.priority === 'Medium'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLead(
                              lead.id,
                              { status: e.target.value as LeadStageStatus },
                              `Status updated to ${e.target.value}`
                            )
                          }
                          className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-[#0B1F3A]"
                        >
                          {ALL_LEAD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveLeadId(lead.id)}
                            className="p-1.5 text-slate-600 hover:text-[#0B1F3A] bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                            title="View complete lead profile & activity history"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role !== 'STAFF' && (
                            <button
                              type="button"
                              onClick={() =>
                                softDeleteLeads([lead.id], 'Moved to Recycle Bin from Leads Manager')
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              title="Soft-delete lead to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
            <div className="tabular-nums">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredLeads.length)} of{' '}
              {filteredLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer"
              >
                Previous
              </button>
              <span className="font-mono tabular-nums">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {/* LEAD COMPLETE DOSSIER & ACTIVITY TIMELINE MODAL */}
      {activeLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-[#0B1F3A] font-semibold">
                  {activeLead.leadCode} · Created{' '}
                  {new Date(activeLead.createdDate).toLocaleDateString('en-IN')}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {activeLead.showroomName}
                </h3>
                <div className="text-xs text-slate-600 mt-1">
                  {activeLead.businessName} · {activeLead.businessCategory} · {activeLead.city},{' '}
                  {activeLead.state}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeadId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={activeLead.ownerName}
                  onChange={(e) => updateLead(activeLead.id, { ownerName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={activeLead.contactPerson}
                  onChange={(e) => updateLead(activeLead.id, { contactPerson: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  WhatsApp Mobile
                </label>
                <input
                  type="text"
                  value={activeLead.whatsappNumber}
                  onChange={(e) => updateLead(activeLead.id, { whatsappNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Assigned Manager
                </label>
                <input
                  type="text"
                  value={activeLead.assignedManager}
                  onChange={(e) => updateLead(activeLead.id, { assignedManager: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Assigned Staff
                </label>
                <input
                  type="text"
                  value={activeLead.assignedStaff}
                  onChange={(e) => updateLead(activeLead.id, { assignedStaff: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Convert to Partner
                </label>
                <button
                  type="button"
                  onClick={() => {
                    convertLeadToPartnership(activeLead.id, {});
                    setActiveLeadId(null);
                  }}
                  className="w-full px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                >
                  Convert to Official Partner
                </button>
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block font-semibold text-slate-600 mb-1">
                  Full Address
                </label>
                <input
                  type="text"
                  value={activeLead.fullAddress}
                  onChange={(e) => updateLead(activeLead.id, { fullAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block font-semibold text-slate-600 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={activeLead.remarks}
                  onChange={(e) => updateLead(activeLead.id, { remarks: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Complete Lead Activity Timeline */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 mb-3">
                Complete Lead Activity Timeline ({activeLeadTimeline.length} events)
              </h4>
              <div className="space-y-2.5 max-h-52 overflow-y-auto">
                {activeLeadTimeline.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No activity events recorded for this lead yet.
                  </p>
                ) : (
                  activeLeadTimeline.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-[#0B1F3A]">{ev.actionType}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-slate-700">{ev.details}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          By {ev.performedBy} ({ev.performedByRole})
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                        {new Date(ev.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PART 7 – SALES PIPELINE KANBAN
 */
export const SalesPipelineView: React.FC = () => {
  const { visibleLeads, moveLeadStage, convertLeadToPartnership } = useCrm();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filtered = useMemo(
    () =>
      visibleLeads.filter(
        (l) => selectedCategory === 'All' || l.businessCategory === selectedCategory
      ),
    [visibleLeads, selectedCategory]
  );

  const totalCount = Math.max(1, filtered.length);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Visual Kanban Sales & Partnership Pipeline
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Move AC Showrooms and Dealers across all 9 partnership stages. Every stage change automatically logs an audit activity record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Segment:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="All">All Business Categories</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Horizontal Scrollable 9-Stage Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_MAIN_STAGES.map((stage, stageIdx) => {
          const stageLeads = filtered.filter((l) => l.status === stage);
          const pct = Math.round((stageLeads.length / totalCount) * 100);

          return (
            <div
              key={stage}
              className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      0{stageIdx + 1}. {stage}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                      {stageLeads.length} leads · {pct}% of pipeline
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-[#0B1F3A] tabular-nums">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 max-h-[460px] overflow-y-auto">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-900">
                          {lead.showroomName}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {lead.leadCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {lead.contactPerson || lead.ownerName} · {lead.city}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-[#0B1F3A]">
                        {lead.formattedPhone}
                      </div>
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            moveLeadStage(lead.id, e.target.value as LeadStageStatus)
                          }
                          className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded font-medium"
                        >
                          {ALL_LEAD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              Move → {st}
                            </option>
                          ))}
                        </select>
                      </div>
                      {stage === 'Interested' || stage === 'Negotiation' ? (
                        <button
                          type="button"
                          onClick={() => convertLeadToPartnership(lead.id, {})}
                          className="w-full py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                        >
                          Convert to Partner
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Disposition Statuses */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Additional Disposition Statuses (Not Interested · Not Responding · Invalid · Duplicate)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE_ADDITIONAL_STATUSES.map((st) => {
            const list = filtered.filter((l) => l.status === st);
            return (
              <div key={st} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{st}</span>
                  <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                    {list.length}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {list.slice(0, 4).map((l) => (
                    <div key={l.id} className="text-xs text-slate-600 flex justify-between">
                      <span className="truncate">{l.showroomName}</span>
                      <span className="font-mono text-[11px]">{l.city}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

/**
 * PART 10 – CONTACTS & SHOWROOM DIRECTORY
 */
export const ContactsDirectoryView: React.FC = () => {
  const { visibleLeads, partnerships, activityLogs } = useCrm();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedPhoneKey, setSelectedPhoneKey] = useState<string | null>(null);

  // Deduplicate contacts by normalized phone so each showroom contact appears once with linked leads
  const deduplicatedContacts = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        showroomName: string;
        ownerName: string;
        contactPerson: string;
        formattedPhone: string;
        email: string;
        city: string;
        businessCategory: string;
        linkedLeads: CrmLead[];
        partnershipStatus: string;
      }
    >();

    visibleLeads.forEach((lead) => {
      const key = lead.normalizedPhone || lead.id;
      const partner = partnerships.find(
        (p) => p.leadId === lead.id || p.showroomName === lead.showroomName
      );
      const existing = map.get(key);
      if (existing) {
        existing.linkedLeads.push(lead);
        if (partner) existing.partnershipStatus = partner.status;
      } else {
        map.set(key, {
          key,
          showroomName: lead.showroomName,
          ownerName: lead.ownerName,
          contactPerson: lead.contactPerson,
          formattedPhone: lead.formattedPhone,
          email: lead.email,
          city: lead.city,
          businessCategory: lead.businessCategory,
          linkedLeads: [lead],
          partnershipStatus: partner ? partner.status : lead.status,
        });
      }
    });

    return Array.from(map.values()).filter((c) => {
      if (cityFilter !== 'All' && c.city !== cityFilter) return false;
      if (categoryFilter !== 'All' && c.businessCategory !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.showroomName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.formattedPhone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [visibleLeads, partnerships, cityFilter, categoryFilter, search]);

  const activeContact =
    deduplicatedContacts.find((c) => c.key === selectedPhoneKey) ||
    deduplicatedContacts[0] ||
    null;

  const cities = Array.from(new Set(visibleLeads.map((l) => l.city).filter(Boolean)));

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Contacts & Showroom Master Directory
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Deduplicated master showroom directory showing linked leads, partnership status, and complete communication history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or mobile number..."
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Categories</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Showroom & Owner</th>
                  <th className="py-2.5 px-3">WhatsApp Number</th>
                  <th className="py-2.5 px-3">City & Category</th>
                  <th className="py-2.5 px-3">Partnership Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deduplicatedContacts.map((c) => (
                  <tr
                    key={c.key}
                    onClick={() => setSelectedPhoneKey(c.key)}
                    className={`cursor-pointer ${
                      activeContact?.key === c.key ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{c.showroomName}</div>
                      <div className="text-slate-500">{c.ownerName || c.contactPerson}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900">
                      {c.formattedPhone}
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{c.city}</div>
                      <div className="text-slate-400">{c.businessCategory}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">
                      {c.partnershipStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeContact && (
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-200">
                <div className="text-slate-500">Showroom Contact Profile</div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeContact.showroomName}
                </h3>
                <div className="text-slate-600 mt-1">
                  {activeContact.ownerName} · {activeContact.formattedPhone} · {activeContact.city}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-800 mb-1.5">
                  Linked Leads ({activeContact.linkedLeads.length})
                </div>
                {activeContact.linkedLeads.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between"
                  >
                    <span>
                      <strong className="font-mono">{l.leadCode}</strong> · {l.status}
                    </span>
                    <span className="text-slate-500">Staff: {l.assignedStaff}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="font-bold text-slate-800 mb-1.5">
                  Communication & Activity History
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activityLogs
                    .filter((a) => a.showroomName === activeContact.showroomName)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="p-2 bg-white border border-slate-200 rounded text-[11px]"
                      >
                        <div className="font-semibold text-[#0B1F3A]">{a.actionType}</div>
                        <div className="text-slate-600">{a.details}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

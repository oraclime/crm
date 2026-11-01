import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ColumnMapping,
  DealerCategory,
  ParsedPreviewRow,
  ShowroomContact,
} from '../types/outreach';
import {
  buildPreviewRowsFromRaw,
  DEALER_CATEGORIES,
  detectColumnMapping,
  downloadSampleShowroomExcel,
  parseExcelOrCsvFile,
  SAMPLE_EXCEL_UPLOAD_ROWS,
  validateIndianMobile,
} from '../utils/phoneAndExcel';

interface ExcelImportPanelProps {
  showrooms: ShowroomContact[];
  onImportShowrooms: (newShowrooms: ShowroomContact[]) => void;
  onUpdateShowroom: (id: string, patch: Partial<ShowroomContact>) => void;
  onDeleteShowroom: (id: string) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onProceedToComposer: () => void;
}

type PreviewFilter = 'all' | 'valid' | 'invalid' | 'duplicates' | 'missing_name';

export const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({
  showrooms,
  onImportShowrooms,
  onUpdateShowroom,
  onDeleteShowroom,
  onToggleSelectAll,
  onProceedToComposer,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Staged upload state
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    showroomName: '',
    contactPerson: '',
    whatsappNumber: '',
    email: '',
    city: '',
    address: '',
    category: '',
  });
  const [previewRows, setPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importSuccessBanner, setImportSuccessBanner] = useState<string | null>(null);

  // Manual single showroom form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualShowroomName, setManualShowroomName] = useState('');
  const [manualContactPerson, setManualContactPerson] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCity, setManualCity] = useState('New Delhi');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCategory, setManualCategory] = useState<DealerCategory>('AC Showroom');

  // Directory search & filter state
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'selected' | 'valid' | 'invalid'>('all');

  const handleFileSelection = async (file: File) => {
    setUploadError(null);
    setImportSuccessBanner(null);
    try {
      const { headers, rows } = await parseExcelOrCsvFile(file);
      const detected = detectColumnMapping(headers, rows);
      const built = buildPreviewRowsFromRaw(rows, detected, showrooms);

      setUploadedFileName(file.name);
      setRawHeaders(headers);
      setRawRows(rows);
      setColumnMapping(detected);
      setPreviewRows(built);
      setPreviewFilter('all');
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Unable to parse spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.'
      );
    }
  };

  const handleLoadSampleBatchForPreview = () => {
    setUploadError(null);
    setImportSuccessBanner(null);
    const headers = Object.keys(SAMPLE_EXCEL_UPLOAD_ROWS[0]);
    const detected = detectColumnMapping(headers, SAMPLE_EXCEL_UPLOAD_ROWS);
    const built = buildPreviewRowsFromRaw(SAMPLE_EXCEL_UPLOAD_ROWS, detected, showrooms);

    setUploadedFileName('ORACLIME_Dealer_Lead_Sheet_Sample.xlsx');
    setRawHeaders(headers);
    setRawRows(SAMPLE_EXCEL_UPLOAD_ROWS);
    setColumnMapping(detected);
    setPreviewRows(built);
    setPreviewFilter('all');
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, selectedHeader: string) => {
    const updatedMapping = {
      ...columnMapping,
      [field]: selectedHeader,
    };
    setColumnMapping(updatedMapping);
    const rebuilt = buildPreviewRowsFromRaw(rawRows, updatedMapping, showrooms);
    setPreviewRows(rebuilt);
  };

  const handlePreviewRowEdit = (
    tempId: string,
    patch: Partial<Pick<ParsedPreviewRow, 'showroomName' | 'contactPerson' | 'rawPhone' | 'city' | 'email' | 'address' | 'includeInImport'>>
  ) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const updated = { ...row, ...patch };
        if (patch.rawPhone !== undefined) {
          const phoneCheck = validateIndianMobile(patch.rawPhone);
          updated.normalizedPhone = phoneCheck.normalized;
          updated.formattedPhone = phoneCheck.formatted;
          updated.isValidPhone = phoneCheck.isValid;
          updated.phoneReason = phoneCheck.reason;
        }
        if (patch.showroomName !== undefined) {
          updated.isMissingShowroomName = patch.showroomName.trim().length === 0;
        }
        if (patch.contactPerson !== undefined) {
          updated.isMissingContactName = patch.contactPerson.trim().length === 0;
        }
        return updated;
      })
    );
  };

  const handleCommitImport = () => {
    const rowsToImport = previewRows.filter((r) => r.includeInImport);
    if (rowsToImport.length === 0) return;

    const converted: ShowroomContact[] = rowsToImport.map((r, idx) => ({
      id: `ora-imp-${Date.now()}-${idx}`,
      showroomName: r.showroomName.trim() || 'Unnamed AC Showroom',
      contactPerson: r.contactPerson.trim(),
      rawPhone: r.rawPhone,
      normalizedPhone: r.normalizedPhone,
      formattedPhone: r.formattedPhone,
      isValidPhone: r.isValidPhone,
      phoneValidationReason: r.phoneReason,
      email: r.email,
      city: r.city || 'Delhi NCR',
      address: r.address,
      category: r.category,
      selectedForCampaign: r.isValidPhone,
      campaignStatus: r.isValidPhone ? 'Pending' : 'Invalid Number',
      followUpStatus: 'Not Contacted',
      notes: '',
      lastContactDate: null,
      optedIn: true,
      interestedServices: ['Split AC Installation', 'Window AC Installation', 'AC Servicing'],
    }));

    onImportShowrooms(converted);
    setImportSuccessBanner(
      `Imported ${converted.length} showroom records into ORACLIME Partnership Directory.`
    );
    setPreviewRows([]);
    setRawRows([]);
    setUploadedFileName('');
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualShowroomName.trim() && !manualPhone.trim()) return;

    const phoneCheck = validateIndianMobile(manualPhone);
    const newShowroom: ShowroomContact = {
      id: `ora-manual-${Date.now()}`,
      showroomName: manualShowroomName.trim() || 'Unnamed AC Showroom',
      contactPerson: manualContactPerson.trim(),
      rawPhone: phoneCheck.raw,
      normalizedPhone: phoneCheck.normalized,
      formattedPhone: phoneCheck.formatted,
      isValidPhone: phoneCheck.isValid,
      phoneValidationReason: phoneCheck.reason,
      email: manualEmail.trim(),
      city: manualCity.trim() || 'New Delhi',
      address: manualAddress.trim(),
      category: manualCategory,
      selectedForCampaign: phoneCheck.isValid,
      campaignStatus: phoneCheck.isValid ? 'Pending' : 'Invalid Number',
      followUpStatus: 'Not Contacted',
      notes: '',
      lastContactDate: null,
      optedIn: true,
      interestedServices: ['Split AC Installation', 'AC Servicing'],
    };

    onImportShowrooms([newShowroom]);
    setManualShowroomName('');
    setManualContactPerson('');
    setManualPhone('');
    setManualEmail('');
    setManualAddress('');
    setShowAddForm(false);
    setImportSuccessBanner(`Added "${newShowroom.showroomName}" to Showroom Directory.`);
  };

  // Preview statistics
  const previewValidCount = previewRows.filter((r) => r.isValidPhone).length;
  const previewInvalidCount = previewRows.filter((r) => !r.isValidPhone).length;
  const previewDuplicateCount = previewRows.filter(
    (r) => r.isDuplicateInFile || r.isDuplicateInSaved
  ).length;
  const previewMissingNameCount = previewRows.filter(
    (r) => r.isMissingContactName || r.isMissingShowroomName
  ).length;
  const previewSelectedCount = previewRows.filter((r) => r.includeInImport).length;

  const filteredPreviewRows = previewRows.filter((r) => {
    if (previewFilter === 'valid') return r.isValidPhone && !r.isDuplicateInFile && !r.isDuplicateInSaved;
    if (previewFilter === 'invalid') return !r.isValidPhone;
    if (previewFilter === 'duplicates') return r.isDuplicateInFile || r.isDuplicateInSaved;
    if (previewFilter === 'missing_name') return r.isMissingContactName || r.isMissingShowroomName;
    return true;
  });

  // Directory filtering
  const filteredDirectory = showrooms.filter((s) => {
    if (directoryFilter === 'selected' && !s.selectedForCampaign) return false;
    if (directoryFilter === 'valid' && !s.isValidPhone) return false;
    if (directoryFilter === 'invalid' && s.isValidPhone) return false;

    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    return (
      s.showroomName.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.formattedPhone.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const selectedValidShowroomsCount = showrooms.filter(
    (s) => s.selectedForCampaign && s.isValidPhone && s.optedIn
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Section Header & Upload Dropzone */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              01. Showroom Excel Import & Data Validation
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Upload AC Showroom, Multi-brand Dealer, and Electronics Retailer lists (.xlsx, .xls, .csv).
              Automatically detects mobile columns, validates 10-digit Indian WhatsApp numbers, flags duplicates, and identifies missing names.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={downloadSampleShowroomExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .XLSX Template
            </button>
            <button
              type="button"
              onClick={handleLoadSampleBatchForPreview}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Test Sample Excel Upload
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Single Showroom
            </button>
          </div>
        </div>

        {/* Manual Add Single Showroom Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleManualAddSubmit}
            className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Add Single AC Showroom or Dealer Record
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Showroom Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualShowroomName}
                  onChange={(e) => setManualShowroomName(e.target.value)}
                  placeholder="e.g. Shree Ram Cooling Plaza"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Owner / Contact Person Name
                </label>
                <input
                  type="text"
                  value={manualContactPerson}
                  onChange={(e) => setManualContactPerson(e.target.value)}
                  placeholder="e.g. Suresh Agrawal"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Number (Indian 10-digit) *
                </label>
                <input
                  type="text"
                  required
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="e.g. 9811223344"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Showroom Category
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as DealerCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                >
                  {DEALER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="owner@showroom.in"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Market road, sector, landmark..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors cursor-pointer"
                >
                  Save Showroom Record
                </button>
              </div>
            </div>
          </form>
        )}

        {/* File Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelection(file);
          }}
          className="mt-6 border-2 border-dashed border-slate-300 hover:border-[#0B1F3A] rounded-xl p-6 text-center bg-slate-50/70 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelection(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-[#0B1F3A]/10 text-[#0B1F3A] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              Upload Showroom Excel or CSV File (.xlsx, .xls, .csv)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Expected columns: Showroom Name · Owner / Contact Person Name · WhatsApp Number · Email (optional) · City · Address (optional)
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors cursor-pointer"
              >
                Choose Excel / CSV File
              </button>
              <button
                type="button"
                onClick={handleLoadSampleBatchForPreview}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Preview Sample Showroom Sheet (7 Rows)
              </button>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {importSuccessBanner && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{importSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportSuccessBanner(null)}
              className="text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Column Mapping & Pre-Import Validation Workspace */}
        {previewRows.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Column Mapping & Pre-Import Verification — {uploadedFileName}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Mobile number column auto-detected. Adjust column mappings or edit any record inline before importing.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRows([]);
                    setRawRows([]);
                    setUploadedFileName('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Discard Upload
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={previewSelectedCount === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                >
                  Import {previewSelectedCount} Selected Showrooms
                </button>
              </div>
            </div>

            {/* Manual Column Mapper Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              {(
                [
                  { key: 'showroomName', label: 'Showroom Name *' },
                  { key: 'contactPerson', label: 'Owner / Contact Name' },
                  { key: 'whatsappNumber', label: 'WhatsApp Number (Auto) *' },
                  { key: 'city', label: 'City' },
                  { key: 'email', label: 'Email (Optional)' },
                  { key: 'address', label: 'Address (Optional)' },
                ] as { key: keyof ColumnMapping; label: string }[]
              ).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {label}
                  </label>
                  <select
                    value={columnMapping[key]}
                    onChange={(e) => handleColumnMappingChange(key, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  >
                    <option value="">-- Not Mapped --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Validation Summary Bar & Filter Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    previewFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Records ({previewRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    previewFilter === 'valid'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Valid Indian Mobile ({previewValidCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('invalid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    previewFilter === 'invalid'
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Invalid Numbers ({previewInvalidCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('duplicates')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    previewFilter === 'duplicates'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Duplicates ({previewDuplicateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('missing_name')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    previewFilter === 'missing_name'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Missing Names ({previewMissingNameCount})
                </button>
              </div>

              <div className="text-xs text-slate-600 tabular-nums">
                <span>Selected for Import: </span>
                <strong className="text-slate-900">{previewSelectedCount}</strong>
                <span> of {previewRows.length} rows</span>
              </div>
            </div>

            {/* Preview Records Table with Inline Editing */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3 w-10">Import</th>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Showroom Name</th>
                    <th className="py-2.5 px-3">Owner / Contact Person</th>
                    <th className="py-2.5 px-3">WhatsApp Number</th>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3">Validation Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredPreviewRows.map((row) => (
                    <tr
                      key={row.tempId}
                      className={
                        !row.isValidPhone
                          ? 'bg-red-50/40'
                          : row.isDuplicateInFile || row.isDuplicateInSaved
                          ? 'bg-amber-50/40'
                          : 'bg-white hover:bg-slate-50'
                      }
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={row.includeInImport}
                          onChange={(e) =>
                            handlePreviewRowEdit(row.tempId, {
                              includeInImport: e.target.checked,
                            })
                          }
                          className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#0B1F3A]"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                        #{row.rowIndex}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.showroomName}
                          placeholder="Missing Showroom Name"
                          onChange={(e) =>
                            handlePreviewRowEdit(row.tempId, {
                              showroomName: e.target.value,
                            })
                          }
                          className={`w-full px-2 py-1 rounded border text-xs ${
                            row.isMissingShowroomName
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.contactPerson}
                          placeholder="Missing Owner Name (Edit)"
                          onChange={(e) =>
                            handlePreviewRowEdit(row.tempId, {
                              contactPerson: e.target.value,
                            })
                          }
                          className={`w-full px-2 py-1 rounded border text-xs ${
                            row.isMissingContactName
                              ? 'border-amber-400 bg-amber-50/50 placeholder:text-amber-700'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.rawPhone}
                          onChange={(e) =>
                            handlePreviewRowEdit(row.tempId, {
                              rawPhone: e.target.value,
                            })
                          }
                          className={`w-36 px-2 py-1 rounded border font-mono tabular-nums text-xs ${
                            !row.isValidPhone
                              ? 'border-red-400 bg-red-50/60 text-red-900'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.city}
                          onChange={(e) =>
                            handlePreviewRowEdit(row.tempId, {
                              city: e.target.value,
                            })
                          }
                          className="w-28 px-2 py-1 rounded border border-slate-200 bg-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {row.isValidPhone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {row.formattedPhone}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              {row.phoneReason}
                            </span>
                          )}
                          {(row.isDuplicateInFile || row.isDuplicateInSaved) && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              · <AlertTriangle className="w-3.5 h-3.5" />
                              {row.isDuplicateInFile
                                ? 'Duplicate in uploaded file'
                                : 'Already in directory'}
                            </span>
                          )}
                          {row.isMissingContactName && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              · <AlertTriangle className="w-3.5 h-3.5" />
                              Missing Owner Name
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
      </section>

      {/* Active Showroom Directory & Selection Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              02. Select AC Showrooms & Dealers for Outreach Campaign
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Select target showrooms with valid Indian WhatsApp numbers who have agreed to receive business partnership communications.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="text-xs text-slate-600 tabular-nums">
              Selected for Campaign:{' '}
              <strong className="text-[#0B1F3A]">{selectedValidShowroomsCount}</strong> valid showrooms
            </span>
            <button
              type="button"
              onClick={onProceedToComposer}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Next: Write Partnership Message →
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              placeholder="Search showroom name, owner, city, or phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${showrooms.length})` },
                  {
                    id: 'selected',
                    label: `Selected (${showrooms.filter((s) => s.selectedForCampaign).length})`,
                  },
                  {
                    id: 'valid',
                    label: `Valid Mobile (${showrooms.filter((s) => s.isValidPhone).length})`,
                  },
                  {
                    id: 'invalid',
                    label: `Invalid (${showrooms.filter((s) => !s.isValidPhone).length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDirectoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    directoryFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onToggleSelectAll(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Select All Valid
            </button>
            <button
              type="button"
              onClick={() => onToggleSelectAll(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Showroom Directory Table */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 w-10">Target</th>
                <th className="py-2.5 px-3">Showroom & Category</th>
                <th className="py-2.5 px-3">Owner / Contact Person</th>
                <th className="py-2.5 px-3">WhatsApp Number</th>
                <th className="py-2.5 px-3">City & Address</th>
                <th className="py-2.5 px-3">Campaign & Follow-Up</th>
                <th className="py-2.5 px-3">Consent</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDirectory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No showrooms match the current filter. Upload an Excel sheet or clear your search filter.
                  </td>
                </tr>
              ) : (
                filteredDirectory.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !item.isValidPhone ? 'bg-red-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        disabled={!item.isValidPhone || !item.optedIn}
                        checked={item.selectedForCampaign && item.isValidPhone && item.optedIn}
                        onChange={(e) =>
                          onUpdateShowroom(item.id, {
                            selectedForCampaign: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#0B1F3A] disabled:opacity-40"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.showroomName}</div>
                      <div className="text-slate-500 mt-0.5">
                        <span>{item.category}</span>
                        {item.email && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{item.email}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.contactPerson ? (
                        <span className="font-medium text-slate-800">{item.contactPerson}</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="+ Add Owner Name"
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              onUpdateShowroom(item.id, {
                                contactPerson: e.target.value.trim(),
                              });
                            }
                          }}
                          className="px-2 py-0.5 text-xs border border-amber-300 bg-amber-50 rounded text-amber-900 placeholder:text-amber-700"
                        />
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      {item.isValidPhone ? (
                        <span className="text-slate-900 font-medium">{item.formattedPhone}</span>
                      ) : (
                        <div>
                          <span className="text-red-700 font-medium">{item.rawPhone || 'Missing'}</span>
                          <div className="text-[11px] text-red-600 font-sans">
                            Invalid Indian Mobile
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{item.city}</div>
                      {item.address && (
                        <div className="text-slate-500 truncate max-w-[200px]" title={item.address}>
                          {item.address}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800 font-medium">
                        <span>{item.campaignStatus}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-slate-600">{item.followUpStatus}</span>
                      </div>
                      {item.lastContactDate && (
                        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          Last contact:{' '}
                          {new Date(item.lastContactDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateShowroom(item.id, {
                            optedIn: !item.optedIn,
                            selectedForCampaign: !item.optedIn ? item.isValidPhone : false,
                          })
                        }
                        className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer ${
                          item.optedIn ? 'text-emerald-700' : 'text-red-600'
                        }`}
                        title="Toggle business communication consent / opt-out status"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {item.optedIn ? 'Opted In' : 'Opted Out'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteShowroom(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Remove showroom from local directory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

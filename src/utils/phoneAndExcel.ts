import * as XLSX from 'xlsx';
import {
  ColumnMapping,
  DealerCategory,
  FollowUpStatus,
  MessageTemplate,
  ParsedPreviewRow,
  ShowroomContact,
} from '../types/outreach';

export const DEFAULT_ORACLIME_MESSAGE = `Namaste {NAME} Ji,

Hum ORACLIME se hain. Hum AC installation, repair aur servicing ka kaam karte hain.

Hum aapke showroom ke saath ek business partnership shuru karna chahte hain.

Aapke showroom se jo customers AC purchase karte hain, unki installation aur servicing ki responsibility hum professionally handle kar sakte hain.

Isse aapko apne customers ke liye reliable installation service milegi aur har successful referral par additional earning ka opportunity bhi rahega.

Agar aap interested hain, toh hum partnership ke baare mein aapse short discussion karna chahenge.

Dhanyavaad!

Team ORACLIME`;

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'default-hinglish',
    name: 'Standard Showroom Partnership (Default)',
    description: 'Official ORACLIME Hindi-English outreach message for AC showrooms & dealers',
    content: DEFAULT_ORACLIME_MESSAGE,
  },
  {
    id: 'personalized-showroom-city',
    name: 'City & Showroom Personalized Pitch',
    description: 'Includes {BUSINESS_NAME} and {CITY} placeholders for hyper-local dealer credibility',
    content: `Namaste {NAME} Ji,

Hum ORACLIME ({CITY} HVAC Services Division) se hain. Hum Split AC installation, Window AC installation, AC repair aur servicing ka kaam karte hain.

Hum {BUSINESS_NAME} ke saath {CITY} mein ek long-term business partnership shuru karna chahte hain.

{BUSINESS_NAME} se jo customers naya AC purchase karte hain, unki same-day installation aur post-sales servicing ki responsibility hum professionally handle kar sakte hain.

Isse aapko apne customers ke liye reliable installation service milegi aur har successful referral par fixed partner commission / additional earning ka opportunity bhi rahega.

Agar aap interested hain, toh hum partnership ke baare mein aapse short discussion karna chahenge.

Dhanyavaad!

Team ORACLIME`,
  },
  {
    id: 'english-executive',
    name: 'Executive English Dealer Proposal',
    description: 'Formal English partnership proposal for multi-brand electronics & AC chains',
    content: `Dear {NAME} Ji,

Greetings from ORACLIME HVAC Services.

We specialize in professional Split AC Installation, Window AC Installation, AC Repair, Servicing, and Annual Maintenance across {CITY}.

We would like to establish an authorized installation & service referral partnership with {BUSINESS_NAME}. For every customer purchasing an air conditioner from your showroom, ORACLIME guarantees priority installation by certified technicians along with attractive referral payouts for your showroom on every completed job.

May we schedule a brief 5-minute call or showroom visit on {PHONE} to share our Dealer Partner Rate Card?

Warm regards,
Team ORACLIME`,
  },
];

export const FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  'Not Contacted',
  'Message Sent',
  'Interested',
  'Not Interested',
  'Call Required',
  'Meeting Required',
  'Partnership Confirmed',
  'No Response',
];

export const DEALER_CATEGORIES: DealerCategory[] = [
  'AC Showroom',
  'Air Conditioning Dealer',
  'Electronics Showroom',
  'Multi-brand AC Dealer',
  'Local AC Retailer',
];

/**
 * Validates and normalizes an Indian mobile number.
 * Accepts:
 * - 10-digit numbers starting with 6, 7, 8, 9 (e.g. 9876543210)
 * - 11-digit numbers starting with 0 (e.g. 09876543210)
 * - 12-digit numbers starting with 91 (e.g. 919876543210, +91 98765-43210)
 * - 13-digit numbers starting with 091
 */
export function validateIndianMobile(rawInput: unknown): {
  raw: string;
  normalized: string;
  formatted: string;
  isValid: boolean;
  reason: string;
} {
  const raw = String(rawInput ?? '').trim();
  if (!raw) {
    return {
      raw: '',
      normalized: '',
      formatted: 'Missing Number',
      isValid: false,
      reason: 'Empty phone number',
    };
  }

  // Strip all non-digit characters
  let digits = raw.replace(/\D/g, '');

  // Handle prefixes like 0091, 091, 91, 0
  if (digits.length === 14 && digits.startsWith('0091')) {
    digits = digits.slice(4);
  } else if (digits.length === 13 && digits.startsWith('091')) {
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return {
      raw,
      normalized: digits,
      formatted: raw,
      isValid: false,
      reason: `Expected 10 digits (found ${digits.length})`,
    };
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      raw,
      normalized: digits,
      formatted: raw,
      isValid: false,
      reason: 'Must start with 6, 7, 8, or 9 (Indian mobile standard)',
    };
  }

  // Also check obvious dummy sequences like 9999999999 or 6666666666
  if (/^(\d)\1{9}$/.test(digits)) {
    return {
      raw,
      normalized: `91${digits}`,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      isValid: false,
      reason: 'Repeated digit placeholder number',
    };
  }

  return {
    raw,
    normalized: `91${digits}`,
    formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    isValid: true,
    reason: 'Valid Indian Mobile',
  };
}

/**
 * Replaces {NAME}, {BUSINESS_NAME}, {PHONE}, {CITY} placeholders
 */
export function personalizeShowroomMessage(
  template: string,
  showroom: Pick<ShowroomContact, 'contactPerson' | 'showroomName' | 'formattedPhone' | 'rawPhone' | 'city'>
): string {
  const cleanName = showroom.contactPerson?.trim() || showroom.showroomName?.trim() || 'Partner';
  const cleanBusiness = showroom.showroomName?.trim() || 'Aapke Showroom';
  const cleanPhone = showroom.formattedPhone || showroom.rawPhone || '';
  const cleanCity = showroom.city?.trim() || 'aapke city';

  return template
    .replace(/\{NAME\}/gi, cleanName)
    .replace(/\{BUSINESS_NAME\}/gi, cleanBusiness)
    .replace(/\{PHONE\}/gi, cleanPhone)
    .replace(/\{CITY\}/gi, cleanCity);
}

/**
 * Builds an official WhatsApp Click-to-Chat URL.
 * Uses https://wa.me/<phone>?text=<encodedText> or https://web.whatsapp.com/send
 */
export function buildOfficialWhatsAppUrl(
  normalizedPhone: string,
  personalizedMessage: string,
  useWhatsAppWeb = false
): string {
  const cleanDigits = normalizedPhone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(personalizedMessage);
  if (useWhatsAppWeb) {
    return `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encodedMessage}`;
  }
  return `https://wa.me/${cleanDigits}?text=${encodedMessage}`;
}

/**
 * Automatically detects column mapping from spreadsheet headers and sample rows.
 */
export function detectColumnMapping(headers: string[], sampleRows: Record<string, unknown>[]): ColumnMapping {
  const mapping: ColumnMapping = {
    showroomName: '',
    contactPerson: '',
    whatsappNumber: '',
    email: '',
    city: '',
    address: '',
    category: '',
  };

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const h of headers) {
    const n = norm(h);
    if (
      !mapping.showroomName &&
      (n.includes('showroom') ||
        n.includes('business') ||
        n.includes('shop') ||
        n.includes('dealer') ||
        n.includes('store') ||
        n.includes('company') ||
        n === 'firmname')
    ) {
      mapping.showroomName = h;
    } else if (
      !mapping.contactPerson &&
      (n.includes('owner') ||
        n.includes('contactperson') ||
        n.includes('person') ||
        n.includes('proprietor') ||
        n.includes('manager') ||
        n === 'name' ||
        n === 'contactname' ||
        n === 'fullname')
    ) {
      mapping.contactPerson = h;
    } else if (
      !mapping.whatsappNumber &&
      (n.includes('whatsapp') ||
        n.includes('mobile') ||
        n.includes('phone') ||
        n.includes('contactno') ||
        n.includes('number') ||
        n.includes('cell') ||
        n === 'tel')
    ) {
      mapping.whatsappNumber = h;
    } else if (!mapping.email && (n.includes('email') || n.includes('mail'))) {
      mapping.email = h;
    } else if (!mapping.city && (n.includes('city') || n.includes('town') || n.includes('district') || n.includes('location'))) {
      mapping.city = h;
    } else if (!mapping.address && (n.includes('address') || n.includes('street') || n.includes('area') || n.includes('market'))) {
      mapping.address = h;
    } else if (!mapping.category && (n.includes('category') || n.includes('type') || n.includes('segment'))) {
      mapping.category = h;
    }
  }

  // Fallback content-based mobile number column detection if header name was generic (e.g., "Col 3")
  if (!mapping.whatsappNumber && sampleRows.length > 0) {
    let bestHeader = '';
    let bestValidCount = 0;

    for (const h of headers) {
      let validCount = 0;
      for (const row of sampleRows.slice(0, 15)) {
        const check = validateIndianMobile(row[h]);
        if (check.isValid) validCount++;
      }
      if (validCount > bestValidCount) {
        bestValidCount = validCount;
        bestHeader = h;
      }
    }

    if (bestHeader) {
      mapping.whatsappNumber = bestHeader;
    }
  }

  // Fallback for showroomName if still empty: pick first text column not already used
  if (!mapping.showroomName && headers.length > 0) {
    const unused = headers.find(
      (h) =>
        h !== mapping.whatsappNumber &&
        h !== mapping.contactPerson &&
        h !== mapping.email &&
        h !== mapping.city &&
        h !== mapping.address
    );
    if (unused) mapping.showroomName = unused;
  }

  return mapping;
}

export function inferDealerCategory(rawCategory: string, showroomName: string): DealerCategory {
  const combined = `${rawCategory} ${showroomName}`.toLowerCase();
  if (combined.includes('multi') || combined.includes('plaza') || combined.includes('world')) {
    return 'Multi-brand AC Dealer';
  }
  if (combined.includes('electronic') || combined.includes('vision') || combined.includes('digital')) {
    return 'Electronics Showroom';
  }
  if (combined.includes('dealer') || combined.includes('agency') || combined.includes('distributor')) {
    return 'Air Conditioning Dealer';
  }
  if (combined.includes('retail') || combined.includes('mart') || combined.includes('appliance')) {
    return 'Local AC Retailer';
  }
  return 'AC Showroom';
}

/**
 * Transforms raw spreadsheet objects + current ColumnMapping into validated preview rows.
 */
export function buildPreviewRowsFromRaw(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
  existingShowrooms: ShowroomContact[]
): ParsedPreviewRow[] {
  const existingPhones = new Set(
    existingShowrooms.map((s) => s.normalizedPhone).filter((p) => p.length > 0)
  );
  const seenInFile = new Set<string>();

  return rawRows.map((row, index) => {
    const showroomName = mapping.showroomName ? String(row[mapping.showroomName] ?? '').trim() : '';
    const contactPerson = mapping.contactPerson ? String(row[mapping.contactPerson] ?? '').trim() : '';
    const rawPhoneVal = mapping.whatsappNumber ? row[mapping.whatsappNumber] : '';
    const email = mapping.email ? String(row[mapping.email] ?? '').trim() : '';
    const city = mapping.city ? String(row[mapping.city] ?? '').trim() : '';
    const address = mapping.address ? String(row[mapping.address] ?? '').trim() : '';
    const rawCategory = mapping.category ? String(row[mapping.category] ?? '').trim() : '';

    const phoneCheck = validateIndianMobile(rawPhoneVal);
    const key = phoneCheck.normalized || phoneCheck.raw;

    const isDuplicateInFile = Boolean(key && seenInFile.has(key));
    if (key) {
      seenInFile.add(key);
    }
    const isDuplicateInSaved = Boolean(phoneCheck.normalized && existingPhones.has(phoneCheck.normalized));

    const isMissingShowroomName = showroomName.length === 0;
    const isMissingContactName = contactPerson.length === 0;

    // By default, include rows that have a valid phone and aren't duplicates
    const includeInImport = phoneCheck.isValid && !isDuplicateInFile && !isDuplicateInSaved;

    return {
      tempId: `preview-${index}-${Date.now()}`,
      rowIndex: index + 1,
      showroomName,
      contactPerson,
      rawPhone: phoneCheck.raw,
      normalizedPhone: phoneCheck.normalized,
      formattedPhone: phoneCheck.formatted,
      isValidPhone: phoneCheck.isValid,
      phoneReason: phoneCheck.reason,
      email,
      city: city || 'Delhi NCR',
      address,
      category: inferDealerCategory(rawCategory, showroomName),
      isDuplicateInFile,
      isDuplicateInSaved,
      isMissingShowroomName,
      isMissingContactName,
      includeInImport,
    };
  });
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into headers and row records.
 */
export async function parseExcelOrCsvFile(file: File): Promise<{
  headers: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded file contains no sheets.');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (jsonRows.length === 0) {
    throw new Error('The uploaded sheet has no data rows.');
  }

  const headers = Object.keys(jsonRows[0]);
  return {
    headers,
    rows: jsonRows,
    sheetName: firstSheetName,
  };
}

/**
 * Sample Raw Data for testing the Excel Import and Column Mapper immediately,
 * or downloading as a sample .xlsx template.
 */
export const SAMPLE_EXCEL_UPLOAD_ROWS: Record<string, unknown>[] = [
  {
    'Showroom Name': 'Shree Balaji Cooling Point',
    'Owner / Contact Person Name': 'Vikramaditya Garg',
    'WhatsApp Number': '9811234501',
    Email: 'vikram@balajicooling.in',
    City: 'New Delhi',
    Address: 'Shop 14, Kamla Nagar Main Market, New Delhi',
    Category: 'AC Showroom',
  },
  {
    'Showroom Name': 'Metro Multi-Brand AC Plaza',
    'Owner / Contact Person Name': 'Harish Malhotra',
    'WhatsApp Number': '+91 98710 44219',
    Email: 'sales@metroacplaza.com',
    City: 'Gurugram',
    Address: 'SCO 28, Sector 14 Market, Gurugram',
    Category: 'Multi-brand AC Dealer',
  },
  {
    'Showroom Name': 'Apex Aircon & Refrigeration',
    'Owner / Contact Person Name': 'Syed Tariq Anwar',
    'WhatsApp Number': '09910458821',
    Email: 'tariq@apexaircon.in',
    City: 'Noida',
    Address: 'G-9, Atta Market, Sector 27, Noida',
    Category: 'Air Conditioning Dealer',
  },
  {
    'Showroom Name': 'Khandelwal Electronics & AC World',
    'Owner / Contact Person Name': '', // Missing contact person name to demonstrate missing-name detection
    'WhatsApp Number': '9717882340',
    Email: 'info@khandelwalelectronics.in',
    City: 'Jaipur',
    Address: 'MI Road, Near Panch Batti, Jaipur',
    Category: 'Electronics Showroom',
  },
  {
    'Showroom Name': 'Shree Balaji Cooling Point (Branch Duplicate)',
    'Owner / Contact Person Name': 'Vikramaditya Garg',
    'WhatsApp Number': '9811234501', // Intentional duplicate to demonstrate duplicate detection
    Email: 'vikram@balajicooling.in',
    City: 'New Delhi',
    Address: 'Kamla Nagar, New Delhi',
    Category: 'AC Showroom',
  },
  {
    'Showroom Name': 'CoolBreeze Local Appliances',
    'Owner / Contact Person Name': 'Dinesh Prajapati',
    'WhatsApp Number': '54321990', // Intentional invalid number to demonstrate mobile validation
    Email: 'dinesh@coolbreeze.in',
    City: 'Ghaziabad',
    Address: 'Indirapuram Habitat Centre Road, Ghaziabad',
    Category: 'Local AC Retailer',
  },
  {
    'Showroom Name': 'Navrang Cooling Solutions',
    'Owner / Contact Person Name': 'Prakash Mehta',
    'WhatsApp Number': '9825077312',
    Email: 'prakash@navrangcooling.com',
    City: 'Ahmedabad',
    Address: 'CG Road, Navrangpura, Ahmedabad',
    Category: 'Multi-brand AC Dealer',
  },
];

/**
 * Downloads a sample Excel (.xlsx) template containing realistic AC showrooms.
 */
export function downloadSampleShowroomExcel(): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_EXCEL_UPLOAD_ROWS);
  worksheet['!cols'] = [
    { wch: 34 },
    { wch: 28 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 38 },
    { wch: 24 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AC Showrooms');
  XLSX.writeFile(workbook, 'ORACLIME_Showroom_Upload_Template.xlsx');
}

/**
 * Exports the Showroom Partnership Outreach Report to Excel (.xlsx) or CSV (.csv)
 * Exact required columns:
 * - Showroom Name
 * - Contact Person
 * - Mobile Number
 * - City
 * - Campaign Status
 * - Follow-up Status
 * - Notes
 * - Last Contact Date
 */
export function exportOutreachReport(
  showrooms: ShowroomContact[],
  format: 'xlsx' | 'csv' = 'xlsx'
): void {
  const reportRows = showrooms.map((s) => ({
    'Showroom Name': s.showroomName,
    'Contact Person': s.contactPerson || 'Not Specified',
    'Mobile Number': s.formattedPhone || s.rawPhone,
    City: s.city,
    'Campaign Status': s.campaignStatus,
    'Follow-up Status': s.followUpStatus,
    Notes: s.notes || '',
    'Last Contact Date': s.lastContactDate
      ? new Date(s.lastContactDate).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Never Contacted',
  }));

  const worksheet = XLSX.utils.json_to_sheet(reportRows);
  worksheet['!cols'] = [
    { wch: 32 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ORACLIME Partner Report');

  const dateStamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    XLSX.writeFile(workbook, `ORACLIME_Showroom_Outreach_Report_${dateStamp}.csv`, {
      bookType: 'csv',
    });
  } else {
    XLSX.writeFile(workbook, `ORACLIME_Showroom_Outreach_Report_${dateStamp}.xlsx`, {
      bookType: 'xlsx',
    });
  }
}

export const INITIAL_ORACLIME_SHOWROOMS: ShowroomContact[] = [
  {
    id: 'ora-showroom-1',
    showroomName: 'Rajdhani Aircon & Daikin Studio',
    contactPerson: 'Rajesh Sharma',
    rawPhone: '9810423189',
    normalizedPhone: '919810423189',
    formattedPhone: '+91 98104 23189',
    isValidPhone: true,
    email: 'rajesh@rajdhaniaircon.in',
    city: 'New Delhi',
    address: 'B-12, Lajpat Nagar II Central Market, New Delhi',
    category: 'AC Showroom',
    selectedForCampaign: true,
    campaignStatus: 'Pending',
    followUpStatus: 'Not Contacted',
    notes: 'High-volume Split & Window AC counter; sells 15+ units daily in summer.',
    lastContactDate: null,
    optedIn: true,
    interestedServices: ['Split AC Installation', 'Window AC Installation', 'AC Servicing'],
  },
  {
    id: 'ora-showroom-2',
    showroomName: 'Vardhman Multi-Brand Cooling Hub',
    contactPerson: 'Ankit Jain',
    rawPhone: '9873156092',
    normalizedPhone: '919873156092',
    formattedPhone: '+91 98731 56092',
    isValidPhone: true,
    email: 'ankit@vardhmancooling.com',
    city: 'Gurugram',
    address: 'Shop 4 & 5, Sadar Bazar Road, Gurugram',
    category: 'Multi-brand AC Dealer',
    selectedForCampaign: true,
    campaignStatus: 'Pending',
    followUpStatus: 'Not Contacted',
    notes: 'Looking for third-party installation vendor for Lloyd & Voltas split ACs.',
    lastContactDate: null,
    optedIn: true,
    interestedServices: ['Split AC Installation', 'AC Maintenance'],
  },
  {
    id: 'ora-showroom-3',
    showroomName: 'capital Electronics & Appliances',
    contactPerson: 'Sandeep Verma',
    rawPhone: '9911087654',
    normalizedPhone: '919911087654',
    formattedPhone: '+91 99110 87654',
    isValidPhone: true,
    email: 'sandeep.verma@capitalelectronics.in',
    city: 'Noida',
    address: 'C-44, Sector 18 Market, Noida',
    category: 'Electronics Showroom',
    selectedForCampaign: true,
    campaignStatus: 'Sent',
    followUpStatus: 'Interested',
    notes: 'Requested ORACLIME standard copper piping & installation rate card.',
    lastContactDate: '2026-10-30T11:20:00.000Z',
    optedIn: true,
    interestedServices: ['Split AC Installation', 'Window AC Installation', 'AC Repair'],
  },
  {
    id: 'ora-showroom-4',
    showroomName: 'Hindustan Refrigeration & AC Dealers',
    contactPerson: 'Mohd. Farooq Khan',
    rawPhone: '9818654321',
    normalizedPhone: '919818654321',
    formattedPhone: '+91 98186 54321',
    isValidPhone: true,
    email: 'farooq@hindustanac.in',
    city: 'Faridabad',
    address: 'NIT 1 Market, Near Neelam Chowk, Faridabad',
    category: 'Air Conditioning Dealer',
    selectedForCampaign: true,
    campaignStatus: 'Sent',
    followUpStatus: 'Partnership Confirmed',
    notes: 'Partnership confirmed. Referring all out-of-warranty AC servicing & new Split AC installations.',
    lastContactDate: '2026-10-29T15:45:00.000Z',
    optedIn: true,
    interestedServices: ['Split AC Installation', 'AC Repair', 'AC Servicing', 'AC Maintenance'],
  },
  {
    id: 'ora-showroom-5',
    showroomName: 'Surya Retail AC & Cooler House',
    contactPerson: 'Maheshwari Prasad',
    rawPhone: '9711223344',
    normalizedPhone: '919711223344',
    formattedPhone: '+91 97112 23344',
    isValidPhone: true,
    email: 'suryaretail@gmail.com',
    city: 'Ghaziabad',
    address: 'RDC Raj Nagar, Ghaziabad',
    category: 'Local AC Retailer',
    selectedForCampaign: true,
    campaignStatus: 'Sent',
    followUpStatus: 'Meeting Required',
    notes: 'Owner asked to visit showroom on Tuesday afternoon to finalize referral payout terms.',
    lastContactDate: '2026-10-31T09:30:00.000Z',
    optedIn: true,
    interestedServices: ['Window AC Installation', 'Split AC Installation'],
  },
  {
    id: 'ora-showroom-6',
    showroomName: 'Classic Air Conditioning Traders',
    contactPerson: 'Rakesh Bansal',
    rawPhone: '011234567',
    normalizedPhone: '11234567',
    formattedPhone: '011234567',
    isValidPhone: false,
    phoneValidationReason: 'Landline / Invalid 10-digit Indian mobile number',
    email: 'classictraders@yahoo.in',
    city: 'New Delhi',
    address: 'Daryaganj Main Road, New Delhi',
    category: 'AC Showroom',
    selectedForCampaign: false,
    campaignStatus: 'Invalid Number',
    followUpStatus: 'Not Contacted',
    notes: 'Uploaded landline number instead of WhatsApp mobile; need owner cell number.',
    lastContactDate: null,
    optedIn: true,
    interestedServices: ['Split AC Installation'],
  },
];

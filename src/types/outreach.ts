export type CampaignStatus = 'Pending' | 'Sent' | 'Skipped' | 'Invalid Number';

export type FollowUpStatus =
  | 'Not Contacted'
  | 'Message Sent'
  | 'Interested'
  | 'Not Interested'
  | 'Call Required'
  | 'Meeting Required'
  | 'Partnership Confirmed'
  | 'No Response';

export type DealerCategory =
  | 'AC Showroom'
  | 'Air Conditioning Dealer'
  | 'Electronics Showroom'
  | 'Multi-brand AC Dealer'
  | 'Local AC Retailer';

export type HvacServiceScope =
  | 'Split AC Installation'
  | 'Window AC Installation'
  | 'AC Repair'
  | 'AC Servicing'
  | 'AC Maintenance';

export interface ShowroomContact {
  id: string;
  showroomName: string;
  contactPerson: string;
  rawPhone: string;
  normalizedPhone: string; // e.g. "919876543210"
   formattedPhone: string;  // e.g. "+91 98765 43210"
  isValidPhone: boolean;
  phoneValidationReason?: string;
  email: string;
  city: string;
  address: string;
  category: DealerCategory;
  selectedForCampaign: boolean;
  campaignStatus: CampaignStatus;
  followUpStatus: FollowUpStatus;
  notes: string;
  lastContactDate: string | null; // ISO string or formatted date
  whatsappOpenedAt?: string | null;
  optedIn: boolean;
  interestedServices: HvacServiceScope[];
}

export interface ColumnMapping {
  showroomName: string;
  contactPerson: string;
  whatsappNumber: string;
  email: string;
  city: string;
  address: string;
  category: string;
}

export interface ParsedPreviewRow {
  tempId: string;
  rowIndex: number;
  showroomName: string;
  contactPerson: string;
  rawPhone: string;
  normalizedPhone: string;
  formattedPhone: string;
  isValidPhone: boolean;
  phoneReason: string;
  email: string;
  city: string;
  address: string;
  category: DealerCategory;
  isDuplicateInFile: boolean;
  isDuplicateInSaved: boolean;
  isMissingShowroomName: boolean;
  isMissingContactName: boolean;
  includeInImport: boolean;
}

export type CampaignExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'stopped';

export interface CampaignSessionState {
  status: CampaignExecutionState;
  currentShowroomId: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  useWhatsAppWebUrl: boolean;
  autoAdvanceOnConfirm: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type LeadStageStatus =
  | 'New Lead'
  | 'Not Contacted'
  | 'Contacted'
  | 'Message Sent'
  | 'Response Received'
  | 'Interested'
  | 'Negotiation'
  | 'Follow-up Pending'
  | 'Partnership Confirmed'
  | 'Not Interested'
  | 'Not Responding'
  | 'Invalid Lead'
  | 'Duplicate Lead';

export type BusinessCategory =
  | 'AC Showroom'
  | 'AC Dealer'
  | 'Electronics Showroom'
  | 'Multi-brand AC Dealer'
  | 'Local AC Retailer'
  | 'Business Partner';

export type LeadPriority = 'High' | 'Medium' | 'Low';

export type PartnershipStatus =
  | 'Interested'
  | 'Discussion'
  | 'Negotiation'
  | 'Agreement Pending'
  | 'Active Partner'
  | 'Inactive Partner'
  | 'Rejected';

export type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Overdue'
  | 'Cancelled';

export type IssueCategory =
  | 'Invalid Number'
  | 'WhatsApp Unavailable'
  | 'No Response'
  | 'Wrong Contact'
  | 'Duplicate Lead'
  | 'Incorrect Business Information'
  | 'Commission Discussion'
  | 'Partnership Terms'
  | 'Other';

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';

export type CampaignStatusType =
  | 'Draft'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Stopped';

export interface CrmUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  phone: string;
  city: string;
  assignedManagerId: string;
  active: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmLead {
  id: string;
  leadCode: string;
  showroomName: string;
  businessName: string;
  ownerName: string;
  contactPerson: string;
  whatsappNumber: string;
  normalizedPhone: string;
  formattedPhone: string;
  isValidPhone: boolean;
  alternativeNumber: string;
  email: string;
  city: string;
  state: string;
  fullAddress: string;
  businessCategory: BusinessCategory;
  leadSource: string;
  assignedManager: string; // User ID or Name
  assignedStaff: string;   // User ID or Name
  priority: LeadPriority;
  status: LeadStageStatus;
  createdDate: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  remarks: string;
  optedOut: boolean;
  isDeleted: boolean;
  deletedAt: string;
  deletedBy: string;
  deletionReason: string;
  createdByUid: string;
  chatOpenedAt?: string;
  messageConfirmedAt?: string;
}

export interface CrmFollowUp {
  id: string;
  leadId: string;
  showroomName: string;
  contactPerson: string;
  phone: string;
  city: string;
  scheduledAt: string;
  assignedStaff: string;
  notes: string;
  callOutcome: string;
  customerResponse: string;
  status: 'Pending' | 'Completed' | 'Overdue' | 'Rescheduled';
  createdByUid: string;
  createdAt: string;
}

export interface CrmPartnership {
  id: string;
  partnershipCode: string;
  leadId: string;
  showroomName: string;
  ownerName: string;
  contactDetails: string;
  city: string;
  partnershipDate: string;
  status: PartnershipStatus;
  agreedCommissionTerms: string;
  serviceCategories: string;
  agreementNotes: string;
  assignedManager: string;
  nextReviewDate: string;
  createdByUid: string;
}

export interface CrmTask {
  id: string;
  title: string;
  description: string;
  assignedStaff: string;
  relatedLeadId: string;
  relatedLeadName: string;
  priority: LeadPriority;
  dueDate: string;
  status: TaskStatus;
  createdByUid: string;
  createdAt: string;
}

export interface CrmIssue {
  id: string;
  category: IssueCategory;
  leadId: string;
  showroomName: string;
  priority: LeadPriority;
  assignedPerson: string;
  description: string;
  resolutionNotes: string;
  status: IssueStatus;
  createdByUid: string;
  createdAt: string;
}

export interface CrmCampaign {
  id: string;
  name: string;
  campaignType: string;
  templateId: string;
  assignedUser: string;
  startDate: string;
  endDate: string;
  status: CampaignStatusType;
  leadIds: string[];
  chatsOpenedIds: string[];
  confirmedSentIds: string[];
  skippedIds: string[];
  interestedIds: string[];
  optOutIds: string[];
  selectedCount: number;
  chatsOpenedCount: number;
  confirmedSentCount: number;
  pendingCount: number;
  skippedCount: number;
  interestedCount: number;
  optOutCount: number;
  createdByUid: string;
}

export interface CrmMessageTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface CrmActivityLog {
  id: string;
  leadId: string;
  showroomName: string;
  actionType:
    | 'Lead Created'
    | 'Lead Edited'
    | 'Lead Assigned'
    | 'WhatsApp Chat Opened'
    | 'Message Manually Confirmed'
    | 'Call Recorded'
    | 'Follow-up Created'
    | 'Status Changed'
    | 'Partnership Created'
    | 'Issue Created'
    | 'Lead Deleted'
    | 'Lead Restored'
    | 'User Login'
    | 'User Account Deleted'
    | 'Excel Import';
  details: string;
  performedBy: string;
  performedByRole: UserRole;
  createdByUid: string;
  timestamp: string;
}

export interface CrmImportBatch {
  id: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  suspectedFakeCount: number;
  importedBy: string;
  timestamp: string;
}

export interface CrmNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export type CrmModuleRoute =
  | 'dashboard'
  | 'leads'
  | 'contacts'
  | 'pipeline'
  | 'whatsapp'
  | 'campaigns'
  | 'followups'
  | 'partnerships'
  | 'tasks'
  | 'issues'
  | 'reports'
  | 'user_management'
  | 'team'
  | 'recycle'
  | 'settings';


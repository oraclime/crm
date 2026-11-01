import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquareText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ShowroomContact } from '../types/outreach';
import {
  buildOfficialWhatsAppUrl,
  DEFAULT_ORACLIME_MESSAGE,
  MESSAGE_TEMPLATES,
  personalizeShowroomMessage,
} from '../utils/phoneAndExcel';

interface MessageComposerProps {
  messageTemplate: string;
  onChangeTemplate: (newTemplate: string) => void;
  showrooms: ShowroomContact[];
  useWhatsAppWebUrl: boolean;
  onProceedToCampaign: () => void;
}

const PLACEHOLDERS = [
  { tag: '{NAME}', description: 'Owner / Contact Person Name (e.g. Rajesh Sharma)' },
  { tag: '{BUSINESS_NAME}', description: 'AC Showroom / Dealer Name' },
  { tag: '{PHONE}', description: 'Showroom WhatsApp Mobile Number' },
  { tag: '{CITY}', description: 'Showroom City Location' },
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  messageTemplate,
  onChangeTemplate,
  showrooms,
  useWhatsAppWebUrl,
  onProceedToCampaign,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const validShowrooms = showrooms.filter((s) => s.isValidPhone);
  const [previewShowroomId, setPreviewShowroomId] = useState<string>(
    validShowrooms[0]?.id || showrooms[0]?.id || ''
  );
  const [copiedPreview, setCopiedPreview] = useState(false);

  const selectedPreviewShowroom: ShowroomContact =
    showrooms.find((s) => s.id === previewShowroomId) ||
    validShowrooms[0] || {
      id: 'sample',
      showroomName: 'Rajdhani Aircon & Daikin Studio',
      contactPerson: 'Rajesh Sharma',
      rawPhone: '9810423189',
      normalizedPhone: '919810423189',
      formattedPhone: '+91 98104 23189',
      isValidPhone: true,
      email: 'rajesh@rajdhaniaircon.in',
      city: 'New Delhi',
      address: 'Lajpat Nagar II, New Delhi',
      category: 'AC Showroom',
      selectedForCampaign: true,
      campaignStatus: 'Pending',
      followUpStatus: 'Not Contacted',
      notes: '',
      lastContactDate: null,
      optedIn: true,
      interestedServices: ['Split AC Installation'],
    };

  const personalizedPreviewText = personalizeShowroomMessage(
    messageTemplate,
    selectedPreviewShowroom
  );

  const sampleWhatsAppHref = buildOfficialWhatsAppUrl(
    selectedPreviewShowroom.normalizedPhone || '919810423189',
    personalizedPreviewText,
    useWhatsAppWebUrl
  );

  const handleInsertPlaceholder = (placeholder: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChangeTemplate(`${messageTemplate} ${placeholder}`);
      return;
    }
    const start = el.selectionStart ?? messageTemplate.length;
    const end = el.selectionEnd ?? messageTemplate.length;
    const updated =
      messageTemplate.slice(0, start) + placeholder + messageTemplate.slice(end);
    onChangeTemplate(updated);

    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + placeholder.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(personalizedPreviewText);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              ORACLIME Showroom Partnership Message Generator
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Compose your HVAC installation & servicing referral pitch. Every showroom receives an automatically personalized message with their owner name, showroom name, city, and phone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangeTemplate(DEFAULT_ORACLIME_MESSAGE)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Default ORACLIME Message
            </button>
            <button
              type="button"
              onClick={onProceedToCampaign}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Proceed to Campaign Console →
            </button>
          </div>
        </div>

        {/* Preset Selector Row */}
        <div className="mt-6">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            ORACLIME Partnership Templates
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MESSAGE_TEMPLATES.map((tpl) => {
              const isSelected = messageTemplate.trim() === tpl.content.trim();
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onChangeTemplate(tpl.content)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#0B1F3A] bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                    {isSelected && (
                      <span className="text-[11px] font-semibold text-[#0B1F3A]">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{tpl.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Split: Editor on Left, Live Personalized WhatsApp Preview on Right */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Composer & Placeholders */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-semibold text-slate-800">
                  Message Template Editor
                </label>
                <span className="text-xs text-slate-500 tabular-nums">
                  {messageTemplate.length} characters · {messageTemplate.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              {/* Dynamic Placeholder Insertion Bar */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-t-lg border-b-0">
                <span className="text-xs font-medium text-slate-600 mr-1">
                  Insert Placeholder:
                </span>
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(p.tag)}
                    title={p.description}
                    className="px-2.5 py-1 text-xs font-mono font-semibold text-[#0B1F3A] bg-white hover:bg-blue-50 border border-slate-300 rounded transition-colors cursor-pointer"
                  >
                    + {p.tag}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                rows={14}
                value={messageTemplate}
                onChange={(e) => onChangeTemplate(e.target.value)}
                placeholder="Write your ORACLIME showroom outreach message here..."
                className="w-full p-4 text-sm leading-relaxed text-slate-900 bg-white border border-slate-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] font-sans"
              />
            </div>

            {/* Placeholder Reference Table */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Automatic Personalization Rules
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <code className="font-mono font-semibold text-slate-900">{'{NAME}'}</code> → Contact Person Name (or Showroom Name if missing)
                </div>
                <div>
                  <code className="font-mono font-semibold text-slate-900">{'{BUSINESS_NAME}'}</code> → Showroom / Dealer Name
                </div>
                <div>
                  <code className="font-mono font-semibold text-slate-900">{'{PHONE}'}</code> → Formatted Indian Mobile Number
                </div>
                <div>
                  <code className="font-mono font-semibold text-slate-900">{'{CITY}'}</code> → Showroom City Location
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Personalized Showroom Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-[#0B1F3A]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Personalized Preview
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer"
                >
                  {copiedPreview ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Text
                    </>
                  )}
                </button>
              </div>

              {/* Select Showroom to Preview */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Preview Personalization For Showroom:
                </label>
                <select
                  value={selectedPreviewShowroom.id}
                  onChange={(e) => setPreviewShowroomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                >
                  {showrooms.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.showroomName} ({s.contactPerson || 'No Owner Name'} · {s.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Metadata Summary */}
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-slate-900">
                  {selectedPreviewShowroom.showroomName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedPreviewShowroom.contactPerson || 'Fallback Name'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {selectedPreviewShowroom.formattedPhone}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedPreviewShowroom.city}</span>
              </div>

              {/* Rendered WhatsApp Message Paper */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                <div className="text-[11px] font-medium text-slate-400 mb-2">
                  Outgoing WhatsApp Message Preview
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
                  {personalizedPreviewText}
                </pre>
              </div>
            </div>

            {/* Test Official Click-to-Chat Link */}
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                Uses official <code className="font-mono">wa.me</code> click-to-chat protocol.
              </div>
              {selectedPreviewShowroom.isValidPhone && (
                <a
                  href={sampleWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test in WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

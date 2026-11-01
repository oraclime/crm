import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FastForward,
  Pause,
  Play,
  Plus,
  QrCode,
  SkipForward,
  Square,
  Trash2,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { buildOfficialWhatsAppUrl, personalizeShowroomMessage } from '../utils/phoneAndExcel';
import { BUSINESS_CATEGORIES } from '../utils/crmSeedAndHelpers';

/**
 * PART 8 – WHATSAPP CENTER
 */
export const WhatsAppCenterView: React.FC = () => {
  const {
    visibleLeads,
    templates,
    campaigns,
    whatsappWebConnected,
    setWhatsappWebConnected,
    recordWhatsAppChatOpened,
    recordWhatsAppMessageConfirmed,
    saveMessageTemplate,
    deleteMessageTemplate,
  } = useCrm();

  const [subTab, setSubTab] = useState<'dispatch' | 'web' | 'templates' | 'api'>('dispatch');

  // Manual Messaging Queue State
  const validLeads = useMemo(
    () => visibleLeads.filter((l) => l.isValidPhone && !l.optedOut),
    [visibleLeads]
  );
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(() =>
    validLeads.map((l) => l.id)
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [activeCampaignId, setActiveCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [runnerState, setRunnerState] = useState<'idle' | 'running' | 'paused' | 'stopped'>('running');
  const [useWebLink, setUseWebLink] = useState(false);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  // Template Editor State
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('AC Showroom');
  const [tplContent, setTplContent] = useState('');
  const [tplDefault, setTplDefault] = useState(false);

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) || templates[0];

  const queueLeads = useMemo(
    () => validLeads.filter((l) => selectedLeadIds.includes(l.id)),
    [validLeads, selectedLeadIds]
  );

  const currentLead = queueLeads[currentIndex] || queueLeads[0] || null;

  const personalizedText = useMemo(() => {
    if (!currentLead || !activeTemplate) return '';
    return personalizeShowroomMessage(activeTemplate.content, {
      contactPerson: currentLead.contactPerson || currentLead.ownerName,
      showroomName: currentLead.showroomName,
      formattedPhone: currentLead.formattedPhone,
      rawPhone: currentLead.whatsappNumber,
      city: currentLead.city,
    });
  }, [currentLead, activeTemplate]);

  const waHref = currentLead
    ? buildOfficialWhatsAppUrl(
        currentLead.normalizedPhone,
        personalizedText,
        useWebLink
      )
    : '#';

  const handleOpenWhatsApp = () => {
    if (!currentLead) return;
    recordWhatsAppChatOpened(currentLead.id, activeCampaignId || undefined);
  };

  const handleMarkSent = () => {
    if (!currentLead) return;
    recordWhatsAppMessageConfirmed(currentLead.id, activeCampaignId || undefined);
    if (currentIndex + 1 < queueLeads.length) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    if (!currentLead) return;
    setSkippedIds((prev) => [...prev, currentLead.id]);
    if (currentIndex + 1 < queueLeads.length) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleNextContact = () => {
    if (queueLeads.length === 0) return;
    setCurrentIndex((i) => (i + 1) % queueLeads.length);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplContent.trim()) return;
    saveMessageTemplate({
      id: editingTplId || undefined,
      name: tplName.trim(),
      category: tplCategory,
      content: tplContent,
      isDefault: tplDefault,
    });
    setEditingTplId(null);
    setTplName('');
    setTplContent('');
    setTplDefault(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            ORA CRM WhatsApp Center
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Official Click-to-Chat manual outreach, WhatsApp Web linking guide, dynamic templates, and Meta Cloud API architecture.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'dispatch', label: 'Manual Click-to-Chat Dispatch' },
              { id: 'web', label: 'WhatsApp Web Device Link' },
              { id: 'templates', label: 'Message Templates' },
              { id: 'api', label: 'Official Meta API Architecture' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                subTab === t.id
                  ? 'bg-white text-[#0B1F3A] font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* SUB-TAB A: WHATSAPP WEB CONNECTION & QR INSTRUCTIONS */}
      {subTab === 'web' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official WhatsApp Web & Business Device Linking
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                ORA CRM uses official browser sessions and Click-to-Chat URLs. No unofficial session tokens or headless bots are ever used.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWhatsappWebConnected(!whatsappWebConnected)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                  whatsappWebConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Manual Status: {whatsappWebConnected ? 'WhatsApp Web Linked' : 'Not Linked'}
              </button>
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Official WhatsApp Web
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <QrCode className="w-4 h-4 text-[#0B1F3A]" />
                <span>How to Link ORACLIME WhatsApp Business as a Device</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed">
                <li>
                  Click <strong>Open Official WhatsApp Web</strong> above to launch{' '}
                  <code className="font-mono">https://web.whatsapp.com</code> in a separate browser tab.
                </li>
                <li>
                  Open the <strong>WhatsApp Business</strong> app on your ORACLIME outreach phone.
                </li>
                <li>
                  Tap the three-dot menu (Android) or <strong>Settings</strong> (iOS) and select{' '}
                  <strong>Linked Devices → Link a Device</strong>.
                </li>
                <li>
                  Scan the official QR code displayed on WhatsApp Web.
                </li>
                <li>
                  Return to ORA CRM and toggle the manual connection status indicator to{' '}
                  <strong>WhatsApp Web Linked</strong>.
                </li>
              </ol>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                How to Safely Disconnect a Linked Device
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed">
                <li>
                  In your WhatsApp Web browser tab, click the menu icon above your chat list and select <strong>Log out</strong>.
                </li>
                <li>
                  Or from your mobile device, open <strong>WhatsApp Business → Linked Devices</strong>, tap the active browser session, and tap <strong>Log Out</strong>.
                </li>
                <li>
                  Toggle the manual indicator in ORA CRM to <strong>Not Linked</strong> when your shift ends.
                </li>
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* SUB-TAB B & D: CLICK-TO-CHAT & MANUAL MESSAGING RUNNER */}
      {subTab === 'dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Manual Outreach Dispatch Console */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">
                  Workflow: Select Leads → Select Template → Preview Message → Open WhatsApp → Manually Send → Confirm Sent → Next Contact
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Manual Click-to-Chat Dispatch Console
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {runnerState !== 'running' ? (
                  <button
                    type="button"
                    onClick={() => setRunnerState('running')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRunnerState('paused')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRunnerState('stopped')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>
            </div>

            {/* Template & Campaign Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Active Message Template
                </label>
                <select
                  value={activeTemplateId}
                  onChange={(e) => setActiveTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link to Campaign Tracker
                </label>
                <select
                  value={activeCampaignId}
                  onChange={(e) => setActiveCampaignId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">-- Standalone Dispatch --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentLead ? (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      Current Contact ({currentIndex + 1} of {queueLeads.length})
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {currentLead.showroomName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {currentLead.contactPerson || currentLead.ownerName} · {currentLead.city} ·{' '}
                      {currentLead.businessCategory}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-base font-mono font-bold text-[#0B1F3A] tabular-nums">
                      {currentLead.formattedPhone}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Chat Opened: {currentLead.chatOpenedAt ? 'Yes' : 'No'} · Confirmed Sent:{' '}
                      {currentLead.messageConfirmedAt ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>

                {/* Primary Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={runnerState === 'running' ? waHref : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (runnerState !== 'running') {
                        e.preventDefault();
                        return;
                      }
                      handleOpenWhatsApp();
                    }}
                    className={`inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white ${
                      runnerState === 'running'
                        ? 'bg-[#0B1F3A] hover:bg-[#15325b]'
                        : 'bg-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    1. Open WhatsApp
                  </a>

                  <button
                    type="button"
                    disabled={runnerState !== 'running'}
                    onClick={handleMarkSent}
                    className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    2. Mark Sent (Confirm)
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNextContact}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      Next Contact
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip ({skippedIds.length})
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWebLink}
                      onChange={(e) => setUseWebLink(e.target.checked)}
                    />
                    <span>Use web.whatsapp.com URL</span>
                  </label>
                </div>

                {/* Personalized Message Preview */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Personalized Outgoing Message Preview
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
                    {personalizedText}
                  </pre>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Select at least one valid showroom lead on the right to start dispatching.
              </div>
            )}
          </div>

          {/* Right 5 Columns: Lead Selection Queue */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">
                Select Target Leads ({queueLeads.length} / {validLeads.length})
              </h4>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds(validLeads.map((l) => l.id))}
                  className="text-blue-700 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[500px] overflow-y-auto text-xs">
              {validLeads.map((l) => {
                const isChecked = selectedLeadIds.includes(l.id);
                const isCurrent = currentLead?.id === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      const qIdx = queueLeads.findIndex((item) => item.id === l.id);
                      if (qIdx >= 0) setCurrentIndex(qIdx);
                    }}
                    className={`py-2.5 px-2.5 flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds((prev) => [...prev, l.id]);
                          } else {
                            setSelectedLeadIds((prev) =>
                              prev.filter((id) => id !== l.id)
                            );
                          }
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {l.showroomName}
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          {l.formattedPhone} · {l.city}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {l.messageConfirmedAt ? (
                        <span className="text-emerald-700 font-semibold">Confirmed Sent</span>
                      ) : l.chatOpenedAt ? (
                        <span className="text-blue-700 font-medium">Chat Opened</span>
                      ) : (
                        <span className="text-slate-500">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB C: MESSAGE TEMPLATES */}
      {subTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingTplId ? 'Edit Message Template' : 'Create New Message Template'}
            </h3>
            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. Summer AC Installation Referral Pitch"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Segment
                </label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Template Body (Placeholders: {'{NAME}'}, {'{BUSINESS_NAME}'}, {'{PHONE}'}, {'{CITY}'})
                  </label>
                </div>
                <div className="flex gap-1.5 mb-2">
                  {['{NAME}', '{BUSINESS_NAME}', '{PHONE}', '{CITY}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setTplContent((prev) => `${prev} ${ph}`)}
                      className="px-2 py-1 font-mono bg-slate-100 hover:bg-slate-200 rounded text-[#0B1F3A] cursor-pointer"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={8}
                  required
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg leading-relaxed"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tplDefault}
                  onChange={(e) => setTplDefault(e.target.checked)}
                />
                <span>Set as Default ORACLIME Partnership Template</span>
              </label>
              <div className="flex justify-end gap-2">
                {editingTplId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTplId(null);
                      setTplName('');
                      setTplContent('');
                    }}
                    className="px-3 py-2 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#0B1F3A] rounded-lg cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                    <span className="text-slate-500 ml-2">· {t.category}</span>
                    {t.isDefault && (
                      <span className="ml-2 font-semibold text-[#0B1F3A]">· Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTplId(t.id);
                        setTplName(t.name);
                        setTplCategory(t.category);
                        setTplContent(t.content);
                        setTplDefault(t.isDefault);
                      }}
                      className="text-blue-700 hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMessageTemplate(t.id)}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {t.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB E: OFFICIAL META WHATSAPP BUSINESS API FUTURE INTEGRATION */}
      {subTab === 'api' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Official Meta WhatsApp Business Platform Integration Architecture (Optional Module)
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              ORA CRM strictly separates Manual Click-to-Chat confirmations from Official Meta Cloud API webhook delivery statuses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-bold text-slate-900">
                1. Manual Click-to-Chat (Active Now)
              </div>
              <p className="text-slate-600">
                Uses official <code className="font-mono">https://wa.me/</code> links. Tracks{' '}
                <strong>Chat Opened</strong> separately from <strong>Manually Confirmed Sent</strong>. Zero API fees.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-bold text-slate-900">
                2. Meta Cloud API Onboarding Ready
              </div>
              <p className="text-slate-600">
                Supports WABA ID, Phone Number ID, and Meta-approved Utility/Marketing templates via server-side Supabase Edge Functions.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-bold text-slate-900">
                3. Webhook Event Segregation
              </div>
              <p className="text-slate-600">
                Database table <code className="font-mono">crm_messages</code> records{' '}
                <code className="font-mono">channel_mode</code> and <code className="font-mono">api_delivery_status</code> (sent, delivered, read, incoming).
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/**
 * PART 14 – CAMPAIGN MANAGER
 */
export const CampaignManagerView: React.FC = () => {
  const { campaigns, templates, users, visibleLeads, createCampaign, updateCampaign } = useCrm();
  const [name, setName] = useState('');
  const [campaignType, setCampaignType] = useState('AC Showrooms');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [assignedUser, setAssignedUser] = useState(users[0]?.name || 'Rohit Sharma');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-30');

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const segmentLeads = visibleLeads.filter((l) => l.isValidPhone && !l.optedOut);
    createCampaign({
      name: name.trim(),
      campaignType,
      templateId,
      assignedUser,
      startDate,
      endDate,
      status: 'Active',
      leadIds: segmentLeads.map((l) => l.id),
      chatsOpenedIds: [],
      confirmedSentIds: [],
      skippedIds: [],
      interestedIds: [],
      optOutIds: [],
      selectedCount: segmentLeads.length,
      chatsOpenedCount: 0,
      confirmedSentCount: 0,
      pendingCount: segmentLeads.length,
      skippedCount: 0,
      interestedCount: 0,
      optOutCount: 0,
    });
    setName('');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Outreach Campaign Manager
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Create segmented outreach campaigns for AC Showrooms, AC Dealers, Electronics Showrooms, and Business Partners. Tracks Chats Opened separately from Manually Confirmed Messages.
        </p>

        <form
          onSubmit={handleCreateCampaign}
          className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <div className="lg:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Noida Sector 18 Electronics Dealers Outreach"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Segment Type
            </label>
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="AC Showrooms">AC Showrooms</option>
              <option value="AC Dealers">AC Dealers</option>
              <option value="Electronics Showrooms">Electronics Showrooms</option>
              <option value="Business Partners">Business Partners</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Message Template
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Staff
            </label>
            <select
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Campaign
            </button>
          </div>
        </form>

        {/* Campaigns Table */}
        <div className="mt-6 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Campaign Name & Segment</th>
                <th className="py-2.5 px-3">Assigned To</th>
                <th className="py-2.5 px-3">Selected</th>
                <th className="py-2.5 px-3">Chats Opened</th>
                <th className="py-2.5 px-3">Confirmed Sent</th>
                <th className="py-2.5 px-3">Pending</th>
                <th className="py-2.5 px-3">Skipped</th>
                <th className="py-2.5 px-3">Interested</th>
                <th className="py-2.5 px-3">Opt-outs</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No campaigns created yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-slate-500">
                        {c.campaignType} · {c.startDate} to {c.endDate}
                      </div>
                    </td>
                    <td className="py-3 px-3">{c.assignedUser}</td>
                    <td className="py-3 px-3 font-mono tabular-nums font-bold">
                      {c.selectedCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-blue-700 font-semibold">
                      {c.chatsOpenedCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-emerald-700 font-bold">
                      {c.confirmedSentCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-amber-700">
                      {c.pendingCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                      {c.skippedCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-emerald-700">
                      {c.interestedCount}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-red-600">
                      {c.optOutCount}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={c.status}
                        onChange={(e) =>
                          updateCampaign(c.id, {
                            status: e.target.value as typeof c.status,
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-300 rounded font-medium"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                        <option value="Completed">Completed</option>
                        <option value="Stopped">Stopped</option>
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
 * PART 9 – FOLLOW-UP MANAGER
 */
export const FollowUpManagerView: React.FC = () => {
  const { currentUser, visibleLeads, followUps, users, createFollowUp, updateFollowUp } =
    useCrm();

  const [viewFilter, setViewFilter] = useState<
    'all' | 'today' | 'overdue' | 'upcoming' | 'completed' | 'mine'
  >('all');
  const [leadId, setLeadId] = useState(visibleLeads[0]?.id || '');
  const [scheduledAt, setScheduledAt] = useState('2026-11-02T11:30');
  const [assignedStaff, setAssignedStaff] = useState(
    currentUser?.name || 'Rohit Sharma'
  );
  const [notes, setNotes] = useState('');

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetLead = visibleLeads.find((l) => l.id === leadId);
    if (!targetLead) return;
    createFollowUp({
      leadId: targetLead.id,
      showroomName: targetLead.showroomName,
      contactPerson: targetLead.contactPerson || targetLead.ownerName,
      phone: targetLead.formattedPhone,
      city: targetLead.city,
      scheduledAt: new Date(scheduledAt).toISOString(),
      assignedStaff,
      notes,
      callOutcome: '',
      customerResponse: '',
      status: 'Pending',
    });
    setNotes('');
  };

  const filteredFollowUps = useMemo(() => {
    const now = new Date();
    return followUps.filter((f) => {
      const sched = new Date(f.scheduledAt);
      if (viewFilter === 'today') {
        return sched.toDateString() === now.toDateString();
      }
      if (viewFilter === 'overdue') {
        return f.status === 'Overdue' || (f.status === 'Pending' && sched < now);
      }
      if (viewFilter === 'upcoming') {
        return f.status === 'Pending' && sched >= now;
      }
      if (viewFilter === 'completed') {
        return f.status === 'Completed';
      }
      if (viewFilter === 'mine') {
        return f.assignedStaff.toLowerCase() === currentUser?.name.toLowerCase();
      }
      return true;
    });
  }, [followUps, viewFilter, currentUser]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Showroom Follow-Up Scheduling & Call Outcome System
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Schedule showroom calls, assign staff, log call outcomes and customer responses, and monitor overdue follow-ups.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: `Team Follow-ups (${followUps.length})` },
                { id: 'today', label: "Today's Follow-ups" },
                { id: 'overdue', label: 'Overdue' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
                { id: 'mine', label: 'My Follow-ups' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewFilter(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  viewFilter === tab.id
                    ? 'bg-white text-[#0B1F3A] font-semibold shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule New Follow-Up Form */}
        <form
          onSubmit={handleScheduleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Showroom Lead *
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.showroomName} ({l.city})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
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
              Follow-Up Objective / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call owner to confirm Split AC rate card"
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
            >
              Schedule Follow-Up
            </button>
          </div>
        </form>

        {/* Follow-Ups Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Showroom & Contact</th>
                <th className="py-2.5 px-3">Scheduled Date/Time</th>
                <th className="py-2.5 px-3">Assigned Staff</th>
                <th className="py-2.5 px-3">Call Outcome</th>
                <th className="py-2.5 px-3">Customer Response</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No follow-ups scheduled.
                  </td>
                </tr>
              ) : (
                filteredFollowUps.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{f.showroomName}</div>
                      <div className="text-slate-500">
                        {f.contactPerson} · <span className="font-mono">{f.phone}</span> · {f.city}
                      </div>
                      {f.notes && <div className="text-slate-600 mt-0.5">{f.notes}</div>}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {new Date(f.scheduledAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-medium">{f.assignedStaff}</td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={f.callOutcome}
                        placeholder="Record call outcome..."
                        onChange={(e) =>
                          updateFollowUp(f.id, { callOutcome: e.target.value })
                        }
                        className="w-40 px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={f.customerResponse}
                        placeholder="Customer response..."
                        onChange={(e) =>
                          updateFollowUp(f.id, { customerResponse: e.target.value })
                        }
                        className="w-44 px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          f.status === 'Completed'
                            ? 'text-emerald-700'
                            : f.status === 'Overdue'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => updateFollowUp(f.id, { status: 'Completed' })}
                          className="px-2.5 py-1 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
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

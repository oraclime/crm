import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
} from 'lucide-react';
import {
  CampaignSessionState,
  FollowUpStatus,
  ShowroomContact,
} from '../types/outreach';
import {
  buildOfficialWhatsAppUrl,
  FOLLOW_UP_STATUSES,
  personalizeShowroomMessage,
} from '../utils/phoneAndExcel';

interface CampaignWorkspaceProps {
  showrooms: ShowroomContact[];
  messageTemplate: string;
  campaignSession: CampaignSessionState;
  onUpdateSession: (patch: Partial<CampaignSessionState>) => void;
  onUpdateShowroom: (id: string, patch: Partial<ShowroomContact>) => void;
  onResetCampaignProgress: () => void;
  onNavigateTab: (tab: 'import' | 'composer' | 'campaign' | 'followup' | 'reports') => void;
}

const WORKFLOW_STEPS = [
  '1. Excel Upload',
  '2. Select Showrooms',
  '3. Write Message',
  '4. Preview',
  '5. Start Campaign',
  '6. Open WhatsApp',
  '7. Manually Send',
  '8. Confirm Sent',
  '9. Next Showroom',
];

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  showrooms,
  messageTemplate,
  campaignSession,
  onUpdateSession,
  onUpdateShowroom,
  onResetCampaignProgress,
  onNavigateTab,
}) => {
  const [customMessageOverride, setCustomMessageOverride] = useState<{
    showroomId: string;
    text: string;
  } | null>(null);

  // Campaign Dashboard KPI calculations
  const totalShowrooms = showrooms.length;
  const selectedShowroomsList = showrooms.filter(
    (s) => s.selectedForCampaign && s.isValidPhone && s.optedIn
  );
  const selectedCount = selectedShowroomsList.length;
  const sentCount = showrooms.filter((s) => s.campaignStatus === 'Sent').length;
  const pendingShowroomsList = selectedShowroomsList.filter(
    (s) => s.campaignStatus === 'Pending'
  );
  const pendingCount = pendingShowroomsList.length;
  const skippedCount = showrooms.filter((s) => s.campaignStatus === 'Skipped').length;
  const invalidCount = showrooms.filter((s) => !s.isValidPhone || s.campaignStatus === 'Invalid Number').length;

  // Determine active showroom in queue
  const currentShowroom: ShowroomContact | undefined =
    selectedShowroomsList.find((s) => s.id === campaignSession.currentShowroomId) ||
    pendingShowroomsList[0] ||
    selectedShowroomsList[0];

  const personalizedMessage = currentShowroom
    ? customMessageOverride?.showroomId === currentShowroom.id
      ? customMessageOverride.text
      : personalizeShowroomMessage(messageTemplate, currentShowroom)
    : '';

  const officialWhatsAppUrl = currentShowroom
    ? buildOfficialWhatsAppUrl(
        currentShowroom.normalizedPhone,
        personalizedMessage,
        campaignSession.useWhatsAppWebUrl
      )
    : '#';

  const findNextPendingShowroomId = (afterId?: string): string | null => {
    if (selectedShowroomsList.length === 0) return null;
    const currentIndex = afterId
      ? selectedShowroomsList.findIndex((s) => s.id === afterId)
      : -1;

    // Look forward for Pending showrooms first
    for (let i = currentIndex + 1; i < selectedShowroomsList.length; i++) {
      if (selectedShowroomsList[i].campaignStatus === 'Pending') {
        return selectedShowroomsList[i].id;
      }
    }
    // Wrap around from start for any remaining Pending showrooms
    for (let i = 0; i <= currentIndex; i++) {
      if (
        selectedShowroomsList[i] &&
        selectedShowroomsList[i].id !== afterId &&
        selectedShowroomsList[i].campaignStatus === 'Pending'
      ) {
        return selectedShowroomsList[i].id;
      }
    }
    // If no Pending left, just advance to next in selected list if available
    if (currentIndex + 1 < selectedShowroomsList.length) {
      return selectedShowroomsList[currentIndex + 1].id;
    }
    return null;
  };

  const handleStartCampaign = () => {
    const firstTarget = pendingShowroomsList[0] || selectedShowroomsList[0];
    if (!firstTarget) return;
    onUpdateSession({
      status: 'running',
      currentShowroomId: firstTarget.id,
      startedAt: campaignSession.startedAt || new Date().toISOString(),
      pausedAt: null,
    });
  };

  const handlePauseCampaign = () => {
    onUpdateSession({
      status: 'paused',
      pausedAt: new Date().toISOString(),
    });
  };

  const handleResumeCampaign = () => {
    onUpdateSession({
      status: 'running',
      pausedAt: null,
    });
  };

  const handleStopCampaign = () => {
    onUpdateSession({
      status: 'stopped',
      pausedAt: null,
    });
  };

  const handleOpenWhatsAppClick = () => {
    if (!currentShowroom) return;
    if (campaignSession.status === 'idle' || campaignSession.status === 'stopped') {
      onUpdateSession({
        status: 'running',
        currentShowroomId: currentShowroom.id,
        startedAt: new Date().toISOString(),
      });
    }
    onUpdateShowroom(currentShowroom.id, {
      whatsappOpenedAt: new Date().toISOString(),
    });
  };

  const handleMarkAsSent = () => {
    if (!currentShowroom) return;
    const nowIso = new Date().toISOString();
    const nextFollowUp: FollowUpStatus =
      currentShowroom.followUpStatus === 'Not Contacted'
        ? 'Message Sent'
        : currentShowroom.followUpStatus;

    onUpdateShowroom(currentShowroom.id, {
      campaignStatus: 'Sent',
      followUpStatus: nextFollowUp,
      lastContactDate: nowIso,
    });

    if (campaignSession.autoAdvanceOnConfirm) {
      const nextId = findNextPendingShowroomId(currentShowroom.id);
      if (nextId) {
        onUpdateSession({
          status: 'running',
          currentShowroomId: nextId,
        });
      } else {
        onUpdateSession({
          status: 'completed',
        });
      }
    }
  };

  const handleSkipShowroom = () => {
    if (!currentShowroom) return;
    onUpdateShowroom(currentShowroom.id, {
      campaignStatus: 'Skipped',
    });
    const nextId = findNextPendingShowroomId(currentShowroom.id);
    if (nextId) {
      onUpdateSession({
        currentShowroomId: nextId,
      });
    }
  };

  const handleNextShowroom = () => {
    if (!currentShowroom) return;
    const nextId = findNextPendingShowroomId(currentShowroom.id);
    if (nextId) {
      onUpdateSession({
        currentShowroomId: nextId,
      });
    } else {
      const idx = selectedShowroomsList.findIndex((s) => s.id === currentShowroom.id);
      const fallbackNext =
        selectedShowroomsList[(idx + 1) % Math.max(1, selectedShowroomsList.length)];
      if (fallbackNext) {
        onUpdateSession({
          currentShowroomId: fallbackNext.id,
        });
      }
    }
  };

  const currentStepIndex =
    campaignSession.status === 'idle'
      ? 4
      : currentShowroom?.whatsappOpenedAt && currentShowroom.campaignStatus === 'Pending'
      ? 7
      : 5;

  return (
    <div className="space-y-8">
      {/* Guided 9-Step Manual WhatsApp Outreach Workflow Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight">
            Official Manual WhatsApp Click-to-Chat Outreach Workflow
          </h2>
          <span className="text-xs text-slate-500">
            Zero bots · Zero unofficial automation · 100% manual confirmation
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-y-2 text-xs">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <React.Fragment key={step}>
                <span
                  className={`font-medium ${
                    isActive
                      ? 'text-[#0B1F3A] font-bold underline decoration-2 underline-offset-4'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  {step}
                </span>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1.5 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Section 4: Campaign Dashboard Metrics Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Campaign Dashboard
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Real-time showroom outreach progress saved locally in your browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={campaignSession.useWhatsAppWebUrl}
                onChange={(e) =>
                  onUpdateSession({ useWhatsAppWebUrl: e.target.checked })
                }
                className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#0B1F3A]"
              />
              <span>Use WhatsApp Web Direct Link</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={campaignSession.autoAdvanceOnConfirm}
                onChange={(e) =>
                  onUpdateSession({ autoAdvanceOnConfirm: e.target.checked })
                }
                className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#0B1F3A]"
              />
              <span>Auto-advance on Mark as Sent</span>
            </label>
            <button
              type="button"
              onClick={onResetCampaignProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Campaign Statuses
            </button>
          </div>
        </div>

        {/* 6 Required Campaign KPIs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="pt-3 sm:pt-0 sm:px-3 first:pl-0">
            <div className="text-xs text-slate-500">Total Showrooms</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalShowrooms}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-3">
            <div className="text-xs text-slate-500">Selected Showrooms</div>
            <div className="text-2xl font-bold text-[#0B1F3A] font-mono tabular-nums mt-1">
              {selectedCount}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-3">
            <div className="text-xs text-slate-500">Messages Sent</div>
            <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {sentCount}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-3">
            <div className="text-xs text-slate-500">Pending Showrooms</div>
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
              {pendingCount}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-3">
            <div className="text-xs text-slate-500">Skipped Showrooms</div>
            <div className="text-2xl font-bold text-slate-700 font-mono tabular-nums mt-1">
              {skippedCount}
            </div>
          </div>
          <div className="pt-3 sm:pt-0 sm:px-3">
            <div className="text-xs text-slate-500">Invalid Numbers</div>
            <div className="text-2xl font-bold text-red-600 font-mono tabular-nums mt-1">
              {invalidCount}
            </div>
          </div>
        </div>
      </section>

      {/* Main Campaign Execution Console & Showroom Queue */}
      {selectedShowroomsList.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h3 className="text-base font-bold text-slate-900">
            No Valid Showrooms Selected for Campaign
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Please select at least one AC showroom with a valid Indian mobile number in the Directory & Import tab before launching the outreach campaign.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('import')}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg cursor-pointer"
          >
            Go to Showroom Directory & Import
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Current Showroom Card + Campaign Controls */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            {/* Session Control Bar: Start / Pause / Resume / Stop */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">
                  Campaign State:{' '}
                  <strong className="text-slate-900 capitalize">
                    {campaignSession.status}
                  </strong>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Active Showroom Dispatch Console
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(campaignSession.status === 'idle' ||
                  campaignSession.status === 'stopped' ||
                  campaignSession.status === 'completed') && (
                  <button
                    type="button"
                    onClick={handleStartCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Campaign
                  </button>
                )}

                {campaignSession.status === 'running' && (
                  <button
                    type="button"
                    onClick={handlePauseCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}

                {campaignSession.status === 'paused' && (
                  <button
                    type="button"
                    onClick={handleResumeCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}

                {(campaignSession.status === 'running' ||
                  campaignSession.status === 'paused') && (
                  <button
                    type="button"
                    onClick={handleStopCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Current Showroom Prominent Display */}
            {currentShowroom && (
              <>
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Current Showroom Name
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">
                        {currentShowroom.showroomName}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        <span>Owner: </span>
                        <strong className="text-slate-900">
                          {currentShowroom.contactPerson || 'Not Specified'}
                        </strong>
                        <span aria-hidden="true"> · </span>
                        <span>{currentShowroom.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{currentShowroom.city}</span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-xs font-medium text-slate-500">
                        Contact Number (WhatsApp)
                      </div>
                      <div className="text-lg font-bold text-[#0B1F3A] font-mono tabular-nums mt-0.5">
                        {currentShowroom.formattedPhone}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Status:{' '}
                        <strong className="text-slate-900">
                          {currentShowroom.campaignStatus}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {currentShowroom.address && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                      Address: {currentShowroom.address}
                    </div>
                  )}
                </div>

                {/* Primary Campaign Action Controls */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Campaign Action Controls (Step-by-Step Manual Dispatch)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Open WhatsApp (Official click-to-chat anchor) */}
                    <a
                      href={
                        campaignSession.status === 'paused' ? undefined : officialWhatsAppUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (campaignSession.status === 'paused') {
                          e.preventDefault();
                          return;
                        }
                        handleOpenWhatsAppClick();
                      }}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-lg transition-colors ${
                        campaignSession.status === 'paused'
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-[#0B1F3A] hover:bg-[#15325b]'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      1. Open WhatsApp
                    </a>

                    {/* 2. Mark as Sent */}
                    <button
                      type="button"
                      disabled={campaignSession.status === 'paused'}
                      onClick={handleMarkAsSent}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      2. Mark as Sent
                    </button>
                  </div>

                  {/* Secondary Campaign Controls: Next Showroom & Skip */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={campaignSession.status === 'paused'}
                      onClick={handleNextShowroom}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      Next Showroom
                    </button>
                    <button
                      type="button"
                      disabled={campaignSession.status === 'paused'}
                      onClick={handleSkipShowroom}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip Showroom
                    </button>

                    {/* Quick Follow-Up Status & Note Updater right inside Campaign Console */}
                    <div className="ml-auto flex items-center gap-2">
                      <label className="text-xs text-slate-500">Follow-up:</label>
                      <select
                        value={currentShowroom.followUpStatus}
                        onChange={(e) =>
                          onUpdateShowroom(currentShowroom.id, {
                            followUpStatus: e.target.value as FollowUpStatus,
                          })
                        }
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                      >
                        {FOLLOW_UP_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Personalized Message Preview for Current Showroom */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Personalized Message for {currentShowroom.showroomName}
                    </label>
                    {customMessageOverride?.showroomId === currentShowroom.id && (
                      <button
                        type="button"
                        onClick={() => setCustomMessageOverride(null)}
                        className="text-xs text-[#0B1F3A] hover:underline cursor-pointer"
                      >
                        Reset to Template
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={10}
                    value={personalizedMessage}
                    onChange={(e) =>
                      setCustomMessageOverride({
                        showroomId: currentShowroom.id,
                        text: e.target.value,
                      })
                    }
                    className="w-full p-3.5 text-xs leading-relaxed bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Right 5 Columns: Selected Campaign Queue List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Selected Showroom Queue ({selectedShowroomsList.length})
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {sentCount} Sent · {pendingCount} Pending
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-200 max-h-[540px] overflow-y-auto">
              {selectedShowroomsList.map((item, idx) => {
                const isCurrent = currentShowroom?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onUpdateSession({
                        currentShowroomId: item.id,
                      })
                    }
                    className={`w-full text-left py-3 px-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50/80 font-medium'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono tabular-nums text-slate-400">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.showroomName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 pl-6 truncate">
                        <span>{item.contactPerson || 'Owner'}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">
                          {item.formattedPhone}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.city}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          item.campaignStatus === 'Sent'
                            ? 'text-emerald-700'
                            : item.campaignStatus === 'Skipped'
                            ? 'text-slate-500'
                            : 'text-amber-700'
                        }`}
                      >
                        {item.campaignStatus}
                      </span>
                      {isCurrent && (
                        <div className="text-[11px] font-semibold text-[#0B1F3A]">
                          Current
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

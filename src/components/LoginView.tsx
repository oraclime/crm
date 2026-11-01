import React, { useState } from 'react';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const LoginView: React.FC = () => {
  const { loginWithEmailPassword, loginWithGoogleCloud } = useCrm();
  const [email, setEmail] = useState('amaanrisky417@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginWithEmailPassword(email, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F3A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white text-[#0B1F3A] font-display font-bold text-xl shadow-sm">
          ORA
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white font-display">
          ORA CRM
        </h1>
        <p className="mt-1 text-sm text-blue-200">
          By ORACLIME · Manage Leads. Build Relationships. Grow Business.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-5 pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Enterprise Account Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in with your corporate Email and Password. Your dashboard and permissions are automatically assigned from your database profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@oraclime.in"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setResetNotice(
                      `Please contact the ORACLIME Administrator to reset the password for ${
                        email || 'your account'
                      }.`
                    )
                  }
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            {resetNotice && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                {resetNotice}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#15325b] transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In to ORA CRM
            </button>
          </form>

          {/* Cloud OAuth Sign-In */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                loginWithGoogleCloud().catch((err) =>
                  setErrorMsg(
                    err instanceof Error ? err.message : 'Google Sign-In failed'
                  )
                );
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#0B1F3A]" />
              Sign In with Google Cloud Identity
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-[#0B1F3A]" />
            <span>Role permissions are strictly resolved from your database profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};

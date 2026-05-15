import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { user, logout } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setSaving(true);
    setPwError('');
    setPwMsg('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ph_token')}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500';

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-neutral-100">Settings</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-5">
        <h3 className="font-semibold text-neutral-100 mb-4">Profile</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-lg">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-neutral-200">{user?.email}</p>
            <p className="text-xs text-neutral-600 mt-0.5">User ID: {user?.id?.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-5">
        <h3 className="font-semibold text-neutral-100 mb-4">Change Password</h3>
        {pwMsg && <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-4">{pwMsg}</p>}
        {pwError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{pwError}</p>}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Integrations scaffold */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-5">
        <h3 className="font-semibold text-neutral-100 mb-1">Integrations</h3>
        <p className="text-xs text-neutral-600 mb-4">Coming soon</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-neutral-800">
            <div>
              <p className="text-sm font-medium text-neutral-300">Google Drive</p>
              <p className="text-xs text-neutral-600">Sync notes to Drive</p>
            </div>
            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-neutral-300">Slack</p>
              <p className="text-xs text-neutral-600">Weekly digest to channel</p>
            </div>
            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-1 rounded-full">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
        <h3 className="font-semibold text-neutral-100 mb-3">Sign Out</h3>
        <button
          onClick={logout}
          className="text-sm text-red-500/70 border border-red-500/20 hover:bg-red-500/10 hover:text-red-400 px-4 py-2 rounded-lg transition-colors"
        >
          Sign out of Founder Mode
        </button>
      </div>
    </div>
  );
}

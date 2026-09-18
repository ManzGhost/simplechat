import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Check, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatLastSeen } from '../utils/dateUtils';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        name: name.trim(),
        profileImage: profileImage.trim() || undefined,
      });
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="profile-page-container" className="min-h-screen bg-neutral-100 dark:bg-slate-950 night:bg-black text-neutral-900 dark:text-slate-100 night:text-white flex flex-col transition-colors">
      <Navbar onOpenProfile={() => {}} />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Chats</span>
        </button>

        <div className="bg-white dark:bg-slate-900 night:bg-black rounded-2xl shadow-sm border border-neutral-200 dark:border-slate-800 night:border-neutral-800 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-base font-bold text-neutral-900 dark:text-white night:text-white">Your Profile</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-3 pb-2 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900">
              <div className="relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-emerald-500 shadow-sm ${getAvatarColor(
                      name
                    )}`}
                  >
                    {getInitials(name)}
                  </div>
                )}
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
                    user.online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-slate-600'
                  }`}
                />
              </div>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 night:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {user.online ? '● Online' : formatLastSeen(user.lastSeen, false)}
              </span>

              <div className="w-full text-center">
                <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-2">Preset avatars:</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setProfileImage(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border transition-all ${
                        profileImage === url ? 'ring-2 ring-emerald-500 border-emerald-500 scale-110' : 'border-neutral-200 dark:border-slate-700 night:border-neutral-700'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {profileImage && (
                    <button
                      type="button"
                      onClick={() => setProfileImage('')}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <Check className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  value={profileImage || ''}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={`@${user.username}`}
                    disabled
                    readOnly
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-950 night:bg-neutral-950 text-neutral-500 dark:text-slate-400 night:text-neutral-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-950 night:bg-neutral-950 text-neutral-500 dark:text-slate-400 night:text-neutral-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

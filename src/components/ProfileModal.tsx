import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User as UserIcon,
  Camera,
  Check,
  AlertCircle,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatLastSeen } from '../utils/dateUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [about, setAbout] = useState(user?.about || 'Hey there! I am using SimpleChat');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete account modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen || !user) return null;

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteAccount(deletePassword || undefined);
      setShowDeleteConfirm(false);
      onClose();
      navigate('/register', { state: { accountDeleted: true } });
    } catch (err: any) {
      console.error('Delete account error', err);
      setDeleteError(
        err?.response?.data?.message ||
        'Failed to delete account. Please verify your password and try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateProfile({
        name: name.trim(),
        profileImage: profileImage.trim() || undefined,
        about: about.trim() || undefined,
      });
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="profile-modal-card"
        className="bg-white dark:bg-slate-900 night:bg-black rounded-2xl shadow-xl border border-neutral-200 dark:border-slate-800 night:border-neutral-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 id="profile-modal-heading" className="text-base font-bold text-neutral-900 dark:text-white night:text-white">
              User Profile
            </h2>
          </div>
          <button
            id="profile-modal-close-btn"
            onClick={onClose}
            className="text-neutral-400 dark:text-slate-500 night:text-neutral-500 hover:text-neutral-600 dark:hover:text-slate-300 night:hover:text-neutral-300 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name || user.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  onError={() => setProfileImage('')}
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-emerald-500 shadow-sm ${getAvatarColor(
                    name || user.name
                  )}`}
                >
                  {getInitials(name || user.name)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
                  user.online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-slate-600'
                }`}
                title={user.online ? 'Online' : 'Offline'}
              />
            </div>

            <div className="text-center">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 night:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {user.online ? '● Online' : formatLastSeen(user.lastSeen, false)}
              </span>
            </div>

            {/* Quick avatar selection */}
            <div className="w-full pt-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-1.5 text-center">
                Choose a preset avatar or paste image URL:
              </label>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfileImage(url)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                      profileImage === url ? 'border-emerald-600 ring-2 ring-emerald-300 dark:ring-emerald-700' : 'border-neutral-200 dark:border-slate-700 night:border-neutral-700'
                    }`}
                  >
                    <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {profileImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage('')}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-1 py-0.5"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Editable Name */}
          <div>
            <label htmlFor="profile-name-input" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
              Full Name
            </label>
            <input
              id="profile-name-input"
              type="text"
              value={name || ''}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
              placeholder="Your full name"
            />
          </div>

          {/* Profile Image URL */}
          <div>
            <label htmlFor="profile-image-input" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
              Custom Profile Image URL
            </label>
            <input
              id="profile-image-input"
              type="url"
              value={profileImage || ''}
              onChange={(e) => setProfileImage(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          {/* About / Bio Status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="profile-about-input" className="text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200">
                About / Status
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {about.length}/140
              </span>
            </div>
            <input
              id="profile-about-input"
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={140}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
              placeholder="e.g. Available, Busy, At work..."
            />
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-neutral-400">Presets:</span>
              {['Available', 'Busy', 'At work', 'In a meeting', 'At gym 🏋️', 'Sleeping 😴'].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAbout(preset)}
                    className="px-1.5 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-slate-800 night:bg-neutral-800 text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 transition-colors"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Read-only Username */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-1">
              Username (Read-only)
            </label>
            <input
              type="text"
              value={`@${user.username}`}
              readOnly
              disabled
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-950 night:bg-neutral-950 text-neutral-500 dark:text-slate-400 night:text-neutral-400 cursor-not-allowed"
            />
          </div>

          {/* Read-only Email */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-slate-400 night:text-neutral-400 mb-1">
              Email (Read-only)
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              disabled
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-950 night:bg-neutral-950 text-neutral-500 dark:text-slate-400 night:text-neutral-400 cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-slate-300 night:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-900 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              id="profile-save-btn"
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Danger Zone: Delete Account */}
        <div className="px-5 pb-5 pt-2 border-t border-neutral-100 dark:border-slate-800/80 night:border-neutral-900">
          <div className="bg-rose-50/70 dark:bg-rose-950/20 night:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 night:border-rose-950/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 night:text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Registered Account
              </h4>
              <p className="text-[11px] text-neutral-600 dark:text-slate-400 night:text-neutral-400 mt-0.5">
                Permanently removes your user profile, messages, and chat history.
              </p>
            </div>
            <button
              id="profile-delete-account-trigger-btn"
              type="button"
              onClick={() => {
                setDeleteError('');
                setDeletePassword('');
                setShowDeleteConfirm(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/80 hover:bg-rose-600 hover:text-white dark:bg-rose-900/40 dark:hover:bg-rose-600 dark:hover:text-white night:bg-rose-900/30 night:hover:bg-rose-600 night:hover:text-white rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          id="delete-account-confirm-backdrop"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            id="delete-account-confirm-card"
            className="bg-white dark:bg-slate-900 night:bg-black rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 night:border-rose-950 max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 night:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 id="delete-account-confirm-title" className="text-base font-bold text-neutral-900 dark:text-white night:text-white">
                  Permanently Delete Account?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 mt-0.5">
                  This action is irreversible. All data for <strong className="text-neutral-800 dark:text-slate-200 night:text-neutral-200">@{user.username}</strong> will be erased.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="text-neutral-400 hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-3.5">
              <div className="bg-rose-50/60 dark:bg-rose-950/20 night:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs text-neutral-700 dark:text-slate-300 night:text-neutral-300">
                <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                  <li>Your user account will be permanently removed.</li>
                  <li>All direct conversations and chats with contacts will be cleared.</li>
                  <li>All sent messages, attachments, and profile images will be deleted.</li>
                </ul>
              </div>

              <div>
                <label
                  htmlFor="delete-account-password-input"
                  className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 night:text-neutral-300 mb-1"
                >
                  Enter password to confirm:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="delete-account-password-input"
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="block w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 dark:focus:border-rose-500 transition-colors"
                  />
                  <button
                    id="delete-account-toggle-pw-btn"
                    type="button"
                    onClick={() => setShowDeletePassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  id="cancel-delete-account-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-account-btn"
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Deleting Account...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

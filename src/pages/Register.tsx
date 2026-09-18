import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Lock,
  Mail,
  User,
  Upload,
  Link as LinkIcon,
  Trash2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Camera,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
];

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [deletedNotice, setDeletedNotice] = useState<boolean>(() => {
    return !!(location.state as any)?.accountDeleted;
  });

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image size should be under 5MB');
      return;
    }
    setFileError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setProfileImage(dataUrl);
        } else {
          setProfileImage(result);
        }
      };
      img.onerror = () => {
        setProfileImage(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClearImage = () => {
    setProfileImage('');
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Form Validations
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please provide a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        profileImage: profileImage.trim() || undefined,
      });
      navigate('/');
    } catch (err: any) {
      console.error('Registration error', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        setError(serverMsg || 'Username or email is already in use');
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Server unavailable. Please check your connection.');
      } else {
        setError(serverMsg || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="register-page-container" className="min-h-screen bg-neutral-100/70 dark:bg-slate-950 night:bg-black flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle variant="compact" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <MessageSquare className="w-7 h-7" />
          </div>
        </div>
        <h2 id="register-title" className="text-center text-2xl font-bold tracking-tight text-neutral-900 dark:text-white night:text-white">
          Create your SimpleChat account
        </h2>
        <p className="mt-1.5 text-center text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400">
          Connect with friends and colleagues instantly
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 night:bg-black py-7 px-6 shadow-sm border border-neutral-200/80 dark:border-slate-800 night:border-neutral-800 rounded-2xl sm:px-10 transition-colors">
          {deletedNotice && (
            <div
              id="register-account-deleted-notice"
              className="mb-4 flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your account was successfully deleted. You can create a new one anytime.</span>
              </div>
              <button
                type="button"
                onClick={() => setDeletedNotice(false)}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div
              id="register-error-alert"
              className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="register-form" className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-username" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Username *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <span className="text-xs font-bold text-neutral-400 dark:text-slate-500 night:text-neutral-500">@</span>
                </div>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1">
                Password * (min 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
                <button
                  id="reg-toggle-password-btn"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200 night:text-neutral-400 night:hover:text-neutral-200 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Profile Image & Presets */}
            <div>
              <label htmlFor={imageMode === 'url' ? 'reg-image' : 'reg-image-file'} className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200 mb-1.5">
                <span>Profile Photo (Optional)</span>
                <span className="inline-flex items-center text-[11px] font-normal bg-neutral-100 dark:bg-slate-800 night:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 night:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('upload');
                      setFileError('');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all font-medium inline-flex items-center gap-1 ${
                      imageMode === 'upload'
                        ? 'bg-white dark:bg-slate-700 night:bg-neutral-800 text-emerald-700 dark:text-emerald-400 night:text-emerald-400 shadow-xs'
                        : 'text-neutral-500 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 night:hover:text-neutral-200'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Direct Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('url');
                      setFileError('');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all font-medium inline-flex items-center gap-1 ${
                      imageMode === 'url'
                        ? 'bg-white dark:bg-slate-700 night:bg-neutral-800 text-emerald-700 dark:text-emerald-400 night:text-emerald-400 shadow-xs'
                        : 'text-neutral-500 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 night:hover:text-neutral-200'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    Image Link
                  </button>
                </span>
              </label>

              {/* Hidden file input strictly uncontrolled */}
              <input
                id="reg-image-file"
                key="reg-image-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                tabIndex={-1}
              />

              {imageMode === 'upload' ? (
                <div className="mb-2">
                  {profileImage ? (
                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 night:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 night:border-emerald-800/50 rounded-xl transition-all">
                      <img
                        src={profileImage}
                        alt="Profile Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 night:text-emerald-400 truncate">
                          Direct Image Ready
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 night:text-emerald-500 truncate">
                          Image attached to your profile
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-white dark:bg-slate-800 night:bg-neutral-900 border border-emerald-300 dark:border-emerald-700 night:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-700 night:hover:bg-neutral-800 shadow-xs transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleClearImage}
                          className="p-1.5 text-neutral-400 dark:text-slate-500 night:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 night:hover:bg-rose-950/40 transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 scale-[0.99]'
                          : 'border-neutral-300 dark:border-slate-700 night:border-neutral-800 hover:border-emerald-500/80 bg-neutral-50/70 dark:bg-slate-800/40 night:bg-neutral-900/40 hover:bg-emerald-50/20 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 night:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-0.5">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-neutral-700 dark:text-slate-200 night:text-neutral-200">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline underline-offset-2">
                            Click to browse
                          </span>{' '}
                          or drag & drop
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                          Direct PNG, JPG, WebP, GIF (up to 5MB)
                        </p>
                      </div>
                    </div>
                  )}

                  {fileError && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fileError}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-image"
                    key="reg-image-url-input"
                    type="url"
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-900 dark:text-white night:text-white border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg placeholder-neutral-400 dark:placeholder-slate-500 night:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-neutral-400 dark:text-slate-500 night:text-neutral-500 mr-0.5">Presets:</span>
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setProfileImage(url);
                        setFileError('');
                      }}
                      className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                        profileImage === url
                          ? 'ring-2 ring-emerald-500 border-emerald-500 scale-110'
                          : 'border-neutral-200 dark:border-slate-700 night:border-neutral-700 hover:border-neutral-400 dark:hover:border-slate-500'
                      }`}
                      title={`Select Preset ${i + 1}`}
                    >
                      <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                {profileImage && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-[11px] text-neutral-400 dark:text-slate-500 night:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                id="register-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-slate-800 night:border-neutral-900 text-center">
            <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400">
              Already have an account?{' '}
              <Link
                id="to-login-link"
                to="/login"
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

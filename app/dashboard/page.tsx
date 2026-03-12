'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { getPlatform, LimitationBanner } from '@/lib/platforms';
import Link from 'next/link';

type Step = 'welcome' | 'auth' | 'data-selection' | 'backup' | 'download' | 'deletion' | 'complete';

interface BackupStatus {
  state: string;
  progress: number;
  result?: {
    archiveId: string;
  };
}

interface ErrorInfo {
  code: string;
  message: string;
  suggestion: string;
}

interface BackupArchive {
  id: string;
  expiresAt: string;
  downloadCount: number;
  expired: boolean;
}

interface BackupHistoryItem {
  id: string;
  platform: string;
  status: string;
  progress: number;
  dataTypes: string[];
  errorMessage: string | null;
  createdAt: string;
  archive: BackupArchive | null;
}

function ErrorBanner({ error, onDismiss }: { error: ErrorInfo; onDismiss: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-stone-800 text-sm font-medium">{error.message}</p>
          <p className="font-serif text-stone-500 text-sm mt-1">{error.suggestion}</p>
        </div>
        <button
          onClick={onDismiss}
          className="font-serif text-stone-400 hover:text-stone-600 text-lg leading-none ml-4"
          aria-label="Dismiss error"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function LimitationBannerDisplay({ banner }: { banner: LimitationBanner }) {
  const bgColor = banner.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
  const textColor = banner.severity === 'warning' ? 'text-amber-800' : 'text-blue-800';

  return (
    <div className={`${bgColor} border rounded-lg p-3 mt-2 ml-8`}>
      <p className={`font-serif text-xs ${textColor}`}>{banner.message}</p>
      {banner.officialToolUrl && banner.officialToolName && (
        <a
          href={banner.officialToolUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-serif text-xs ${textColor} underline underline-offset-2 mt-1 inline-block`}
        >
          {banner.officialToolName} &rarr;
        </a>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: 'text-stone-500',
    active: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
  };

  return (
    <span className={`font-serif text-xs font-medium ${colors[status] || 'text-stone-500'}`}>
      {status}
    </span>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const platformId = searchParams.get('platform');
  const platform = platformId ? getPlatform(platformId) : null;

  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const pollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (platform) {
      setSelectedDataTypes(platform.dataTypes.map(dt => dt.id));
    }
  }, [platform]);

  useEffect(() => {
    if (status === 'authenticated' && currentStep === 'auth') {
      setCurrentStep('data-selection');
    }
  }, [status, currentStep]);

  // Fetch backup history
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/backups')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.backups) setBackupHistory(data.backups);
        })
        .catch(() => {});
    }
  }, [status]);

  const pollBackupStatus = useCallback((jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/backup/status/${jobId}`);
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          if (data?.error) {
            throw new Error(data.error.message || 'Failed to fetch status');
          }
          throw new Error('Failed to fetch status');
        }

        const statusData: BackupStatus = await response.json();
        setBackupProgress(statusData.progress);

        if (statusData.state === 'completed' && statusData.result) {
          clearInterval(pollInterval);
          pollCleanupRef.current = null;
          setIsProcessing(false);
          setDownloadUrl(`/api/download/${statusData.result.archiveId}`);
          setCurrentStep('download');
        } else if (statusData.state === 'failed') {
          clearInterval(pollInterval);
          pollCleanupRef.current = null;
          setIsProcessing(false);
          setErrorInfo({
            code: 'BACKUP_START_FAILED',
            message: 'Backup failed. Please try again.',
            suggestion: 'If the problem persists, try reconnecting your account.',
          });
          setCurrentStep('data-selection');
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 2000);

    pollCleanupRef.current = () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
    };
  }, []);

  if (!platform) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-stone-800 mb-4">Platform not found</h2>
          <Link href="/" className="font-serif text-terracotta hover:underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const toggleDataType = (id: string) => {
    setSelectedDataTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAuth = async () => {
    setIsProcessing(true);
    await signIn(platform.id, {
      callbackUrl: `/dashboard?platform=${platform.id}`,
      redirect: true
    });
  };

  const handleStartBackup = async () => {
    setCurrentStep('backup');
    setIsProcessing(true);
    setBackupProgress(0);
    setErrorInfo(null);

    try {
      const response = await fetch('/api/backup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.id,
          dataTypes: selectedDataTypes
        })
      });

      const data = await response.json();

      if (data.success && data.jobId) {
        pollBackupStatus(data.jobId);
      } else {
        const errData = data.error || data;
        throw { code: errData.code, message: errData.message, suggestion: errData.suggestion };
      }
    } catch (error) {
      console.error('Backup error:', error);
      setIsProcessing(false);
      if (error && typeof error === 'object' && 'code' in error) {
        setErrorInfo(error as ErrorInfo);
      } else {
        setErrorInfo({
          code: 'BACKUP_START_FAILED',
          message: 'Failed to start backup. Please try again.',
          suggestion: 'Check your connection and try again.',
        });
      }
      setCurrentStep('data-selection');
    }
  };

  const handleRetry = async (jobId: string) => {
    setErrorInfo(null);
    try {
      const response = await fetch(`/api/backup/${jobId}/retry`, { method: 'POST' });
      const data = await response.json();

      if (data.success && data.jobId) {
        setCurrentStep('backup');
        setIsProcessing(true);
        setBackupProgress(0);
        pollBackupStatus(data.jobId);
      } else {
        const errData = data.error || data;
        setErrorInfo({
          code: errData.code || 'BACKUP_START_FAILED',
          message: errData.message || 'Retry failed',
          suggestion: errData.suggestion || 'Please try again.',
        });
      }
    } catch {
      setErrorInfo({
        code: 'BACKUP_START_FAILED',
        message: 'Failed to retry backup.',
        suggestion: 'Check your connection and try again.',
      });
    }
  };

  const handleResendEmail = async (archiveId: string) => {
    try {
      const response = await fetch(`/api/download/${archiveId}/resend-email`, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setErrorInfo({
          code: 'SUCCESS',
          message: 'Email sent successfully!',
          suggestion: 'Check your inbox for the download link.',
        });
      } else {
        const errData = data.error || data;
        setErrorInfo({
          code: errData.code || 'INTERNAL_ERROR',
          message: errData.message || 'Failed to resend email',
          suggestion: errData.suggestion || 'Please try again.',
        });
      }
    } catch {
      setErrorInfo({
        code: 'INTERNAL_ERROR',
        message: 'Failed to resend email.',
        suggestion: 'Check your connection and try again.',
      });
    }
  };

  const handleProceedToDeletion = () => {
    setCurrentStep('deletion');
  };

  const handleOpenDeletionPage = () => {
    window.open(platform.deletionURL, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmDeletion = async () => {
    await signOut({ redirect: false });
    setCurrentStep('complete');
  };

  const steps: Step[] = ['welcome', 'auth', 'data-selection', 'backup', 'download', 'deletion', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg text-stone-700 hover:text-stone-900 transition-colors">
          unsocial.me
        </Link>
        <span className="font-serif text-stone-500">
          {platform.name}
        </span>
      </header>

      {/* Progress */}
      <div className="px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center space-x-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStepIndex ? 'bg-stone-700' : 'bg-stone-300'
              }`} />
              {index < steps.length - 1 && (
                <div className={`w-8 h-px mx-1 transition-colors ${
                  index < currentStepIndex ? 'bg-stone-700' : 'bg-stone-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-xl">

          {/* Error Banner */}
          {errorInfo && (
            <ErrorBanner error={errorInfo} onDismiss={() => setErrorInfo(null)} />
          )}

          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                Let's back up your {platform.name}
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-12 leading-relaxed">
                {platform.prompts.welcome}
              </p>
              <button
                onClick={() => setCurrentStep('auth')}
                className="px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Auth Step */}
          {currentStep === 'auth' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                Connect your account
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-8 leading-relaxed">
                You'll be redirected to {platform.name} to securely authorize access.
                We never see your password.
              </p>

              <div className="bg-sand/50 rounded-2xl p-6 mb-10 text-left">
                <p className="font-serif text-sm text-stone-600">
                  We use OAuth 2.0, the same secure standard used by Google, Apple, and others.
                  Your credentials stay with {platform.name}.
                </p>
              </div>

              <button
                onClick={handleAuth}
                disabled={isProcessing || status === 'loading'}
                className={`px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors ${
                  isProcessing || status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing || status === 'loading' ? 'Connecting...' : `Connect ${platform.name}`}
              </button>
            </div>
          )}

          {/* Data Selection Step */}
          {currentStep === 'data-selection' && (
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8 text-center">
                What to back up
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-10 text-center leading-relaxed">
                Select the data you want to preserve.
              </p>

              {/* LinkedIn: prominent CTA to request official export */}
              {platform.id === 'linkedin' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
                  <p className="font-serif text-blue-900 font-medium mb-2">
                    Important: Request your official LinkedIn data export
                  </p>
                  <p className="font-serif text-sm text-blue-700 mb-4">
                    LinkedIn&apos;s API provides very limited data. For a complete backup of your connections,
                    messages, recommendations, and full profile, you should request your official data export.
                    This takes up to 24 hours, so start now.
                  </p>
                  <a
                    href="https://www.linkedin.com/psettings/member-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-2 bg-blue-600 text-white font-serif text-sm rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Request LinkedIn Data Export &rarr;
                  </a>
                </div>
              )}

              <div className="space-y-3 mb-10">
                {platform.dataTypes.map((dataType) => {
                  const banners = platform.limitationBanners.filter(b => b.dataTypeId === dataType.id);
                  return (
                    <div key={dataType.id}>
                      <label
                        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedDataTypes.includes(dataType.id)
                            ? 'border-stone-700 bg-sand/30'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDataTypes.includes(dataType.id)}
                          onChange={() => toggleDataType(dataType.id)}
                          className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500 mr-4"
                        />
                        <div>
                          <div className="font-serif text-stone-800">{dataType.name}</div>
                          <div className="font-serif text-sm text-stone-500">{dataType.description}</div>
                        </div>
                      </label>
                      {selectedDataTypes.includes(dataType.id) && banners.map((banner, idx) => (
                        <LimitationBannerDisplay key={idx} banner={banner} />
                      ))}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleStartBackup}
                disabled={selectedDataTypes.length === 0}
                className={`w-full px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors ${
                  selectedDataTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Start backup
              </button>
            </div>
          )}

          {/* Backup Step */}
          {currentStep === 'backup' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                Backing up...
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-10">
                This may take a few minutes.
              </p>

              <div className="w-full bg-sand rounded-full h-2 mb-4">
                <div
                  className="bg-stone-700 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${backupProgress}%` }}
                />
              </div>
              <p className="font-serif text-stone-500">{backupProgress}%</p>
            </div>
          )}

          {/* Download Step */}
          {currentStep === 'download' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                Your backup is ready
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-10 leading-relaxed">
                Download your archive and store it somewhere safe.
              </p>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="inline-block px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors mb-6"
                >
                  Download archive
                </a>
              )}

              <div className="bg-sand/50 rounded-2xl p-6 mb-6">
                <p className="font-serif text-sm text-stone-600">
                  This link expires in 7 days. Make sure to download before then.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10 text-left">
                <p className="font-serif text-sm text-blue-800 font-medium mb-2">Your backup is encrypted</p>
                <p className="font-serif text-xs text-blue-700">
                  For your security, the archive is encrypted with AES-256-GCM. Check your email for the
                  decryption passphrase. You'll need it to access your data after downloading.
                </p>
              </div>

              <button
                onClick={handleProceedToDeletion}
                className="font-serif text-stone-500 hover:text-stone-700 underline underline-offset-4 transition-colors"
              >
                Continue to deletion guide
              </button>
            </div>
          )}

          {/* Deletion Step */}
          {currentStep === 'deletion' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                Ready to delete?
              </h2>

              <div className="bg-sand/50 rounded-2xl p-6 mb-10 text-left">
                <p className="font-serif text-sm text-stone-600 mb-4">
                  {platform.prompts.deletionWarning}
                </p>
                <ol className="font-serif text-sm text-stone-600 space-y-2 list-decimal list-inside">
                  {platform.deletionSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <button
                onClick={handleOpenDeletionPage}
                className="px-10 py-4 bg-terracotta text-cream font-serif text-lg rounded-full hover:bg-terracotta/90 transition-colors mb-4"
              >
                Open {platform.name} deletion page
              </button>

              <div>
                <button
                  onClick={handleConfirmDeletion}
                  className="font-serif text-stone-500 hover:text-stone-700 underline underline-offset-4 transition-colors"
                >
                  I'm done, or skip this step
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-8">
                You're all set
              </h2>
              <p className="font-serif text-lg text-stone-500 mb-10 leading-relaxed">
                Your memories are safe. Take care.
              </p>

              <Link
                href="/"
                className="inline-block px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors"
              >
                Back to home
              </Link>
            </div>
          )}

          {/* Backup History */}
          {status === 'authenticated' && backupHistory.length > 0 && (
            <div className="mt-16 border-t border-stone-200 pt-8">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="font-serif text-stone-500 hover:text-stone-700 text-sm underline underline-offset-4 transition-colors"
              >
                {showHistory ? 'Hide' : 'Show'} backup history ({backupHistory.length})
              </button>

              {showHistory && (
                <div className="mt-4 space-y-3">
                  {backupHistory.map((item) => (
                    <div key={item.id} className="bg-sand/30 rounded-xl p-4 border border-stone-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-serif text-stone-800 text-sm capitalize">{item.platform}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="font-serif text-xs text-stone-400 mb-2">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      {item.errorMessage && (
                        <p className="font-serif text-xs text-red-500 mb-2">{item.errorMessage}</p>
                      )}
                      <div className="flex gap-3">
                        {item.archive && !item.archive.expired && (
                          <a
                            href={`/api/download/${item.archive.id}`}
                            className="font-serif text-xs text-stone-600 hover:text-stone-800 underline underline-offset-2"
                          >
                            Download
                          </a>
                        )}
                        {item.archive && !item.archive.expired && (
                          <button
                            onClick={() => handleResendEmail(item.archive!.id)}
                            className="font-serif text-xs text-stone-600 hover:text-stone-800 underline underline-offset-2"
                          >
                            Resend email
                          </button>
                        )}
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="font-serif text-xs text-terracotta hover:text-terracotta/80 underline underline-offset-2"
                          >
                            Retry
                          </button>
                        )}
                        {item.archive?.expired && (
                          <span className="font-serif text-xs text-stone-400">Expired</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 text-center">
        <p className="font-serif text-sm text-stone-400">
          Your data, your choice.
        </p>
      </footer>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="font-serif text-stone-500">Loading...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

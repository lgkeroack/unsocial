'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { getPlatform } from '@/lib/platforms';
import Link from 'next/link';

type Step = 'welcome' | 'auth' | 'data-selection' | 'backup' | 'download' | 'deletion' | 'complete';

interface BackupStatus {
  state: string;
  progress: number;
  result?: {
    archiveId: string;
  };
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
  const [, setBackupJobId] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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

  const pollBackupStatus = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/backup/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const statusData: BackupStatus = await response.json();
        setBackupProgress(statusData.progress);

        if (statusData.state === 'completed' && statusData.result) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setDownloadUrl(`/api/download/${statusData.result.archiveId}`);
          setCurrentStep('download');
        } else if (statusData.state === 'failed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          alert('Backup failed. Please try again.');
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
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
        setBackupJobId(data.jobId);
        pollBackupStatus(data.jobId);
      } else {
        throw new Error(data.error || 'Backup failed to start');
      }
    } catch (error) {
      console.error('Backup error:', error);
      setIsProcessing(false);
      alert('Failed to start backup. Please try again.');
      setCurrentStep('data-selection');
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

              <div className="space-y-3 mb-10">
                {platform.dataTypes.map((dataType) => (
                  <label
                    key={dataType.id}
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
                ))}
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

              <div className="bg-sand/50 rounded-2xl p-6 mb-10">
                <p className="font-serif text-sm text-stone-600">
                  This link expires in 7 days. Make sure to download before then.
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

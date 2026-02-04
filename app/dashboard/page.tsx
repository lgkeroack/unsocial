'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { getPlatform, Platform } from '@/lib/platforms';
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
  const [backupJobId, setBackupJobId] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Initialize with all data types selected
  useEffect(() => {
    if (platform) {
      setSelectedDataTypes(platform.dataTypes.map(dt => dt.id));
    }
  }, [platform]);

  // Check if user is authenticated after OAuth
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Platform not found</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to home
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="text-3xl">&#128682;</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                unsocial.me
              </h1>
            </Link>
            <div className="flex items-center space-x-3">
              <div className={`text-4xl bg-gradient-to-br ${platform.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
                {platform.icon}
              </div>
              <span className="text-xl font-semibold">{platform.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  currentStep === step ? 'bg-blue-600 text-white' :
                  steps.indexOf(currentStep) > index ? 'bg-green-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {steps.indexOf(currentStep) > index ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && <div className="w-8 md:w-12 h-0.5 bg-slate-200 mx-1 md:mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">

          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Welcome to Your {platform.name} Exit</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {platform.prompts.welcome}
              </p>

              {platform.limitations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                  <h3 className="font-semibold text-amber-800 mb-2">Important Notes:</h3>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {platform.limitations.map((limitation, i) => (
                      <li key={i}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setCurrentStep('auth')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all w-full"
              >
                Let's Get Started
              </button>
            </div>
          )}

          {/* Auth Step */}
          {currentStep === 'auth' && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Connect Your {platform.name} Account</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Click below to securely connect your account. You'll be redirected to {platform.name} to log in and authorize us to back up your data.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">&#128274;</div>
                  <div>
                    <h3 className="font-semibold mb-2">Secure OAuth Authentication</h3>
                    <p className="text-sm text-slate-600">
                      We use official OAuth 2.0 authentication. We never see or store your password.
                      You'll log in directly through {platform.name}'s secure interface.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAuth}
                disabled={isProcessing || status === 'loading'}
                className={`bg-gradient-to-br ${platform.color} text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all w-full ${
                  isProcessing || status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing || status === 'loading' ? platform.prompts.authInProgress : platform.prompts.authButton}
              </button>
            </div>
          )}

          {/* Data Selection Step */}
          {currentStep === 'data-selection' && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Select Data to Back Up</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {platform.prompts.dataSelection}
              </p>

              <div className="space-y-3 mb-8">
                {platform.dataTypes.map((dataType) => (
                  <label
                    key={dataType.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDataTypes.includes(dataType.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDataTypes.includes(dataType.id)}
                      onChange={() => toggleDataType(dataType.id)}
                      className="w-5 h-5 text-blue-600 rounded mr-4"
                    />
                    <div className="text-2xl mr-4">{dataType.icon}</div>
                    <div>
                      <div className="font-semibold">{dataType.name}</div>
                      <div className="text-sm text-slate-500">{dataType.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleStartBackup}
                disabled={selectedDataTypes.length === 0}
                className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all w-full ${
                  selectedDataTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Start Backup ({selectedDataTypes.length} types selected)
              </button>
            </div>
          )}

          {/* Backup Step */}
          {currentStep === 'backup' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-6">&#128230;</div>
              <h2 className="text-3xl font-bold mb-4">Backing Up Your Data</h2>
              <p className="text-lg text-slate-600 mb-8">
                {platform.prompts.backupProgress}
              </p>

              <div className="w-full bg-slate-200 rounded-full h-4 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${backupProgress}%` }}
                />
              </div>
              <p className="text-slate-500">{backupProgress}% complete</p>
            </div>
          )}

          {/* Download Step */}
          {currentStep === 'download' && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">&#127881;</div>
                <h2 className="text-3xl font-bold mb-4">{platform.prompts.backupComplete}</h2>
                <p className="text-lg text-slate-600">
                  {platform.prompts.downloadReady}
                </p>
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all text-center mb-6"
                >
                  &#128229; Download Your Archive
                </a>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Important:</strong> Your backup will be available for 7 days. Download it now and store it safely.
                </p>
              </div>

              <button
                onClick={handleProceedToDeletion}
                className="w-full border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              >
                Proceed to Account Deletion Guide
              </button>
            </div>
          )}

          {/* Deletion Step */}
          {currentStep === 'deletion' && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Delete Your {platform.name} Account</h2>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">&#9888;&#65039;</div>
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">Warning</h3>
                    <p className="text-sm text-red-700">
                      {platform.prompts.deletionWarning}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-4">Steps to Delete Your Account:</h3>
              <ol className="list-decimal list-inside space-y-3 mb-8 text-slate-700">
                {platform.deletionSteps.map((step, i) => (
                  <li key={i} className="pl-2">{step}</li>
                ))}
              </ol>

              <button
                onClick={handleOpenDeletionPage}
                className="w-full bg-red-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-red-700 transition-all mb-4"
              >
                Open {platform.name} Account Deletion Page
              </button>

              <button
                onClick={handleConfirmDeletion}
                className="w-full border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              >
                I've Deleted My Account (or Skip This Step)
              </button>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-6">&#127881;</div>
              <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {platform.prompts.complete}
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-green-800 mb-2">Your Data is Safe</h3>
                <p className="text-sm text-green-700">
                  Make sure you've downloaded your backup archive and stored it in a safe place.
                  Your memories will be preserved in standard formats you can access anytime.
                </p>
              </div>

              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all"
              >
                Back Up Another Platform
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128260;</div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

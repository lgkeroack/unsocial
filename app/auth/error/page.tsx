'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration. Please try again later.',
    AccessDenied: 'You denied access to your account. Please try again and grant permissions to continue.',
    Verification: 'The verification link has expired or has already been used.',
    OAuthSignin: 'Error in the OAuth sign-in process. Please try again.',
    OAuthCallback: 'Error in the OAuth callback process. Please try again.',
    OAuthCreateAccount: 'Could not create OAuth account. Please try again.',
    EmailCreateAccount: 'Could not create email account. Please try again.',
    Callback: 'Error in the authentication callback. Please try again.',
    OAuthAccountNotLinked: 'This email is already linked to another account.',
    SessionRequired: 'You need to be signed in to access this page.',
    Default: 'An authentication error occurred. Please try again.',
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-6">&#9888;&#65039;</div>
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-slate-600 mb-8">{message}</p>

        {error && (
          <div className="bg-slate-100 rounded-lg p-4 mb-8">
            <p className="text-sm text-slate-500">
              Error code: <code className="font-mono">{error}</code>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Return Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="block w-full border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128260;</div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

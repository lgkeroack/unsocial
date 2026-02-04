'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="px-8 py-6">
        <Link href="/" className="font-serif text-lg text-stone-700 hover:text-stone-900 transition-colors">
          unsocial.me
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-md w-full text-center">
          <h1 className="font-serif text-3xl text-stone-800 mb-6">Something went wrong</h1>
          <p className="font-serif text-lg text-stone-500 mb-8">{message}</p>

          {error && (
            <div className="bg-sand/50 rounded-2xl p-4 mb-10">
              <p className="font-serif text-sm text-stone-500">
                Error: {error}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-block px-10 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors"
            >
              Return home
            </Link>
            <div>
              <button
                onClick={() => window.history.back()}
                className="font-serif text-stone-500 hover:text-stone-700 underline underline-offset-4 transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-8 py-6 text-center">
        <p className="font-serif text-sm text-stone-400">
          Your data, your choice.
        </p>
      </footer>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="font-serif text-stone-500">Loading...</p>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

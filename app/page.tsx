'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const platforms = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
];

export default function Home() {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleGetStarted = () => {
    router.push(`/dashboard?platform=${selectedPlatform.id}`);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Minimal Header */}
      <header className="px-8 py-6">
        <Link href="/" className="font-serif text-lg text-stone-700 hover:text-stone-900 transition-colors">
          unsocial.me
        </Link>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-8 pb-24">
        <div className="text-center max-w-4xl">
          {/* The Big Statement */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-stone-800 leading-tight tracking-tight">
            I want to get rid of{' '}
            <span className="relative inline-block">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="underline decoration-2 decoration-stone-400 underline-offset-8 hover:decoration-terracotta transition-colors cursor-pointer focus:outline-none focus:decoration-terracotta"
              >
                {selectedPlatform.name}
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white rounded-lg shadow-xl border border-stone-200 py-2 min-w-[200px] z-50">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-6 py-3 text-left font-serif text-xl hover:bg-cream transition-colors ${
                        selectedPlatform.id === platform.id ? 'text-terracotta' : 'text-stone-700'
                      }`}
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>
              )}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-12 font-serif text-xl sm:text-2xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
            Back up your memories, then leave on your own terms.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleGetStarted}
            className="mt-16 px-12 py-4 bg-stone-800 text-cream font-serif text-lg rounded-full hover:bg-stone-700 transition-colors"
          >
            Begin
          </button>
        </div>
      </main>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Minimal Footer */}
      <footer className="px-8 py-6 text-center">
        <p className="font-serif text-sm text-stone-400">
          Your data, your choice.
        </p>
      </footer>
    </div>
  );
}

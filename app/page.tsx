import Link from 'next/link';
import { getAllPlatforms } from '@/lib/platforms';

export default function Home() {
  const platforms = getAllPlatforms();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">&#128682;</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                unsocial.me
              </h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#platforms" className="text-slate-600 hover:text-slate-900 transition-colors">
                Platforms
              </a>
              <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors">
                FAQ
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            Exit Social Media
            <br />
            <span className="text-4xl md:text-5xl">On Your Own Terms</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Back up your photos, posts, and memories before you go.
            We help you preserve your digital life so you can leave social media without losing what matters.
          </p>
          <a
            href="#platforms"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
          >
            Get Started
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-bold text-center mb-16">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                1
              </div>
              <h4 className="text-xl font-semibold mb-3">Connect Your Account</h4>
              <p className="text-slate-600">
                Securely log in through the platform's official OAuth. We never see your password.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                2
              </div>
              <h4 className="text-xl font-semibold mb-3">Back Up Your Data</h4>
              <p className="text-slate-600">
                We download your photos, posts, and memories into standard formats you can keep forever.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                3
              </div>
              <h4 className="text-xl font-semibold mb-3">Delete With Confidence</h4>
              <p className="text-slate-600">
                Once your backup is safe, we'll guide you through deleting your account if you choose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-bold text-center mb-6">Choose Your Platform</h3>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Select the social media platform you want to back up and exit from.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <Link
                key={platform.id}
                href={`/dashboard?platform=${platform.id}`}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-slate-200"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {platform.icon}
                </div>
                <h4 className="text-2xl font-bold mb-2">{platform.name}</h4>
                <p className="text-slate-600 mb-4">{platform.description}</p>
                <div className="flex items-center text-blue-600 font-medium">
                  Start Backup
                  <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h3 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-2">Is my data safe with you?</h4>
              <p className="text-slate-600">
                We use secure OAuth authentication - we never see your password. Your backup is encrypted and stored temporarily.
                After 7 days, it's automatically deleted from our servers. You should download it immediately.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-2">What file formats will I receive?</h4>
              <p className="text-slate-600">
                Photos are saved as JPEG, videos as MP4, and all metadata as JSON files.
                Everything is packaged in a standard ZIP file you can open with any computer.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-2">Do you actually delete my account?</h4>
              <p className="text-slate-600">
                No. We only back up your data. Account deletion must be done by you through the official platform settings.
                We provide step-by-step guidance for each platform.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-2">What about messages and DMs?</h4>
              <p className="text-slate-600">
                API access to private messages is limited. For complete message backups,
                we recommend also using each platform's official "Download Your Data" feature.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-slate-50">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-2xl">&#128682;</span>
              <span className="font-bold text-xl">unsocial.me</span>
            </div>
            <p className="text-slate-500 text-sm">
              Take control of your digital life. Your data, your choice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

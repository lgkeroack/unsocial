'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface AdminStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalUsers: number;
  totalArchives: number;
}

interface RecentJob {
  id: string;
  platform: string;
  status: string;
  progress: number;
  createdAt: string;
  userName: string;
}

interface HealthStatus {
  redis: boolean;
  s3: boolean;
  database: boolean;
}

interface AdminData {
  stats: AdminStats;
  recentJobs: RecentJob[];
  health: HealthStatus;
}

function HealthDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: 'bg-stone-200 text-stone-700',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-stone-200 text-stone-700'}`}>
      {status}
    </span>
  );
}

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    async function fetchAdmin() {
      try {
        const response = await fetch('/api/admin');
        if (response.status === 403) {
          setError('Access denied. You do not have admin permissions.');
          return;
        }
        if (!response.ok) {
          setError('Failed to load admin data.');
          return;
        }
        const adminData: AdminData = await response.json();
        setData(adminData);
      } catch {
        setError('Failed to connect to admin API.');
      } finally {
        setLoading(false);
      }
    }

    fetchAdmin();
  }, [authStatus]);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="font-serif text-stone-500">Loading...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-stone-800 mb-4">Sign in required</h2>
          <Link href="/" className="font-serif text-terracotta hover:underline">Return home</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-stone-800 mb-4">Admin Dashboard</h2>
          <p className="font-serif text-terracotta mb-4">{error}</p>
          <Link href="/" className="font-serif text-stone-500 hover:underline">Return home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-cream">
      <header className="px-8 py-6 flex items-center justify-between border-b border-stone-200">
        <Link href="/" className="font-serif text-lg text-stone-700 hover:text-stone-900 transition-colors">
          unsocial.me
        </Link>
        <span className="font-serif text-stone-500">Admin Dashboard</span>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* Health Status */}
        <section className="mb-10">
          <h2 className="font-serif text-xl text-stone-800 mb-4">System Health</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 font-serif text-stone-600">
              <HealthDot healthy={data.health.database} /> Database
            </div>
            <div className="flex items-center gap-2 font-serif text-stone-600">
              <HealthDot healthy={data.health.redis} /> Redis
            </div>
            <div className="flex items-center gap-2 font-serif text-stone-600">
              <HealthDot healthy={data.health.s3} /> S3 Storage
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-10">
          <h2 className="font-serif text-xl text-stone-800 mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Jobs', value: data.stats.totalJobs },
              { label: 'Active', value: data.stats.activeJobs },
              { label: 'Completed', value: data.stats.completedJobs },
              { label: 'Failed', value: data.stats.failedJobs },
              { label: 'Users', value: data.stats.totalUsers },
              { label: 'Archives', value: data.stats.totalArchives },
            ].map(({ label, value }) => (
              <div key={label} className="bg-sand/30 rounded-xl p-4 text-center">
                <div className="font-serif text-2xl text-stone-800">{value}</div>
                <div className="font-serif text-sm text-stone-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Jobs */}
        <section>
          <h2 className="font-serif text-xl text-stone-800 mb-4">Recent Jobs</h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-sand/20">
                  <th className="px-4 py-3 text-left font-serif text-sm text-stone-600">Platform</th>
                  <th className="px-4 py-3 text-left font-serif text-sm text-stone-600">User</th>
                  <th className="px-4 py-3 text-left font-serif text-sm text-stone-600">Status</th>
                  <th className="px-4 py-3 text-left font-serif text-sm text-stone-600">Progress</th>
                  <th className="px-4 py-3 text-left font-serif text-sm text-stone-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJobs.map((job) => (
                  <tr key={job.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-serif text-sm text-stone-800 capitalize">{job.platform}</td>
                    <td className="px-4 py-3 font-serif text-sm text-stone-600">{job.userName}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 font-serif text-sm text-stone-600">{job.progress}%</td>
                    <td className="px-4 py-3 font-serif text-sm text-stone-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.recentJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-serif text-stone-400">
                      No jobs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

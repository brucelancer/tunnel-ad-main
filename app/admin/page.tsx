'use client';

import Link from 'next/link';

export default function AdminIndexPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
        
        <ul className="space-y-2">
          <li>
            <Link href="/admin/fix-points" className="text-blue-500 hover:underline">
              Fix User Points
            </Link>
            <p className="text-sm text-gray-600 mt-1">
              Update user points to correct discrepancies between app and Sanity
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
} 
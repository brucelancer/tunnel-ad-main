'use client';

import { useState, FormEvent } from 'react';

interface UserData {
  _id: string;
  username: string;
  points: number;
}

interface UpdatedUser {
  _id: string;
  rev: string;
  previousPoints: number;
  newPoints: number;
}

interface ResultState {
  currentUser: UserData | null;
  updated: UpdatedUser | null;
  verified?: UserData;
}

export default function FixPointsPage() {
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // First fetch the current user data
      const getUserResponse = await fetch(`/api/debug-user?userId=${userId}`);
      const userData = await getUserResponse.json();

      if (!userData.success) {
        throw new Error(userData.error || 'Failed to fetch user data');
      }

      // Set current user info in result
      setResult({
        currentUser: userData.user,
        updated: null
      });

      // Now update the points
      const updateResponse = await fetch('/api/debug-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          points: parseInt(points)
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateData.success) {
        throw new Error(updateData.error || 'Failed to update points');
      }

      // Update result with the updated info
      setResult((prev: ResultState | null) => ({
        ...prev!,
        updated: updateData.updatedUser
      }));

      // Verify the update
      const verifyResponse = await fetch(`/api/debug-user?userId=${userId}`);
      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        setResult((prev: ResultState | null) => ({
          ...prev!,
          verified: verifyData.user
        }));
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error updating points:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Fix User Points</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter user ID"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
              Correct Points Value
            </label>
            <input
              type="number"
              id="points"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter correct points value"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
          >
            {loading ? 'Updating...' : 'Update Points'}
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          
          {result.currentUser && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">Original User Data:</h3>
              <p className="mt-1">Username: {result.currentUser.username}</p>
              <p className="mt-1">Points: {result.currentUser.points}</p>
            </div>
          )}
          
          {result.updated && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">Update Results:</h3>
              <p className="mt-1">Previous Points: {result.updated.previousPoints}</p>
              <p className="mt-1">New Points: {result.updated.newPoints}</p>
            </div>
          )}
          
          {result.verified && (
            <div className="mb-4">
              <h3 className="font-medium text-green-700">Verification:</h3>
              <p className="mt-1">Username: {result.verified.username}</p>
              <p className="mt-1">Current Points: {result.verified.points}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
import { useState, useEffect } from 'react';

export interface Egg {
  id: number;
  name: string;
  required: number;
  image: string;
}

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Manages egg data fetched from the backend.
export function useEggs() {
  
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetches eggs when the hook is loaded.
  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const response = await authFetch('/api/eggs');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch eggs');
        }

        setEggs(result.data);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to load eggs'
        );
        console.error('Fetch eggs error:', error);
      }
    };

    fetchEggs();
  }, []);

  return { eggs, error };
}

import { useState, useEffect } from 'react';

export interface Egg {
  id: number;        // ← แก้จาก string เป็น number ให้ตรงกับ schema (serial)
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

export function useEggs() {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const response = await authFetch('/api/eggs');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch eggs');
        setEggs(result.data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load eggs');
        console.error('Fetch eggs error:', error);
      }
    };
    fetchEggs();
  }, []);

  return { eggs, error };
}
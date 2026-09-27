import { useState, useEffect } from 'react';

export interface Egg {
  id: string;
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

  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const response = await authFetch('/api/eggs');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch eggs');
        setEggs(result.data);
      } catch (error) {
        console.error('Fetch eggs error:', error);
      }
    };
    fetchEggs();
  }, []);

  return { eggs };
}
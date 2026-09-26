import { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  color: string;
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

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await authFetch('/api/categories');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch categories');
        setCategories(result.data);
      } catch (error) {
        console.error('Fetch categories error:', error);
      }
    };
    fetchCategories();
  }, []);

  const createCategory = async (name: string, color: string) => {
    const response = await authFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create category');
    const newCat: Category = result.data;
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateCategory = async (id: string, name: string, color: string) => {
    const response = await authFetch(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update category');
    const updated: Category = result.data;
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteCategory = async (id: string) => {
    const previous = categories;
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      const response = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete category');
      }
    } catch (error) {
      setCategories(previous);
      throw error;
    }
  };

  return { categories, createCategory, updateCategory, deleteCategory };
}
import { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  color: string;
}

// Sends an API request with the user's authentication token.
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

// Manages category data and CRUD operations.
export function useCategories() {
  
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetches categories when the hook is loaded.
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await authFetch('/api/categories');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch categories');
        }

        setCategories(result.data);
      } catch (error) {
        console.error('Fetch categories error:', error);
      }
    };

    fetchCategories();
  }, []);

  // Creates a new category.
  const createCategory = async (name: string, color: string) => {
    const response = await authFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create category');
    }

    const newCat: Category = result.data;
    setCategories(prev => [...prev, newCat]);

    return newCat;
  };

  // Updates an existing category.
  const updateCategory = async (id: string, name: string, color: string) => {
    const response = await authFetch(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update category');
    }

    const updated: Category = result.data;
    setCategories(prev => prev.map(c => c.id === id ? updated : c));

    return updated;
  };

  // Deletes a category.
  const deleteCategory = async (id: string) => {
    const previous = categories;
    setCategories(prev => prev.filter(c => c.id !== id));

    try {
      const response = await authFetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete category');
      }
    } catch (error) {
      // Restores the category if deletion fails.
      setCategories(previous);
      throw error;
    }
  };

  // Returns categories and CRUD functions.
  return { categories, createCategory, updateCategory, deleteCategory };
}


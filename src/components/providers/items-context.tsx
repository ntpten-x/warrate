"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseClientError } from "@/lib/error";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-context";

export interface Item {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon_name?: string;
  };
  image_url: string;
  created_at: string;
}

interface PaginatedItemsResponse {
  data: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ItemsContextType {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  
  // Pagination & Filtering state
  page: number;
  limit: number;
  search: string;
  category: string;
  totalPages: number;
  totalItems: number;
  
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  
  createItem: (item: { name: string; categoryId: string; image_url: string }) => Promise<any>;
  updateItem: (item: { id: string; name: string; categoryId: string; image_url: string }) => Promise<any>;
  deleteItem: (id: string) => Promise<any>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local state for pagination and filtering (defaults category to "all")
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Reset page to 1 whenever search or category changes
  useEffect(() => {
    setPage(1);
  }, [search, category]);

  // useQuery to fetch paginated and filtered items
  const { data, isLoading, error: queryError } = useQuery<PaginatedItemsResponse>({
    queryKey: ["items", page, limit, search, category],
    enabled: !!user,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(
        `/api/manage-items?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      if (!res.ok) {
        throw res;
      }
      return res.json();
    },
  });

  // Decode query errors
  useEffect(() => {
    if (queryError) {
      parseClientError(queryError).then((msg) => setErrorMsg(msg));
    } else {
      setErrorMsg(null);
    }
  }, [queryError]);

  // useMutation to create item
  const createMutation = useMutation({
    mutationFn: async (newItem: { name: string; categoryId: string; image_url: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch("/api/manage-items", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) {
        throw res;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  // useMutation to update item
  const updateMutation = useMutation({
    mutationFn: async (updatedItem: { id: string; name: string; categoryId: string; image_url: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch("/api/manage-items", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedItem),
      });
      if (!res.ok) {
        throw res;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  // useMutation to delete item
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`/api/manage-items?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw res;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  const createItem = async (item: { name: string; categoryId: string; image_url: string }) => {
    try {
      return await createMutation.mutateAsync(item);
    } catch (err) {
      const msg = await parseClientError(err);
      throw new Error(msg);
    }
  };

  const updateItem = async (item: { id: string; name: string; categoryId: string; image_url: string }) => {
    try {
      return await updateMutation.mutateAsync(item);
    } catch (err) {
      const msg = await parseClientError(err);
      throw new Error(msg);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      return await deleteMutation.mutateAsync(id);
    } catch (err) {
      const msg = await parseClientError(err);
      throw new Error(msg);
    }
  };

  return (
    <ItemsContext.Provider 
      value={{ 
        items: data?.data || [], 
        isLoading, 
        error: errorMsg, 
        page,
        limit,
        search,
        category,
        totalPages: data?.totalPages || 0,
        totalItems: data?.total || 0,
        setPage,
        setLimit,
        setSearch,
        setCategory,
        createItem, 
        updateItem, 
        deleteItem 
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error("useItems ต้องใช้งานภายใต้ ItemsProvider เท่านั้น");
  }
  return context;
}

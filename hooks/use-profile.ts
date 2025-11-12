"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/auth";
import { getStoredProfile, setStoredProfile } from "@/lib/localStorage";

// Query keys
export const profileKeys = {
  all: ["profile"] as const,
  user: (userId: string) => [...profileKeys.all, userId] as const,
};

// Profile fetching function
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data: profileData, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to fetch profile");
  }

  return profileData;
}

// Profile update function
async function updateUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UserProfile> {
  const supabase = createClient();

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let updatedProfile: UserProfile;

  if (existingProfile) {
    // Update existing profile
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update profile");
    }

    updatedProfile = data;
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        ...profileData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create profile");
    }

    updatedProfile = data;
  }

  return updatedProfile;
}

/**
 * Hook to get user profile
 * CRITICAL: Removed initialData and localStorage sync to prevent race conditions
 * Profile data is set by auth context after successful login
 */
export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.user(userId || ""),
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - profile updates are infrequent but should refresh eventually
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch, use data set by auth context
    refetchOnReconnect: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      userId,
      email,
      profileData,
    }: {
      userId: string;
      email: string;
      profileData: Partial<UserProfile>;
    }) => updateUserProfile(userId, profileData),
    onSuccess: (updatedProfile) => {
      // Update the cache immediately (optimistic update)
      queryClient.setQueryData(
        profileKeys.user(updatedProfile.user_id),
        updatedProfile
      );

      // Update localStorage
      setStoredProfile(updatedProfile);

      // Broadcast storage event to notify other components (client-side only)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "user-profile",
            newValue: JSON.stringify(updatedProfile),
          })
        );
      }

      // Invalidate and refetch related queries to ensure consistency
      // This ensures all components see the updated profile immediately
      queryClient.invalidateQueries({
        queryKey: profileKeys.user(updatedProfile.user_id),
      });
      
      // Force a refetch to ensure the latest data is loaded
      queryClient.refetchQueries({
        queryKey: profileKeys.user(updatedProfile.user_id),
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
    },
  });

  return {
    updateProfile: mutation.mutate,
    updateProfileAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

// Utility hook to clear profile cache
export function useClearProfileCache() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    // Remove all profile queries from cache
    queryClient.removeQueries({ queryKey: profileKeys.all });

    // Clear profile from localStorage
    setStoredProfile(null);

    // Optionally clear all queries (uncomment if needed for complete cleanup)
    // queryClient.clear();
  }, [queryClient]);
}

// Utility hook to clear ALL queries and localStorage on logout
export function useClearAllCache() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    // CRITICAL: Aggressively clear ALL queries
    queryClient.removeQueries(); // Remove all queries
    queryClient.clear(); // Clear entire cache
    queryClient.cancelQueries(); // Cancel any in-flight queries

    // Clear profile from localStorage
    setStoredProfile(null);

    // Note: clearAllStoredData() in auth-context.tsx will also clear menu data
  }, [queryClient]);
}

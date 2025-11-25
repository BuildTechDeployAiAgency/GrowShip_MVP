"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { AuthUser, UserProfile } from "@/types/auth";
import {
  useUserProfile,
  useUpdateProfile,
  useClearProfileCache,
  useClearAllCache,
} from "@/hooks/use-profile";
import {
  uploadAvatar as uploadAvatarFile,
  deleteAvatar,
} from "@/lib/supabase/avatar";
import {
  getStoredUserData,
  setStoredUserData,
  getStoredProfile,
  setStoredProfile,
  clearAllStoredData,
  setStoredMenuData,
  clearStoredMenuData,
  clearLastVisitedPath,
} from "@/lib/localStorage";
import { fetchUserMenuPermissions } from "@/lib/api/menu-permissions";
import { menuPermissionKeys } from "@/hooks/use-menu-permissions";
import { useRoutePersistence } from "@/hooks/use-route-persistence";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  signUp: (
    email: string,
    password: string,
    role: string,
    brandId?: string
  ) => Promise<{ error: any }>;
  signIn: (
    email: string,
    password: string,
    expectedRole?: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  uploadAvatar: (file: File) => Promise<{ error: any; url?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialProfile?: UserProfile | null;
}) {
  // Initialize without localStorage to prevent hydration mismatch
  const [user, setUser] = useState<AuthUser | null>(initialUser || null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorDetails,
  } = useUserProfile(user?.id || null);

  const { updateProfileAsync, isUpdating } = useUpdateProfile();
  const clearProfileCache = useClearProfileCache();
  const clearAllCache = useClearAllCache();
  const queryClient = useQueryClient();
  const { restoreLastPath } = useRoutePersistence(user?.id, { track: false });

  useEffect(() => {
    // Mark component as mounted (client-side only)
    setMounted(true);

    // Load cached user data only on client-side after mount
    const cachedUser = getStoredUserData();
    if (cachedUser && !user) {
      setUser(cachedUser);
    }

    // Always verify cached user against Supabase auth
    const getUser = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const userData = {
            id: user.id,
            email: user.email || "",
          };
          setUser(userData);
          setStoredUserData(userData);
        } else {
          // No valid auth session - clear stale localStorage data
          const cachedData = getStoredUserData();
          if (cachedData) {
            console.log("Clearing stale localStorage data - no valid session");
            clearAllStoredData();
          }
          setUser(null);
          setStoredUserData(null);
        }
      } catch (error) {
        console.error("Error verifying user session:", error);
        // On error, clear stale data to be safe
        clearAllStoredData();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        queryClient.removeQueries();
        queryClient.clear();
        clearAllStoredData();
      } else if (event === "SIGNED_IN" && session?.user) {
        // Update user state on sign in
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
        setStoredUserData(userData);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Ensure user data is up to date after token refresh
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
        setStoredUserData(userData);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, queryClient]);

  useEffect(() => {
    if (
      !mounted ||
      loading ||
      !user ||
      !pathname ||
      !["/", "/dashboard"].includes(pathname)
    ) {
      return;
    }
    restoreLastPath(["/", "/dashboard"]);
  }, [mounted, loading, user, pathname, restoreLastPath]);

  const signUp = async (
    email: string,
    password: string,
    role: string,
    brandId?: string
  ) => {
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      try {
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert({
              user_id: data.user.id,
              role_name: (role + "_admin") as UserProfile["role_name"],
              role_type: role as UserProfile["role_type"],
              company_name: "",
              contact_name: "",
              email: email,
              is_profile_complete: false,
              user_status: "approved" as UserProfile["user_status"],
            });

          if (profileError) {
            console.error("Failed to create user profile:", profileError);
            return {
              error: {
                message: "Database error saving new user",
                details: profileError,
              },
            };
          }

          // Create user membership if brandId is provided
          if (brandId) {
            const { error: membershipError } = await supabase
              .from("user_memberships")
              .insert({
                user_id: data.user.id,
                brand_id: brandId,
                role_name: (role + "_admin") as UserProfile["role_name"],
                is_active: true,
              });

            if (membershipError) {
              console.error(
                "Failed to create user membership:",
                membershipError
              );
              // Don't fail the entire signup if membership creation fails
              // The user can still log in and we can create the membership later
            }
          }
        } else {
          if (existingProfile.role_name !== role) {
            const { error: updateError } = await supabase
              .from("user_profiles")
              .update({
                role_name: role as UserProfile["role_name"],
                role_type: role as UserProfile["role_type"],
              })
              .eq("user_id", data.user.id);

            if (updateError) {
              console.error("Failed to update user profile role:", updateError);
              return {
                error: {
                  message: "Database error updating user profile",
                  details: updateError,
                },
              };
            }
          }
        }
      } catch (profileError) {
        console.error("Error creating user profile:", profileError);
        return {
          error: {
            message: "Database error saving new user",
            details: profileError,
          },
        };
      }
    }

    return { error: null };
  };

  const signIn = async (
    email: string,
    password: string,
    expectedRole?: string
  ) => {
    try {
      setUser(null);
      queryClient.removeQueries();
      queryClient.clear();
      queryClient.cancelQueries();
      clearAllStoredData();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (!data.user) {
        return { error: { message: "Login failed. No user data received." } };
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role_type, user_status")
        .eq("user_id", data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        return {
          error: {
            message: "Unable to verify user account. Please contact support.",
          },
        };
      }

      if (profile.user_status === "suspended") {
        await supabase.auth.signOut();
        return {
          error: {
            message:
              "Your account has been suspended. Please contact your administrator.",
          },
        };
      }

      // Allow super_admin to bypass portal restrictions and access any portal
      if (expectedRole && profile.role_type !== expectedRole && profile.role_type !== "super_admin") {
        await supabase.auth.signOut();
        return {
          error: {
            message: `Access denied. This account is registered as a ${profile.role_type}. Please sign in through the correct portal.`,
          },
        };
      }

      const { data: fullProfile, error: fullProfileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (fullProfileError || !fullProfile) {
        await supabase.auth.signOut();
        return {
          error: {
            message: "Unable to load profile data. Please try again.",
          },
        };
      }

      const menuResult = await fetchUserMenuPermissions(data.user.id);

      setStoredProfile(fullProfile);
      queryClient.setQueryData(["profile", data.user.id], fullProfile);

      if (menuResult.menuItems && menuResult.menuItems.length > 0) {
        setStoredMenuData(data.user.id, menuResult.menuItems);
        queryClient.setQueryData(
          menuPermissionKeys.byUser(data.user.id),
          menuResult
        );
      }

      const userData = {
        id: data.user.id,
        email: data.user.email || "",
      };
      setStoredUserData(userData);
      setUser(userData);

      return { error: null };
    } catch (error) {
      console.error("Unexpected error during sign in:", error);
      await supabase.auth.signOut();
      queryClient.removeQueries();
      queryClient.clear();
      clearAllStoredData();
      setUser(null);
      return {
        error: { message: "An unexpected error occurred. Please try again." },
      };
    }
  };

  const signOut = async () => {
    try {
      const currentUserId = user?.id;
      await supabase.auth.signOut();

      clearAllCache();

      clearAllStoredData();
      if (currentUserId) {
        clearLastVisitedPath(currentUserId);
      }

      setUser(null);

      router.push("/");
    } catch (error) {
      console.error("Error during sign out:", error);

      clearAllCache();
      clearAllStoredData();
      if (user?.id) {
        clearLastVisitedPath(user.id);
      }
      setUser(null);
      router.push("/");
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return { error: "No user logged in" };

    try {
      await updateProfileAsync({
        userId: user.id,
        email: user.email,
        profileData: {
          ...profileData,
          email: user.email,
        },
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message || "Failed to update profile" };
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : '/auth/reset-password';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: "No user logged in" };

    try {
      const result = await uploadAvatarFile(user.id, file);

      if (result.error) {
        return { error: result.error };
      }

      const { error: updateError } = await updateProfile({
        avatar: result.url,
      });

      if (updateError) {
        await deleteAvatar(result.path);
        return { error: updateError };
      }

      return { error: null, url: result.url };
    } catch (error: any) {
      return { error: error.message || "Failed to upload avatar" };
    }
  };

  const value = {
    user,
    profile: profile || null,
    loading,
    profileLoading,
    profileError: profileError
      ? (profileErrorDetails as Error)?.message || "Failed to load profile"
      : null,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    uploadAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

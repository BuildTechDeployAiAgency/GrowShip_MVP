"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  AuthUser,
  UserProfile,
  Organization,
  UserMembership,
} from "@/types/auth";
import {
  createPermissionChecker,
  isSuperAdmin,
  isAdminLevel,
} from "@/lib/permissions";
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
} from "@/lib/localStorage";
import { fetchUserMenuPermissions } from "@/lib/api/menu-permissions";
import { menuPermissionKeys } from "@/hooks/use-menu-permissions";

interface EnhancedAuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  memberships: UserMembership[];
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
  switchOrganization: (brandId: string) => Promise<void>;
  canAccessOrganization: (brandId: string) => boolean;
  canManageUser: (
    targetUserRole: string,
    targetUserOrganizationId?: string
  ) => boolean;
  canPerformAction: (action: string, targetOrganizationId?: string) => boolean;
  getAccessibleOrganizations: () => Organization[];
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(
  undefined
);

export function EnhancedAuthProvider({
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

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

  // Load user organizations and memberships
  const loadUserOrganizations = async (userId: string) => {
    try {
      // Load user memberships with brand data
      const { data: membershipData, error: membershipError } = await supabase
        .from("user_memberships")
        .select(
          `
          *,
          brands!inner(
            id,
            name,
            organization_type,
            is_active,
            created_at
          )
        `
        )
        .eq("user_id", userId)
        .eq("is_active", true);

      if (membershipError) {
        console.error("Error loading memberships:", membershipError);
        return;
      }

      // Convert to Organization objects (Brand objects)
      const orgs: Organization[] = (membershipData || []).map(
        (membership: any) => ({
          id: membership.brands.id,
          name: membership.brands.name,
          slug: membership.brands.name
            .toLowerCase()
            .replace(/\s+/g, "-"),
          organization_type: membership.brands.organization_type,
          is_active: membership.brands.is_active,
          created_at: membership.brands.created_at,
          updated_at: new Date().toISOString(),
        })
      );

      setOrganizations(orgs);
      setMemberships(membershipData || []);

      // Set current organization (first one or stored preference) - only on client
      if (typeof window !== 'undefined') {
        const storedOrgId = localStorage.getItem("currentOrganizationId");
        const defaultOrg = orgs.find((org) => org.id === storedOrgId) || orgs[0];
        if (defaultOrg) {
          setCurrentOrganization(defaultOrg);
          localStorage.setItem("currentOrganizationId", defaultOrg.id);
        }
      } else if (orgs.length > 0) {
        // On server, just set the first org
        setCurrentOrganization(orgs[0]);
      }
    } catch (error) {
      console.error("Error in loadUserOrganizations:", error);
    }
  };

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

          // Load user organizations
          await loadUserOrganizations(user.id);
        } else {
          // No valid auth session - clear stale localStorage data
          const cachedData = getStoredUserData();
          if (cachedData) {
            console.log("Clearing stale localStorage data - no valid session");
            clearAllStoredData();
          }
          setUser(null);
          setOrganizations([]);
          setCurrentOrganization(null);
          setMemberships([]);
          setStoredUserData(null);
        }
      } catch (error) {
        console.error("Error verifying user session:", error);
        // On error, clear stale data to be safe
        clearAllStoredData();
        setUser(null);
        setOrganizations([]);
        setCurrentOrganization(null);
        setMemberships([]);
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
        setOrganizations([]);
        setCurrentOrganization(null);
        setMemberships([]);
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

        // Load user organizations
        await loadUserOrganizations(session.user.id);

        // Invalidate users and customers queries to refresh stats on login
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
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
              brand_id: brandId,
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
            }
          }
        }
      } catch (error) {
        console.error("Error in signUp:", error);
        return {
          error: {
            message: "An unexpected error occurred during signup",
            details: error,
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
      if (menuResult.menuItems.length > 0) {
        setStoredMenuData(data.user.id, menuResult.menuItems);
      }

      const userData = {
        id: data.user.id,
        email: data.user.email || "",
      };
      setUser(userData);
      setStoredUserData(userData);
      setStoredProfile(fullProfile);

      // Load user organizations
      await loadUserOrganizations(data.user.id);

      // Invalidate users and customers queries to refresh stats on login
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      return { error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return {
        error: {
          message: "An unexpected error occurred during sign in",
          details: error,
        },
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setOrganizations([]);
      setCurrentOrganization(null);
      setMemberships([]);
      queryClient.removeQueries();
      queryClient.clear();
      clearAllStoredData();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: "No user logged in" } };
    }

    try {
      await updateProfileAsync({
        userId: user.id,
        email: user.email || "",
        profileData,
      });

      // Refresh organizations if organization-related data changed
      if (profileData.brand_id || profileData.parent_brand_id) {
        await loadUserOrganizations(user.id);
      }

      return { error: null };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        error: {
          message: "An unexpected error occurred while updating profile",
          details: error,
        },
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : '/auth/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error };
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        error: {
          message: "An unexpected error occurred while resetting password",
          details: error,
        },
      };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      console.error("Update password error:", error);
      return {
        error: {
          message: "An unexpected error occurred while updating password",
          details: error,
        },
      };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      return { error: { message: "No user logged in" } };
    }

    try {
      const { error, url } = await uploadAvatarFile(user.id, file);
      if (error) {
        return { error };
      }

      // Update profile with new avatar URL
      await updateProfile({ avatar: url });
      return { error: null, url };
    } catch (error) {
      console.error("Upload avatar error:", error);
      return {
        error: {
          message: "An unexpected error occurred while uploading avatar",
          details: error,
        },
      };
    }
  };

  const switchOrganization = async (brandId: string) => {
    const org = organizations.find((o) => o.id === brandId);
    if (org) {
      setCurrentOrganization(org);
      if (typeof window !== 'undefined') {
        localStorage.setItem("currentOrganizationId", brandId);
      }
    }
  };

  // Permission checking methods
  const canAccessOrganization = (brandId: string): boolean => {
    if (!profile) return false;
    const permissionChecker = createPermissionChecker(
      profile.role_name,
      profile.brand_id
    );
    return permissionChecker.canAccessOrganization(brandId, "");
  };

  const canManageUser = (
    targetUserRole: string,
    targetUserOrganizationId?: string
  ): boolean => {
    if (!profile) return false;
    const permissionChecker = createPermissionChecker(
      profile.role_name,
      profile.brand_id
    );
    return permissionChecker.canManageUser(
      targetUserRole as any,
      targetUserOrganizationId
    );
  };

  const canPerformAction = (
    action: string,
    targetOrganizationId?: string
  ): boolean => {
    if (!profile) return false;
    const permissionChecker = createPermissionChecker(
      profile.role_name,
      profile.brand_id
    );
    return permissionChecker.canPerformAction(action, targetOrganizationId);
  };

  const getAccessibleOrganizations = (): Organization[] => {
    return organizations;
  };

  const value: EnhancedAuthContextType = {
    user,
    profile: profile || null,
    organizations,
    currentOrganization,
    memberships,
    loading,
    profileLoading,
    profileError: profileErrorDetails?.message || null,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    uploadAvatar,
    switchOrganization,
    canAccessOrganization,
    canManageUser,
    canPerformAction,
    getAccessibleOrganizations,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export function useEnhancedAuth() {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error(
      "useEnhancedAuth must be used within an EnhancedAuthProvider"
    );
  }
  return context;
}

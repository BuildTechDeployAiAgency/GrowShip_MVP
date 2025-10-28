"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import { profileKeys } from "@/hooks/use-profile";
import { setStoredProfile } from "@/lib/localStorage";
import { toast } from "react-toastify";
import { Edit3, Mail, Phone, MapPin, Globe, Search } from "lucide-react";
import "react-international-phone/style.css";
import { PhoneInput } from "react-international-phone";

const profileSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  profile: any;
  user: any;
}

interface AddressSuggestion {
  place_id: string;
  display_name: string;
  address: {
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export function ProfileSettings({ profile, user }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [phoneValue, setPhoneValue] = useState<string | undefined>(
    profile?.phone || ""
  );
  const { updateProfile } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      company_name: profile?.company_name || "",
      contact_name: profile?.contact_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip_code: profile?.zip_code || "",
      country: profile?.country || "",
      website: profile?.website || "",
      description: profile?.description || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        company_name: profile.company_name || "",
        contact_name: profile.contact_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        country: profile.country || "",
        website: profile.website || "",
        description: profile.description || "",
      });
      setPhoneValue(profile.phone || "");
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await updateProfile(data);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully!");
        setIsEditing(false);

        // Force refetch the profile data to update all components
        if (user?.id) {
          await queryClient.invalidateQueries({
            queryKey: profileKeys.user(user.id),
          });

          // Also refetch to ensure we have the latest data
          await queryClient.refetchQueries({
            queryKey: profileKeys.user(user.id),
          });
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setPhoneValue(profile?.phone || "");
  };

  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingAddress(true);
    try {
      // Try Photon API first (faster and more accurate)
      const photonResponse = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
      );

      if (photonResponse.ok) {
        const photonData = await photonResponse.json();

        // Transform Photon data to Nominatim format for consistency
        const transformedData = photonData.features.map((feature: any) => ({
          place_id: feature.properties.osm_id || Math.random().toString(),
          display_name: [
            feature.properties.name,
            feature.properties.street,
            feature.properties.housenumber,
            feature.properties.city,
            feature.properties.state,
            feature.properties.postcode,
            feature.properties.country,
          ]
            .filter(Boolean)
            .join(", "),
          address: {
            city: feature.properties.city || feature.properties.county || "",
            state: feature.properties.state || "",
            postcode: feature.properties.postcode || "",
            country: feature.properties.country || "",
          },
        }));

        setAddressSuggestions(transformedData);
        setShowSuggestions(true);
      } else {
        // Fallback to Nominatim if Photon fails
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          setAddressSuggestions(data);
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      // Try Nominatim as final fallback
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          setAddressSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const address = suggestion.display_name;
    const addressParts = suggestion.address;

    form.setValue("address", address);
    form.setValue("city", addressParts.city || "");
    form.setValue("state", addressParts.state || "");
    form.setValue("zip_code", addressParts.postcode || "");
    form.setValue("country", addressParts.country || "");

    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Debounce timer for address search
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (value: string) => {
    form.setValue("address", value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to debounce API calls
    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300); // Wait 300ms after user stops typing
  };

  const handlePhoneChange = (value: string | undefined) => {
    setPhoneValue(value);
    form.setValue("phone", value || "");
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Profile Information
            </CardTitle>
            <p className="text-gray-600 mt-1">
              Manage your personal and business details
            </p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            size="sm"
            disabled={isEditing}
            className={
              isEditing
                ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                : "bg-teal-500 hover:bg-teal-600 text-white"
            }
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter company name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter contact name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    value={user?.email || profile?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone
                    </FormLabel>
                    <FormControl>
                      {isEditing ? (
                        <PhoneInput
                          defaultCountry="us"
                          value={phoneValue}
                          onChange={handlePhoneChange}
                          inputClassName="flex-1 border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          countrySelectorStyleProps={{
                            buttonClassName:
                              "border-0 bg-transparent px-3 py-2 hover:bg-accent rounded-md transition-colors focus:outline-none",
                            dropdownStyleProps: {
                              className:
                                "border border-input bg-background text-foreground rounded-md shadow-md mt-1",
                            },
                          }}
                        />
                      ) : (
                        <Input
                          value={phoneValue || ""}
                          disabled={true}
                          placeholder="Enter phone number"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Start typing an address..."
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          if (isEditing) {
                            handleAddressChange(e.target.value);
                          }
                        }}
                        onFocus={() => {
                          if (
                            isEditing &&
                            field.value &&
                            field.value.length >= 3
                          ) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                      />
                      {isLoadingAddress && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}

                      {showSuggestions &&
                        addressSuggestions.length > 0 &&
                        isEditing && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {addressSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.place_id}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleAddressSelect(suggestion)}
                              >
                                <div className="flex items-start">
                                  <Search className="w-4 h-4 mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                                  <div className="text-sm text-gray-900">
                                    {suggestion.display_name}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter city"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter state"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter ZIP code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="Enter country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Globe className="w-4 h-4 inline mr-2" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="https://example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={!isEditing}
                      placeholder="Describe your business..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

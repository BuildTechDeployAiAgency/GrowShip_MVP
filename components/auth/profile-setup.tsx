"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";
import { UserProfile, UserRole } from "@/types/auth";
import { Phone, MapPin, Search } from "lucide-react";
import "react-international-phone/style.css";
import { PhoneInput } from "react-international-phone";

interface ProfileSetupProps {
  role: UserRole;
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

export function ProfileSetup({ role }: ProfileSetupProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    website: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [phoneValue, setPhoneValue] = useState<string | undefined>("");
  const { updateProfile } = useEnhancedAuth();
  const router = useRouter();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setPhoneValue(value);
    setFormData((prev) => ({
      ...prev,
      phone: value || "",
    }));
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

    setFormData((prev) => ({
      ...prev,
      address: address,
      city: addressParts.city || "",
      state: addressParts.state || "",
      zip_code: addressParts.postcode || "",
      country: addressParts.country || "",
    }));

    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Debounce timer for address search
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: value,
    }));

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to debounce API calls
    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300); // Wait 300ms after user stops typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await updateProfile({
        role_name: (role + "_admin") as UserProfile["role_name"],
        role_type: role as UserProfile["role_type"],
        ...formData,
        is_profile_complete: true,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile setup completed successfully!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case "brand":
        return "Brand Owner";
      case "distributor":
        return "Distributor";
      case "manufacturer":
        return "Manufacturer";
      default:
        return "User";
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case "brand":
        return "Complete your brand profile to start managing your distribution network";
      case "distributor":
        return "Set up your distributor profile to access inventory and order management";
      case "manufacturer":
        return "Configure your manufacturer profile to manage production and supply chain";
      default:
        return "Complete your profile setup";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Complete Your {getRoleTitle()} Profile
          </h1>
          <p className="text-lg text-gray-600">{getRoleDescription()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="company_name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Company Name *
                  </label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your company name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact_name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contact Name *
                  </label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
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
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <div className="relative">
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }));
                      handleAddressChange(e.target.value);
                    }}
                    placeholder="Start typing an address..."
                    onFocus={() => {
                      if (formData.address && formData.address.length >= 3) {
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

                  {showSuggestions && addressSuggestions.length > 0 && (
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    City
                  </label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    State/Province
                  </label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label
                    htmlFor="zip_code"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    ZIP/Postal Code
                  </label>
                  <Input
                    id="zip_code"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    placeholder="ZIP Code"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Country
                </label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Enter your country"
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Website
                </label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://your-website.com"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about your business..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

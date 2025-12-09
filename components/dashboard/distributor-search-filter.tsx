"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import { useDistributors } from "@/hooks/use-distributors";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

interface DistributorSearchFilterProps {
  selectedDistributorId?: string | null;
  onDistributorSelect: (distributorId: string | null) => void;
}

export function DistributorSearchFilter({
  selectedDistributorId,
  onDistributorSelect,
}: DistributorSearchFilterProps) {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Only show for brand admins and super admins
  const canFilterByDistributor = 
    profile?.role_name === "super_admin" || 
    profile?.role_name?.startsWith("brand_admin");

  const { distributors = [] } = useDistributors({
    searchTerm: "",
    filters: { status: "all" }
  });

  if (!canFilterByDistributor) {
    return null;
  }

  // Filter distributors based on search term
  const filteredDistributors = distributors.filter((distributor) =>
    distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected distributor for display
  const selectedDistributor = selectedDistributorId
    ? distributors.find((d) => d.id === selectedDistributorId)
    : null;

  const displayName = selectedDistributor?.name || "All Distributors";

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 justify-between min-w-[200px]"
          >
            <span className="truncate">{displayName}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-4 w-4 opacity-50" />
            <Input
              placeholder="Search distributors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <DropdownMenuItem
              onClick={() => {
                onDistributorSelect(null);
                setIsOpen(false);
              }}
              className={selectedDistributorId === null ? "bg-accent" : ""}
            >
              <div className="flex flex-col">
                <span className="font-medium">All Distributors</span>
                <span className="text-sm text-muted-foreground">
                  View data for all distributors
                </span>
              </div>
            </DropdownMenuItem>
            {filteredDistributors.map((distributor) => (
              <DropdownMenuItem
                key={distributor.id}
                onClick={() => {
                  onDistributorSelect(distributor.id);
                  setIsOpen(false);
                }}
                className={
                  selectedDistributorId === distributor.id
                    ? "bg-accent"
                    : ""
                }
              >
                <div className="flex flex-col">
                  <span className="font-medium">{distributor.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {distributor.contact_name}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            {filteredDistributors.length === 0 && searchTerm && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No distributors found
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
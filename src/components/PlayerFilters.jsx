import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function PlayerFilters({ filters, setFilters }) {
  const hasActiveFilters = filters.guardFilter.enabled || filters.dateFilter.enabled;

  const clearFilters = () => {
    setFilters({
      guardFilter: { enabled: false, operator: ">", value: 0 },
      dateFilter: { enabled: false, type: "range", startDate: "", endDate: "", specificDate: "" }
    });
  };

  return (
    <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Advanced Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-400 hover:text-red-400 h-7 px-2"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Guards Filter */}
        <div className="space-y-2">
          <label className="text-gray-300 text-xs font-medium">Card Guards</label>
          <div className="flex gap-2">
            <input
              type="checkbox"
              checked={filters.guardFilter.enabled}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  guardFilter: { ...prev.guardFilter, enabled: e.target.checked }
                }))
              }
              className="mt-2"
            />
            <Select
              value={filters.guardFilter.operator}
              onValueChange={(value) =>
                setFilters(prev => ({
                  ...prev,
                  guardFilter: { ...prev.guardFilter, operator: value }
                }))
              }
              disabled={!filters.guardFilter.enabled}
            >
              <SelectTrigger className="w-20 bg-gray-900 border-gray-700 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">">Greater than</SelectItem>
                <SelectItem value="<">Less than</SelectItem>
                <SelectItem value="=">Equal to</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={filters.guardFilter.value}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  guardFilter: { ...prev.guardFilter, value: parseInt(e.target.value) || 0 }
                }))
              }
              disabled={!filters.guardFilter.enabled}
              className="bg-gray-900 border-gray-700 text-white w-20 h-9"
            />
          </div>
        </div>

        {/* Date Joined Filter */}
        <div className="space-y-2">
          <label className="text-gray-300 text-xs font-medium">Date Joined</label>
          <div className="flex gap-2">
            <input
              type="checkbox"
              checked={filters.dateFilter.enabled}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  dateFilter: { ...prev.dateFilter, enabled: e.target.checked }
                }))
              }
              className="mt-2"
            />
            <Select
              value={filters.dateFilter.type}
              onValueChange={(value) =>
                setFilters(prev => ({
                  ...prev,
                  dateFilter: { ...prev.dateFilter, type: value }
                }))
              }
              disabled={!filters.dateFilter.enabled}
            >
              <SelectTrigger className="flex-1 bg-gray-900 border-gray-700 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">Date Range</SelectItem>
                <SelectItem value="before">Before Date</SelectItem>
                <SelectItem value="after">After Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.dateFilter.enabled && (
            <div className="ml-6 space-y-2">
              {filters.dateFilter.type === "range" && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFilter.startDate}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        dateFilter: { ...prev.dateFilter, startDate: e.target.value }
                      }))
                    }
                    placeholder="Start date"
                    className="bg-gray-900 border-gray-700 text-white h-9 text-sm"
                  />
                  <Input
                    type="date"
                    value={filters.dateFilter.endDate}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        dateFilter: { ...prev.dateFilter, endDate: e.target.value }
                      }))
                    }
                    placeholder="End date"
                    className="bg-gray-900 border-gray-700 text-white h-9 text-sm"
                  />
                </div>
              )}
              {(filters.dateFilter.type === "before" || filters.dateFilter.type === "after") && (
                <Input
                  type="date"
                  value={filters.dateFilter.specificDate}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      dateFilter: { ...prev.dateFilter, specificDate: e.target.value }
                    }))
                  }
                  className="bg-gray-900 border-gray-700 text-white h-9 text-sm"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
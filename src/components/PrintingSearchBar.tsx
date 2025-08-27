
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface PrintingSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const PrintingSearchBar: React.FC<PrintingSearchBarProps> = ({
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="mb-6">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by product name, order ID, or phone number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white border-gray-200"
        />
      </div>
    </div>
  );
};

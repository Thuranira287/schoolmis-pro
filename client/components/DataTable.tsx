import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive' | 'outline';
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  onAdd?: () => void;
  phoneNumber?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  pageSize?: number;
  entityType?: string;
  onAddAudit?: () => void;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  actions,
  onAdd,
  emptyMessage = 'No data available',
  emptyAction,
  searchable = true,
  searchFields = [],
  pageSize = 10,
  entityType = 'record',
  onAddAudit,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data
  let filteredData = data;
  if (search && searchFields.length > 0) {
    filteredData = data.filter((row) =>
      searchFields.some((field) =>
        String(row[field])
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }

  // Sort data
  if (sortBy) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc'
        ? (aVal as any) - (bVal as any)
        : (bVal as any) - (aVal as any);
    });
  }

  // Paginate
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIdx, startIdx + pageSize);

  const handleSort = (key: keyof T) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        )}

        {onAdd && (
          <Button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700">
            Add New
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className="font-semibold text-gray-900"
                  style={{ width: col.width }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                    >
                      {col.label}
                      {sortBy === col.key && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {actions && actions.length > 0 && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions?.length ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className="text-sm text-gray-700">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key])}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={() => action.onClick(row)}
                              className="cursor-pointer"
                            >
                              {action.icon && (
                                <span className="mr-2">{action.icon}</span>
                              )}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({filteredData.length} records)
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

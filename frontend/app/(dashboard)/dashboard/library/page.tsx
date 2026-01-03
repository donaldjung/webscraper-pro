"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  FileText,
  ExternalLink,
  MoreVertical,
  Download,
  Trash2,
  FolderPlus,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContentViewer } from "@/components/content-viewer";

interface Page {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  word_count: number;
  depth: number;
  scraped_at: string;
  updated_at: string;
}

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project");
  
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("scraped_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["pages", projectFilter, search, sortBy, sortOrder, currentPage],
    queryFn: () =>
      api.getPages({
        project_id: projectFilter || undefined,
        search: search || undefined,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      }) as Promise<{
        pages: Page[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      }>,
  });

  const { data: pageDetail } = useQuery({
    queryKey: ["page", selectedPage],
    queryFn: () => api.getPage(selectedPage!) as Promise<{
      id: string;
      url: string;
      title: string | null;
      content_markdown: string | null;
      content_html: string | null;
      word_count: number;
      scraped_at: string;
    }>,
    enabled: !!selectedPage,
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Library</h1>
            <p className="text-muted-foreground mt-1">
              {data?.total || 0} pages scraped
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scraped_at">Date Scraped</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="word_count">Word Count</SelectItem>
              <SelectItem value="depth">Depth</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Grid/List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-2"
            }>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.pages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No pages found</h3>
              <p className="text-muted-foreground text-center">
                {search
                  ? "Try adjusting your search terms"
                  : "Start scraping to see pages here"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {data?.pages?.map((page: Page) => (
                <motion.div
                  key={page.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`glass-card cursor-pointer transition-all duration-200 ${
                      selectedPage === page.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedPage(page.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium line-clamp-2">
                          {page.title || "Untitled"}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open URL
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FolderPlus className="mr-2 h-4 w-4" />
                              Add to Collection
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {page.meta_description || truncate(page.url, 60)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {page.word_count} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(page.scraped_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="space-y-2">
              {data?.pages?.map((page: Page) => (
                <Card 
                  key={page.id}
                  className={`glass-card cursor-pointer transition-all duration-200 ${
                    selectedPage === page.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedPage(page.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {page.title || "Untitled"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {page.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="secondary">{page.word_count} words</Badge>
                      <span>{formatRelativeTime(page.scraped_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === data.total_pages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Content Viewer Sidebar */}
      {selectedPage && pageDetail && (
        <ContentViewer
          page={pageDetail}
          onClose={() => setSelectedPage(null)}
        />
      )}
    </div>
  );
}


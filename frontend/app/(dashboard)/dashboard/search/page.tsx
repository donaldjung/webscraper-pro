"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search as SearchIcon, 
  Sparkles, 
  FileText, 
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  page_id: string;
  url: string;
  title: string | null;
  project_name: string;
  snippet: string;
  score: number;
  scraped_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("hybrid");
  const [isSearching, setIsSearching] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["search", query, searchType],
    queryFn: () =>
      api.search({
        query,
        search_type: searchType,
        limit: 20,
      }) as Promise<{
        results: SearchResult[];
        total: number;
        took_ms: number;
      }>,
    enabled: false,
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    await refetch();
    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          <span className="text-gradient">AI-Powered</span> Search
        </h1>
        <p className="text-muted-foreground text-lg">
          Find content by meaning, not just keywords
        </p>
      </div>

      {/* Search Input */}
      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search your scraped content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-14 pl-12 pr-32 text-lg rounded-xl"
          />
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Search Type Tabs */}
        <div className="flex items-center justify-center">
          <Tabs value={searchType} onValueChange={setSearchType}>
            <TabsList>
              <TabsTrigger value="hybrid">
                <Sparkles className="mr-2 h-4 w-4" />
                Hybrid
              </TabsTrigger>
              <TabsTrigger value="semantic">
                AI Semantic
              </TabsTrigger>
              <TabsTrigger value="fulltext">
                Full Text
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isLoading || isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Searching...</p>
          </motion.div>
        ) : data?.results ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data.total} results found
              </span>
              <span>
                {data.took_ms.toFixed(0)}ms
              </span>
            </div>

            {/* Results List */}
            {data.results.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground text-center">
                    Try different keywords or search type
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {data.results.map((result, index) => (
                    <motion.div
                      key={result.page_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass-card hover:border-primary/50 transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg line-clamp-1">
                                {result.title || "Untitled"}
                              </h3>
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                {result.url}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <Badge variant="secondary" className="shrink-0 ml-4">
                              {(result.score * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                            {result.snippet}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {result.project_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(result.scraped_at)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="p-6 rounded-full bg-primary/10 mb-6">
              <SearchIcon className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start Searching</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter your query above to search across all your scraped content
              using AI-powered semantic search.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


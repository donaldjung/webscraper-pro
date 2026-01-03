"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Plus, 
  FolderOpen, 
  MoreVertical, 
  Trash2, 
  Share2,
  Link2,
  Loader2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_public: boolean;
  share_token: string | null;
  page_count: number;
  created_at: string;
  updated_at: string;
}

const colorOptions = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.getCollections() as Promise<{
      collections: Collection[];
      total: number;
    }>,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      api.createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setIsCreateOpen(false);
      setNewCollection({ name: "", description: "", color: "#6366f1" });
      toast.success("Collection created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCopyLink = async () => {
    if (selectedCollection?.share_token) {
      const shareUrl = `${window.location.origin}/shared/${selectedCollection.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Organize your scraped content
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Collections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.collections?.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create collections to organize your scraped content
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {data?.collections?.map((collection: Collection) => (
            <motion.div
              key={collection.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="glass-card hover:border-primary/50 transition-all duration-300 group cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: collection.color + "20" }}
                    >
                      <FolderOpen
                        className="h-5 w-5"
                        style={{ color: collection.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      {collection.is_public && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCollection(collection);
                          setIsShareOpen(true);
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(collection.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {collection.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {collection.page_count} pages
                    </span>
                    <span>{formatRelativeTime(collection.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Organize your scraped pages into collections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Collection"
                value={newCollection.name}
                onChange={(e) =>
                  setNewCollection({ ...newCollection, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What's this collection for?"
                value={newCollection.description}
                onChange={(e) =>
                  setNewCollection({ ...newCollection, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCollection({ ...newCollection, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newCollection.color === color
                        ? "ring-2 ring-offset-2 ring-offset-background ring-white"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newCollection)}
              disabled={!newCollection.name || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Collection</DialogTitle>
            <DialogDescription>
              Share this collection with others via a public link
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedCollection?.is_public && selectedCollection?.share_token ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/shared/${selectedCollection.share_token}`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can view this collection
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Make this collection public to get a shareable link
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


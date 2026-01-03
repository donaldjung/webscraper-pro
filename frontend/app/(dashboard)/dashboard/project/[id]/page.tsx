"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  Play, 
  Pause,
  Trash2, 
  ExternalLink,
  FileText,
  Clock,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { ContentViewer } from "@/components/content-viewer";

interface Project {
  id: string;
  name: string;
  description: string | null;
  base_url: string;
  auth_method: string;
  scrape_config: {
    max_depth?: number;
    max_pages?: number;
    rate_limit?: number;
  };
  page_count: number;
  last_scraped: string | null;
  created_at: string;
  updated_at: string;
}

interface ScrapeJob {
  id: string;
  project_id: string;
  status: string;
  pages_discovered: number;
  pages_scraped: number;
  pages_failed: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface Page {
  id: string;
  url: string;
  title: string | null;
  word_count: number;
  depth: number;
  scraped_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId) as Promise<Project>,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["project-jobs", projectId],
    queryFn: () => api.getProjectJobs(projectId) as Promise<ScrapeJob[]>,
  });

  const { data: pagesData } = useQuery({
    queryKey: ["project-pages", projectId],
    queryFn: () => api.getPages({ project_id: projectId, per_page: 10 }) as Promise<{
      pages: Page[];
      total: number;
    }>,
  });

  const { data: pageDetail } = useQuery({
    queryKey: ["page", selectedPageId],
    queryFn: () => api.getPage(selectedPageId!) as Promise<{
      id: string;
      url: string;
      title: string | null;
      content_markdown: string | null;
      content_html: string | null;
      word_count: number;
      scraped_at: string;
    }>,
    enabled: !!selectedPageId,
  });

  const startScrapeMutation = useMutation({
    mutationFn: () => api.startScrape(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-jobs", projectId] });
      toast.success("Scrape started!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProject(projectId),
    onSuccess: () => {
      toast.success("Project deleted");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "running":
        return <Badge className="bg-blue-500/20 text-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-4">This project may have been deleted.</p>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const latestJob = jobs?.[0];
  const isRunning = latestJob?.status === "running" || latestJob?.status === "pending";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <a 
              href={project.base_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {project.base_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => startScrapeMutation.mutate()}
            disabled={isRunning || startScrapeMutation.isPending}
            className="gap-2"
          >
            {startScrapeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "Scraping..." : "Start Scrape"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold">{project.page_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Depth</p>
                <p className="text-2xl font-bold">{project.scrape_config?.max_depth || 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Settings className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Pages</p>
                <p className="text-2xl font-bold">{project.scrape_config?.max_pages || 100}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Scraped</p>
                <p className="text-lg font-bold">
                  {project.last_scraped ? formatRelativeTime(project.last_scraped) : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scrape Jobs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Scrape History</CardTitle>
            <CardDescription>Recent scrape jobs for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : jobs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No scrape jobs yet</p>
                <Button 
                  variant="link" 
                  onClick={() => startScrapeMutation.mutate()}
                  disabled={startScrapeMutation.isPending}
                >
                  Start your first scrape
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {jobs?.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getStatusBadge(job.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(job.created_at)}
                        </span>
                      </div>
                      {(job.status === "running" || job.status === "pending") && (
                        <Progress 
                          value={job.pages_scraped / (job.pages_discovered || 1) * 100} 
                          className="h-1 mb-2" 
                        />
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{job.pages_discovered} discovered</span>
                        <span>{job.pages_scraped} scraped</span>
                        {job.pages_failed > 0 && (
                          <span className="text-red-500">{job.pages_failed} failed</span>
                        )}
                      </div>
                      {job.error_message && (
                        <p className="text-xs text-red-500 mt-2">{job.error_message}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Pages */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Pages</CardTitle>
              <CardDescription>Latest scraped content</CardDescription>
            </div>
            {pagesData && pagesData.total > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/library?project=${projectId}`}>
                  View All
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {pagesData?.pages?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pages scraped yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {pagesData?.pages?.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => setSelectedPageId(page.id)}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedPageId === page.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 bg-background/50 hover:border-primary/50"
                      }`}
                    >
                      <h4 className="font-medium truncate">{page.title || "Untitled"}</h4>
                      <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{page.word_count} words</span>
                        <span>Depth {page.depth}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? All scraped content
              will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Viewer Dialog */}
      {selectedPageId && pageDetail && (
        <Dialog open={!!selectedPageId} onOpenChange={() => setSelectedPageId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{pageDetail.title || "Untitled"}</DialogTitle>
              <DialogDescription>
                <a 
                  href={pageDetail.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-1"
                >
                  {pageDetail.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4">
              <div className="prose prose-invert prose-sm max-w-none p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-lg overflow-auto">
                  {pageDetail.content_markdown || "No content available"}
                </pre>
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <span>{pageDetail.word_count} words</span>
              <span>Scraped {new Date(pageDetail.scraped_at).toLocaleDateString()}</span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


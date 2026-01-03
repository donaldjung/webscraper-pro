"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Download, 
  FileText, 
  FileJson, 
  BookOpen, 
  Code2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageIds?: string[];
  projectIds?: string[];
  collectionIds?: string[];
}

const formatOptions = [
  { value: "markdown", label: "Markdown", icon: FileText, description: "Clean markdown files" },
  { value: "pdf", label: "PDF", icon: BookOpen, description: "Portable document format" },
  { value: "epub", label: "EPUB", icon: BookOpen, description: "E-book format" },
  { value: "json", label: "JSON", icon: FileJson, description: "Structured data" },
  { value: "html", label: "HTML", icon: Code2, description: "Web pages" },
  { value: "obsidian", label: "Obsidian", icon: FileText, description: "Obsidian vault format" },
  { value: "llm", label: "LLM Context", icon: Sparkles, description: "Optimized for AI" },
];

export function ExportDialog({
  open,
  onOpenChange,
  pageIds,
  projectIds,
  collectionIds,
}: ExportDialogProps) {
  const [format, setFormat] = useState("markdown");
  const [combineFiles, setCombineFiles] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const exportMutation = useMutation({
    mutationFn: () =>
      api.exportContent({
        format,
        page_ids: pageIds,
        project_ids: projectIds,
        collection_ids: collectionIds,
        include_metadata: includeMetadata,
        combine_into_single: combineFiles,
      }) as Promise<{ download_url: string; filename: string }>,
    onSuccess: (data) => {
      // Trigger download
      window.open(data.download_url, "_blank");
      toast.success(`Exported as ${data.filename}`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectedFormat = formatOptions.find((f) => f.value === format);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Content</DialogTitle>
          <DialogDescription>
            Choose a format to export your scraped content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFormat && (
              <p className="text-xs text-muted-foreground">
                {selectedFormat.description}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="combine">Combine into single file</Label>
                <p className="text-xs text-muted-foreground">
                  Merge all pages into one file
                </p>
              </div>
              <Switch
                id="combine"
                checked={combineFiles}
                onCheckedChange={setCombineFiles}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="metadata">Include metadata</Label>
                <p className="text-xs text-muted-foreground">
                  Add URLs, dates, and other info
                </p>
              </div>
              <Switch
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={setIncludeMetadata}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


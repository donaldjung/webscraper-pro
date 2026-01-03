"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { 
  X, 
  ExternalLink, 
  Copy, 
  Download, 
  Code2, 
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ContentViewerProps {
  page: {
    id: string;
    url: string;
    title: string | null;
    content_markdown: string | null;
    content_html: string | null;
    word_count: number;
    scraped_at: string;
  };
  onClose: () => void;
}

export function ContentViewer({ page, onClose }: ContentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(page.content_markdown || "");
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-[500px] shrink-0 border-l border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="font-semibold truncate">{page.title || "Untitled"}</h3>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
            >
              {page.url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="preview" className="gap-2">
              <FileText className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="markdown" className="gap-2">
              <Code2 className="h-4 w-4" />
              Markdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{page.content_markdown || ""}</ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="markdown" className="flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                {page.content_markdown || ""}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Stats */}
        <div className="p-4 border-t border-border/50 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{page.word_count} words</span>
            <span>
              Scraped {new Date(page.scraped_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


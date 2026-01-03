"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  Globe, 
  Search, 
  Library, 
  FolderOpen, 
  Plus,
  Settings,
  FileText,
  Download,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 px-4 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-b"
          />
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/scrape"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                <span>New Scrape</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/search"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Search className="h-4 w-4" />
                <span>Search Content</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Globe className="h-4 w-4" />
                <span>Projects</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/library"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Library className="h-4 w-4" />
                <span>Library</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/collections"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Collections</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Tools">
              <Command.Item
                onSelect={() => runCommand(() => console.log("Export"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                <span>Export Content</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => console.log("Documentation"))}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
                <span>Documentation</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}


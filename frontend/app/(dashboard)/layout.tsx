"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Globe, 
  Search, 
  Library, 
  FolderOpen, 
  Settings, 
  LogOut,
  Plus,
  Code2,
  Command,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/command-palette";

const navItems = [
  { href: "/dashboard", icon: Globe, label: "Projects" },
  { href: "/dashboard/library", icon: Library, label: "Library" },
  { href: "/dashboard/search", icon: Search, label: "Search" },
  { href: "/dashboard/collections", icon: FolderOpen, label: "Collections" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, loadUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        router.push("/login");
        return;
      }
      
      // Set the token on the API client
      api.setToken(token);
      
      // Load user data
      try {
        await loadUser();
      } catch (error) {
        // Token might be invalid, redirect to login
        router.push("/login");
        return;
      }
      
      setIsLoading(false);
    };
    
    init();
  }, [token, loadUser, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">WebScraper Pro</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <Link href="/dashboard/scrape">
              <Button className="w-full justify-start gap-2 mb-4 glow-sm">
                <Plus className="h-4 w-4" />
                New Scrape
              </Button>
            </Link>

            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Keyboard shortcut hint */}
          <div className="border-t border-border/50 p-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>Press</span>
              <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
              <span>for commands</span>
            </div>
          </div>

          {/* User menu */}
          <div className="border-t border-border/50 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-auto py-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.name?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {user?.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="min-h-screen p-8">
          {children}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}


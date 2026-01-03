"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ArrowRight, 
  ArrowLeft,
  Settings2,
  Key,
  Zap,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useScrapeStore } from "@/stores/scrape";

const steps = [
  { id: "url", title: "Website URL", icon: Globe },
  { id: "config", title: "Configuration", icon: Settings2 },
  { id: "auth", title: "Authentication", icon: Key },
  { id: "start", title: "Start Scraping", icon: Zap },
];

export default function ScrapePage() {
  const router = useRouter();
  const { startTracking, getProgress } = useScrapeStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    base_url: "",
    max_depth: "3",
    max_pages: "100",
    rate_limit: "1.0",
    auth_method: "none",
    browser: "chrome",
    username: "",
    password: "",
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const progress = jobId ? getProgress(jobId) : null;

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const project = await api.createProject({
        name: formData.name || new URL(formData.base_url).hostname,
        base_url: formData.base_url,
        auth_method: formData.auth_method,
        scrape_config: {
          max_depth: parseInt(formData.max_depth),
          max_pages: parseInt(formData.max_pages),
          rate_limit: parseFloat(formData.rate_limit),
        },
      });
      return project as { id: string };
    },
    onSuccess: (data) => {
      setProjectId(data.id);
      setCurrentStep(3);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startScrapeMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const job = await api.startScrape(projectId) as { id: string };
      return job;
    },
    onSuccess: (data) => {
      setJobId(data.id);
      // Start tracking via WebSocket
      const wsUrl = api.getWebSocketUrl(data.id);
      startTracking(data.id, wsUrl);
      toast.success("Scraping started!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleNext = () => {
    if (currentStep === 2) {
      createProjectMutation.mutate();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStartScrape = () => {
    if (projectId) {
      startScrapeMutation.mutate(projectId);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        try {
          new URL(formData.base_url);
          return true;
        } catch {
          return false;
        }
      case 1:
        return true;
      case 2:
        if (formData.auth_method === "credentials") {
          return formData.username && formData.password;
        }
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">New Scrape</h1>
        <p className="text-muted-foreground mt-1">
          Configure and start a new web scraping job
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                index < currentStep
                  ? "bg-primary border-primary text-primary-foreground"
                  : index === currentStep
                  ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-20 h-0.5 mx-2 transition-all duration-300 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Enter Website URL</CardTitle>
                <CardDescription>
                  The URL of the website you want to scrape
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    placeholder="https://docs.example.com"
                    value={formData.base_url}
                    onChange={(e) =>
                      setFormData({ ...formData, base_url: e.target.value })
                    }
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Auto-generated from URL"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Scraping Configuration</CardTitle>
                <CardDescription>
                  Customize how the website will be scraped
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depth">Max Depth</Label>
                    <Select
                      value={formData.max_depth}
                      onValueChange={(value) =>
                        setFormData({ ...formData, max_depth: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 10].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} levels deep
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How many link levels to follow
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pages">Max Pages</Label>
                    <Select
                      value={formData.max_pages}
                      onValueChange={(value) =>
                        setFormData({ ...formData, max_pages: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[50, 100, 250, 500, 1000].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} pages
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Maximum pages to scrape
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate Limit</Label>
                  <Select
                    value={formData.rate_limit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rate_limit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">Fast (0.5s between requests)</SelectItem>
                      <SelectItem value="1.0">Normal (1s between requests)</SelectItem>
                      <SelectItem value="2.0">Slow (2s between requests)</SelectItem>
                      <SelectItem value="5.0">Very Slow (5s between requests)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Delay between page requests to avoid rate limiting
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  Configure if the website requires login
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select
                    value={formData.auth_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, auth_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="browser_cookies">Browser Cookies</SelectItem>
                      <SelectItem value="manual_login">Manual Login</SelectItem>
                      <SelectItem value="credentials">Username/Password</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.auth_method === "browser_cookies" && (
                  <div className="space-y-2">
                    <Label>Browser</Label>
                    <Select
                      value={formData.browser}
                      onValueChange={(value) =>
                        setFormData({ ...formData, browser: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chrome">Chrome</SelectItem>
                        <SelectItem value="firefox">Firefox</SelectItem>
                        <SelectItem value="safari">Safari</SelectItem>
                        <SelectItem value="edge">Edge</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Make sure you&apos;re logged into the website in this browser
                    </p>
                  </div>
                )}

                {formData.auth_method === "manual_login" && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-500">Manual Login Required</p>
                        <p className="text-muted-foreground mt-1">
                          A browser window will open where you can log in manually.
                          The session will be captured automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.auth_method === "credentials" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username / Email</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Credentials are encrypted and stored securely
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Ready to Scrape</CardTitle>
                <CardDescription>
                  Review your configuration and start scraping
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configuration Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">URL</span>
                    <span className="font-mono text-sm">{formData.base_url}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Max Depth</span>
                    <span>{formData.max_depth} levels</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Max Pages</span>
                    <span>{formData.max_pages} pages</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Authentication</span>
                    <Badge variant="secondary">{formData.auth_method}</Badge>
                  </div>
                </div>

                {/* Progress (shown when scraping) */}
                {progress && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Scraping Progress</span>
                      <Badge variant={progress.status === "running" ? "info" : "success"}>
                        {progress.status}
                      </Badge>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {progress.pagesDiscovered}
                        </p>
                        <p className="text-xs text-muted-foreground">Discovered</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {progress.pagesScraped}
                        </p>
                        <p className="text-xs text-muted-foreground">Scraped</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-500">
                          {progress.pagesFailed}
                        </p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    </div>
                    {progress.currentUrl && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {progress.currentUrl}
                      </p>
                    )}
                  </div>
                )}

                {!jobId && (
                  <Button
                    onClick={handleStartScrape}
                    disabled={startScrapeMutation.isPending}
                    className="w-full h-12 text-lg glow"
                  >
                    {startScrapeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Start Scraping
                      </>
                    )}
                  </Button>
                )}

                {progress?.status === "completed" && (
                  <Button
                    onClick={() => router.push(`/dashboard/library?project=${projectId}`)}
                    className="w-full"
                  >
                    View Scraped Content
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : currentStep === 2 ? (
              <>
                Create Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}


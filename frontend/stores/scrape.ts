import { create } from "zustand";

interface ScrapeProgress {
  jobId: string;
  status: string;
  pagesDiscovered: number;
  pagesScraped: number;
  pagesFailed: number;
  currentUrl: string | null;
  progress: number;
}

interface ScrapeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface ScrapeState {
  activeJobs: Map<string, ScrapeProgress>;
  events: Map<string, ScrapeEvent[]>;
  websockets: Map<string, WebSocket>;
  
  startTracking: (jobId: string, wsUrl: string) => void;
  stopTracking: (jobId: string) => void;
  updateProgress: (jobId: string, progress: Partial<ScrapeProgress>) => void;
  addEvent: (jobId: string, event: ScrapeEvent) => void;
  getProgress: (jobId: string) => ScrapeProgress | undefined;
  getEvents: (jobId: string) => ScrapeEvent[];
}

export const useScrapeStore = create<ScrapeState>((set, get) => ({
  activeJobs: new Map(),
  events: new Map(),
  websockets: new Map(),

  startTracking: (jobId, wsUrl) => {
    const { websockets, activeJobs, events } = get();
    
    // Close existing WebSocket if any
    if (websockets.has(jobId)) {
      websockets.get(jobId)?.close();
    }

    // Initialize progress
    activeJobs.set(jobId, {
      jobId,
      status: "connecting",
      pagesDiscovered: 0,
      pagesScraped: 0,
      pagesFailed: 0,
      currentUrl: null,
      progress: 0,
    });
    
    events.set(jobId, []);

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set((state) => {
        const jobs = new Map(state.activeJobs);
        const job = jobs.get(jobId);
        if (job) {
          job.status = "connected";
          jobs.set(jobId, job);
        }
        return { activeJobs: jobs };
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        get().addEvent(jobId, data);
        
        set((state) => {
          const jobs = new Map(state.activeJobs);
          const job = jobs.get(jobId);
          
          if (job) {
            if (data.type === "status_changed") {
              job.status = data.data.status;
            } else if (data.type === "page_discovered") {
              job.pagesDiscovered++;
              job.currentUrl = data.data.url;
            } else if (data.type === "page_scraped") {
              job.pagesScraped++;
              job.currentUrl = data.data.url;
              if (job.pagesDiscovered > 0) {
                job.progress = (job.pagesScraped / job.pagesDiscovered) * 100;
              }
            } else if (data.type === "page_failed") {
              job.pagesFailed++;
            } else if (data.type === "error") {
              job.status = "error";
            }
            
            jobs.set(jobId, { ...job });
          }
          
          return { activeJobs: jobs };
        });
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onerror = () => {
      set((state) => {
        const jobs = new Map(state.activeJobs);
        const job = jobs.get(jobId);
        if (job) {
          job.status = "error";
          jobs.set(jobId, job);
        }
        return { activeJobs: jobs };
      });
    };

    ws.onclose = () => {
      set((state) => {
        const sockets = new Map(state.websockets);
        sockets.delete(jobId);
        return { websockets: sockets };
      });
    };

    // Store WebSocket
    websockets.set(jobId, ws);
    set({ websockets: new Map(websockets), activeJobs: new Map(activeJobs), events: new Map(events) });

    // Send ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  },

  stopTracking: (jobId) => {
    const { websockets, activeJobs, events } = get();
    
    websockets.get(jobId)?.close();
    websockets.delete(jobId);
    activeJobs.delete(jobId);
    events.delete(jobId);
    
    set({
      websockets: new Map(websockets),
      activeJobs: new Map(activeJobs),
      events: new Map(events),
    });
  },

  updateProgress: (jobId, progress) => {
    set((state) => {
      const jobs = new Map(state.activeJobs);
      const job = jobs.get(jobId);
      if (job) {
        jobs.set(jobId, { ...job, ...progress });
      }
      return { activeJobs: jobs };
    });
  },

  addEvent: (jobId, event) => {
    set((state) => {
      const allEvents = new Map(state.events);
      const jobEvents = allEvents.get(jobId) || [];
      jobEvents.push(event);
      allEvents.set(jobId, jobEvents.slice(-100)); // Keep last 100 events
      return { events: allEvents };
    });
  },

  getProgress: (jobId) => get().activeJobs.get(jobId),
  
  getEvents: (jobId) => get().events.get(jobId) || [],
}));


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const authToken = token || this.token;
    if (authToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    return response.json();
  }

  async register(email: string, password: string, name?: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getMe() {
    return this.request("/api/auth/me");
  }

  // Projects
  async getProjects(skip = 0, limit = 20) {
    return this.request(`/api/projects?skip=${skip}&limit=${limit}`);
  }

  async getProject(id: string) {
    return this.request(`/api/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    base_url: string;
    auth_method?: string;
    scrape_config?: object;
  }) {
    return this.request("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: object) {
    return this.request(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/api/projects/${id}`, {
      method: "DELETE",
    });
  }

  // Scraping
  async startScrape(projectId: string) {
    return this.request("/api/scrape/start", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId }),
    });
  }

  async getScrapeJob(jobId: string) {
    return this.request(`/api/scrape/jobs/${jobId}`);
  }

  async cancelScrape(jobId: string) {
    return this.request(`/api/scrape/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  }

  async getProjectJobs(projectId: string) {
    return this.request(`/api/scrape/project/${projectId}/jobs`);
  }

  // Content
  async getPages(params: {
    project_id?: string;
    search?: string;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return this.request(`/api/content?${searchParams}`);
  }

  async getPage(id: string) {
    return this.request(`/api/content/${id}`);
  }

  async deletePage(id: string) {
    return this.request(`/api/content/${id}`, {
      method: "DELETE",
    });
  }

  async getPageVersions(pageId: string) {
    return this.request(`/api/content/${pageId}/versions`);
  }

  // Search
  async search(query: {
    query: string;
    project_ids?: string[];
    search_type?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.request("/api/search", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  async getSuggestions(q: string) {
    return this.request(`/api/search/suggest?q=${encodeURIComponent(q)}`);
  }

  // Collections
  async getCollections() {
    return this.request("/api/collections");
  }

  async createCollection(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    return this.request("/api/collections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteCollection(id: string) {
    return this.request(`/api/collections/${id}`, {
      method: "DELETE",
    });
  }

  async addPageToCollection(collectionId: string, pageId: string) {
    return this.request(`/api/collections/${collectionId}/pages/${pageId}`, {
      method: "POST",
    });
  }

  async removePageFromCollection(collectionId: string, pageId: string) {
    return this.request(`/api/collections/${collectionId}/pages/${pageId}`, {
      method: "DELETE",
    });
  }

  // Tags
  async getTags() {
    return this.request("/api/collections/tags");
  }

  async createTag(data: { name: string; color?: string }) {
    return this.request("/api/collections/tags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Export
  async exportContent(data: {
    format: string;
    page_ids?: string[];
    project_ids?: string[];
    collection_ids?: string[];
    include_metadata?: boolean;
    combine_into_single?: boolean;
  }) {
    return this.request("/api/export", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // WebSocket URL
  getWebSocketUrl(jobId: string): string {
    const wsUrl = this.baseUrl.replace("http", "ws");
    return `${wsUrl}/api/scrape/ws/${jobId}`;
  }
}

export const api = new ApiClient(API_URL);


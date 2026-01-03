# WebScraper Pro

A powerful web scraping platform with a beautiful Next.js frontend and FastAPI backend.

![WebScraper Pro](https://img.shields.io/badge/WebScraper-Pro-blue)

## Features

- 🌐 **Multi-site scraping** - Scrape multiple websites with configurable depth and page limits
- 🔐 **Authentication support** - Browser cookies, manual login, or credentials
- 📚 **Content library** - Browse, search, and organize scraped content
- 📁 **Collections** - Group pages into custom collections
- 🔍 **Full-text search** - Search across all scraped content
- 📤 **Export** - Export to Markdown, JSON, PDF, and more
- ⚡ **Real-time progress** - WebSocket-based live updates during scraping
- 🎨 **Beautiful UI** - Dark theme with smooth animations

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- TanStack Query
- Zustand

**Backend:**
- FastAPI (Python)
- SQLAlchemy (async)
- SQLite (local) / PostgreSQL (production)
- WebSockets
- BeautifulSoup4

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "SECRET_KEY=$(openssl rand -hex 32)" > .env
echo "DATABASE_URL=sqlite+aiosqlite:///./webscraper.db" >> .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./webscraper.db` |
| `SECRET_KEY` | JWT secret key | (required) |
| `OPENAI_API_KEY` | OpenAI API key for AI features | (optional) |
| `REDIS_URL` | Redis URL for caching | (optional) |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Deployment

### Vercel (Frontend)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set the root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
5. Deploy!

### Backend (Railway/Render/Fly.io)

1. Deploy the `backend` folder
2. Set environment variables
3. Use PostgreSQL for production:
   ```
   DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
   ```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT License - feel free to use this for your own projects!

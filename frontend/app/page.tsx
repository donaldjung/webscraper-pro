"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Globe, 
  Search, 
  Zap, 
  Download, 
  Shield, 
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "Intelligent Scraping",
    description: "Recursively crawl websites with smart content detection and real-time progress tracking.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Search,
    title: "AI-Powered Search",
    description: "Semantic search using vector embeddings finds content by meaning, not just keywords.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Watch your scraping progress live with WebSocket-powered visual feedback.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Download,
    title: "Multi-format Export",
    description: "Export to Markdown, PDF, EPUB, or LLM-optimized format for AI context windows.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Authenticated Scraping",
    description: "Access protected content with browser cookies, manual login, or credentials.",
    color: "from-red-500 to-rose-500",
  },
  {
    icon: Sparkles,
    title: "Smart Organization",
    description: "Auto-organize content with AI-detected topics, tags, and collections.",
    color: "from-indigo-500 to-violet-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo/Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
              <Code2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">WebScraper Pro v1.0</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-gradient">Extract Knowledge</span>
              <br />
              <span className="text-foreground">From Any Website</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Transform web content into structured learning materials. 
              AI-powered extraction, semantic search, and LLM-ready exports.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="glow group px-8">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="glass px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Floating Elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute inset-0 -z-10 pointer-events-none"
          >
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete toolkit for extracting, organizing, and utilizing web content.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group relative p-6 rounded-2xl glass-card hover:border-primary/50 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to transform any website into structured content.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Globe,
                title: "Enter URL",
                description: "Paste your target website URL and configure scraping options.",
              },
              {
                step: "02", 
                icon: Layers,
                title: "Extract Content",
                description: "Our AI extracts and organizes content with smart detection.",
              },
              {
                step: "03",
                icon: BookOpen,
                title: "Use Anywhere",
                description: "Search, export, or feed directly into your LLM workflow.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className="text-8xl font-bold text-primary/10 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative glass-card p-6 rounded-2xl">
                  <item.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-90" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative px-8 py-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Extract Knowledge?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Start scraping websites and building your knowledge base today.
              </p>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="px-8">
                  Launch Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">WebScraper Pro</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Built for knowledge extraction and learning enhancement.
          </p>
        </div>
      </footer>
    </div>
  );
}


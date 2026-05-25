"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, FileText, Play, Info, Check, Copy } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface LessonDetail {
  lesson_id: number;
  module_id: number;
  module_title: string;
  title: string;
  content: string;
  github_url: string | null;
  video_url: string | null;
  image_url: string | null;
  prev_lesson_id: number | null;
  next_lesson_id: number | null;
  exam_id: number | null;
}

export default function LessonPlayerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      setLoading(true);
      fetch(`/api/lessons/${id}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 403) throw new Error("Premium access required");
            if (res.status === 404) throw new Error("Lesson not found");
            throw new Error("Failed to load lesson");
          }
          return res.json();
        })
        .then((data) => {
          setLesson(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [session, id]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-primary font-mono animate-pulse">Loading Lesson...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="card border-error/20 bg-error/5 py-12">
          <Info size={48} className="mx-auto mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => router.push("/resources")}
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = lesson.video_url ? getYouTubeID(lesson.video_url) : null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    const btn = document.getElementById(id);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = 'Copied!';
      setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Link 
          href={`/modules/${lesson.module_id}`}
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-mono text-sm"
        >
          <ChevronLeft size={16} /> BACK TO {lesson.module_title.toUpperCase()}
        </Link>
        
        <div className="flex items-center gap-2">
          {lesson.prev_lesson_id && (
            <button 
              onClick={() => router.push(`/lessons/${lesson.prev_lesson_id}`)}
              className="btn btn-sm btn-secondary"
            >
              <ChevronLeft size={16} /> Prev
            </button>
          )}
          {lesson.next_lesson_id ? (
            <button 
              onClick={() => router.push(`/lessons/${lesson.next_lesson_id}`)}
              className="btn btn-sm btn-primary"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : lesson.exam_id && (
            <button 
              onClick={() => router.push(`/exams/${lesson.exam_id}`)}
              className="btn btn-sm btn-accent animate-pulse"
            >
              Practice Problems <FileText size={16} className="ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Lesson Title */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{lesson.title}</h1>
        <div className="h-1 w-20 bg-primary"></div>
      </div>

      {/* Video Content */}
      {videoId && (
        <div className="mb-12 aspect-video w-full rounded-xl overflow-hidden border border-border-color shadow-2xl bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* Markdown Content */}
      <div className="card prose prose-invert prose-primary max-w-none bg-gray-900/50">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");
              const copyId = `copy-${node.position?.start.offset || Math.random()}`;
              
              if (inline || !match) {
                return <code className={className} {...props}>{children}</code>;
              }

              return (
                <div className="relative group">
                  <button
                    onClick={() => copyToClipboard(codeString, copyId)}
                    className="absolute right-2 top-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1"
                    id={copyId}
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            },
            img({ node, ...props }: any) {
              let src = props.src;
              if (lesson.github_url && src && !src.startsWith('http') && !src.startsWith('data:')) {
                let baseUrl = lesson.github_url;
                if (baseUrl.includes("github.com") && !baseUrl.includes("raw.githubusercontent.com")) {
                  baseUrl = baseUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
                }
                const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
                src = `${baseDir}/${src.replace(/^\.\//, '')}`;
              }
              return <img className="rounded-lg border border-border-color mx-auto my-8 max-h-[500px] object-contain" {...props} src={src} alt={props.alt || "Lesson image"} />;
            }
          }}
        >
          {lesson.content}
        </ReactMarkdown>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-12 flex justify-between items-center py-6 border-t border-border-color">
        {lesson.prev_lesson_id ? (
          <button 
            onClick={() => router.push(`/lessons/${lesson.prev_lesson_id}`)}
            className="flex flex-col items-start group"
          >
            <span className="text-xs text-gray-500 font-mono mb-1">PREVIOUS LESSON</span>
            <span className="text-lg font-bold text-gray-300 group-hover:text-primary transition-colors flex items-center gap-1">
              <ChevronLeft size={18} /> Previous
            </span>
          </button>
        ) : <div></div>}

        {lesson.next_lesson_id ? (
          <button 
            onClick={() => router.push(`/lessons/${lesson.next_lesson_id}`)}
            className="flex flex-col items-end group text-right"
          >
            <span className="text-xs text-gray-500 font-mono mb-1">NEXT LESSON</span>
            <span className="text-lg font-bold text-gray-300 group-hover:text-primary transition-colors flex items-center gap-1">
              Next <ChevronRight size={18} />
            </span>
          </button>
        ) : lesson.exam_id ? (
          <button 
            onClick={() => router.push(`/exams/${lesson.exam_id}`)}
            className="flex flex-col items-end group text-right"
          >
            <span className="text-xs text-yellow-500 font-mono mb-1">PRACTICE PROBLEMS</span>
            <span className="text-lg font-bold text-yellow-500 group-hover:text-yellow-400 transition-colors flex items-center gap-1">
              Complete Challenges <FileText size={18} />
            </span>
          </button>
        ) : <div></div>}
      </div>
    </div>
  );
}

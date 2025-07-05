'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => {
            // Clean [REF]...[/REF] tags from href only
            let cleanHref = props.href;
            if (cleanHref && cleanHref.includes('[REF]')) {
              const refMatch = cleanHref.match(/\[REF\](https?:\/\/[^\[\]]+)\[\/REF\]/);
              if (refMatch) {
                cleanHref = refMatch[1];
              }
            }
            
            return (
              <a
                {...props}
                href={cleanHref}
                className="mb-2 inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-conab-action to-conab-action-lighten text-white text-sm rounded-xl hover:from-conab-action-lighten hover:to-conab-action transition-all duration-200 font-medium no-underline shadow-sm hover:shadow-md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {props.children}
                <svg className="w-3 h-3 ml-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </a>
            );
          },
          
          h1: ({ ...props }) => (
            <h1 {...props} className="text-xl font-bold text-gray-800 mb-4 mt-6 border-b border-gray-200 pb-2" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-lg font-semibold text-gray-800 mb-3 mt-5" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-base font-medium text-gray-800 mb-2 mt-4" />
          ),
          
          ul: ({ ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-2 mb-4 text-gray-700" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-2 mb-4 text-gray-700" />
          ),
          li: ({ ...props }) => (
            <li {...props} className="text-sm leading-relaxed" />
          ),
          
          p: ({ ...props }) => (
            <p {...props} className="mb-4 text-sm leading-relaxed text-gray-700" />
          ),
          
          code: (props) => {
            const { className, children } = props;
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-2 py-1 bg-gray-100 text-conab-action rounded-lg text-xs font-mono border border-gray-200">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 bg-gray-50 text-gray-800 rounded-xl text-xs font-mono overflow-x-auto border border-gray-200 shadow-sm">
                {children}
              </code>
            );
          },
          
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-conab-action pl-4 py-3 bg-gradient-to-r from-conab-action/5 to-conab-action-lighten/5 rounded-r-xl mb-4 italic text-gray-700 shadow-sm"
            />
          ),
          
          table: ({ ...props }) => (
            <div className="overflow-x-auto mb-4 rounded-xl border border-gray-200 shadow-sm">
              <table {...props} className="min-w-full" />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead {...props} className="bg-gradient-to-r from-conab-header to-conab-middle-blue text-white" />
          ),
          th: ({ ...props }) => (
            <th {...props} className="px-4 py-3 text-left text-sm font-semibold" />
          ),
          td: ({ ...props }) => (
            <td {...props} className="px-4 py-3 border-t border-gray-200 text-sm text-gray-700" />
          ),
          
          strong: ({ ...props }) => (
            <strong {...props} className="font-bold text-gray-800" />
          ),
          em: ({ ...props }) => (
            <em {...props} className="italic text-gray-700" />
          ),
          
          hr: ({ ...props }) => (
            <hr {...props} className="border-t border-gray-200 my-6" />
          ),
        }}
              >
          {content}
        </ReactMarkdown>
    </div>
  );
} 
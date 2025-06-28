'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="inline-flex items-center px-3 py-1 bg-conab-action text-white text-sm rounded-lg hover:bg-conab-action-lighten transition-colors font-medium no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {props.children}
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          ),
          
          h1: ({ ...props }) => (
            <h1 {...props} className="text-xl font-bold text-conab-dark-blue mb-3 mt-4" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-lg font-semibold text-conab-dark-blue mb-2 mt-3" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-base font-medium text-conab-dark-blue mb-2 mt-3" />
          ),
          
          ul: ({ ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-1 mb-3 text-conab-dark-blue" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-1 mb-3 text-conab-dark-blue" />
          ),
          li: ({ ...props }) => (
            <li {...props} className="text-sm" />
          ),
          
          p: ({ ...props }) => (
            <p {...props} className="mb-3 text-sm leading-relaxed text-conab-dark-blue" />
          ),
          
          code: (props) => {
            const { className, children } = props;
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-2 py-1 bg-gray-100 text-conab-action rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-3 bg-gray-100 text-conab-action rounded text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-conab-action pl-4 py-2 bg-conab-light-background rounded-r-lg mb-3 italic text-conab-dark-blue"
            />
          ),
          
          table: ({ ...props }) => (
            <div className="overflow-x-auto mb-3">
              <table {...props} className="min-w-full border border-conab-middle-blue rounded-lg" />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead {...props} className="bg-conab-header text-white" />
          ),
          th: ({ ...props }) => (
            <th {...props} className="px-4 py-2 text-left text-sm font-medium" />
          ),
          td: ({ ...props }) => (
            <td {...props} className="px-4 py-2 border-t border-conab-middle-blue text-sm" />
          ),
          
          strong: ({ ...props }) => (
            <strong {...props} className="font-semibold text-conab-dark-blue" />
          ),
          em: ({ ...props }) => (
            <em {...props} className="italic text-conab-dark-blue" />
          ),
          
          hr: ({ ...props }) => (
            <hr {...props} className="border-t border-conab-middle-blue my-4" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 
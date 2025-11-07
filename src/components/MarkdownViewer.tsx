import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
	content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
	const components: Components = {
		code: ({ className, children, ...props }) => {
			// Detect if this is a code block (has language-* className) or inline code
			const isCodeBlock = /language-(\w+)/.test(className || "");

			// Inline code (single backtick) - render normally with styling
			if (!isCodeBlock) {
				return (
					<code className="text-primary bg-muted px-1 py-0.5 rounded text-[0.875em] font-mono">
						{children}
					</code>
				);
			}

			// Full code block (triple backticks) - return text directly
			return <>{children}</>;
		},
		pre: ({ children }) => {
			// Full code block wrapper - custom logic placeholder
			// TODO: Implement custom code block logic
			return (
				<div className="bg-muted p-4 rounded-lg whitespace-pre-wrap font-mono text-sm my-4 text-foreground border border-border">
					pre?
					{children}
				</div>
			);
		},
	};

	return (
		<div className="prose prose-invert prose-lg max-w-none prose-headings:text-primary prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8 prose-h1:first:mt-0 prose-h2:text-3xl prose-h2:font-semibold prose-h2:mb-5 prose-h2:mt-12 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-4 prose-h3:mt-8 prose-h4:text-xl prose-h4:font-semibold prose-h4:mb-3 prose-h4:mt-6 prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-5 prose-p:text-lg prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 hover:prose-a:text-primary/80 hover:prose-a:decoration-primary/50 prose-strong:font-semibold prose-strong:text-foreground prose-em:italic prose-em:text-muted-foreground prose-ul:text-foreground prose-ul:mb-5 prose-ul:space-y-2 prose-ol:text-foreground prose-ol:mb-5 prose-ol:space-y-2 prose-li:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-6 prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-hr:border-border prose-hr:my-8 prose-table:border-collapse prose-table:border prose-table:border-border prose-thead:bg-muted prose-tr:border-b prose-tr:border-border prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-primary prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-td:text-foreground">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</ReactMarkdown>
		</div>
	);
}

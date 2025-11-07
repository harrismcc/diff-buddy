import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Import highlight.js theme dynamically on client side
if (typeof window !== "undefined") {
	import("highlight.js/styles/github-dark.css");
}

interface MarkdownViewerProps {
	content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
	// Custom components for markdown elements
	const components: Components = {
		h1: ({ children }) => (
			<h1 className="text-4xl font-bold text-cyan-400 mb-6 mt-8 first:mt-0">
				{children}
			</h1>
		),
		h2: ({ children }) => (
			<h2 className="text-3xl font-semibold text-cyan-400 mb-5 mt-12 border-b border-slate-700 pb-2">
				{children}
			</h2>
		),
		h3: ({ children }) => (
			<h3 className="text-2xl font-semibold text-cyan-300 mb-4 mt-8">
				{children}
			</h3>
		),
		h4: ({ children }) => (
			<h4 className="text-xl font-semibold text-cyan-300 mb-3 mt-6">
				{children}
			</h4>
		),
		p: ({ children }) => (
			<p className="text-gray-300 leading-relaxed mb-5 text-lg">{children}</p>
		),
		a: ({ href, children }) => (
			<a
				href={href}
				className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 hover:decoration-cyan-300 transition-colors"
				target="_blank"
				rel="noopener noreferrer"
			>
				{children}
			</a>
		),
		ul: ({ children }) => (
			<ul className="list-disc list-inside text-gray-300 mb-5 space-y-2 ml-4">
				{children}
			</ul>
		),
		ol: ({ children }) => (
			<ol className="list-decimal list-inside text-gray-300 mb-5 space-y-2 ml-4">
				{children}
			</ol>
		),
		li: ({ children }) => <li className="leading-relaxed">{children}</li>,
		blockquote: ({ children }) => (
			<blockquote className="border-l-4 border-cyan-400 pl-4 italic text-gray-400 my-6 bg-slate-900/30 py-2">
				{children}
			</blockquote>
		),
		code: ({ className, children }) => {
			const isInline = !className;
			if (isInline) {
				return (
					<code className="text-cyan-300 bg-slate-900/70 px-1.5 py-0.5 rounded text-sm font-mono">
						{children}
					</code>
				);
			}
			return (
				<code className={className}>
					{children}
				</code>
			);
		},
		pre: ({ children }) => (
			<pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto mb-6 shadow-lg">
				{children}
			</pre>
		),
		strong: ({ children }) => (
			<strong className="font-semibold text-white">{children}</strong>
		),
		em: ({ children }) => (
			<em className="italic text-gray-200">{children}</em>
		),
		hr: () => <hr className="border-slate-700 my-8" />,
		table: ({ children }) => (
			<div className="overflow-x-auto mb-6">
				<table className="min-w-full border-collapse border border-slate-700">
					{children}
				</table>
			</div>
		),
		thead: ({ children }) => (
			<thead className="bg-slate-800">{children}</thead>
		),
		tbody: ({ children }) => <tbody>{children}</tbody>,
		tr: ({ children }) => (
			<tr className="border-b border-slate-700">{children}</tr>
		),
		th: ({ children }) => (
			<th className="border border-slate-700 px-4 py-2 text-left font-semibold text-cyan-400">
				{children}
			</th>
		),
		td: ({ children }) => (
			<td className="border border-slate-700 px-4 py-2 text-gray-300">
				{children}
			</td>
		),
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-6">
			<article className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 md:p-12 shadow-2xl">
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					rehypePlugins={[rehypeHighlight]}
					components={components}
				>
					{content}
				</ReactMarkdown>
			</article>
		</div>
	);
}

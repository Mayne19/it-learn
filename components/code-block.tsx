"use client"

import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/chapters/types"
import { getLangLabel } from "@/lib/lang"

interface LangSpec {
  keywords: Set<string>
  constants: Set<string>
  types: Set<string>
  commentPrefix: "//" | "#"
}

const JAVA_SPEC: LangSpec = {
  commentPrefix: "//",
  keywords: new Set([
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while",
  ]),
  constants: new Set(["true", "false", "null"]),
  types: new Set([
    "ArrayList", "Arrays", "Exception", "HashMap", "Integer", "List", "Map",
    "Math", "Object", "Optional", "Scanner", "Set", "String", "StringBuilder",
    "System", "Thread",
  ]),
}

const PYTHON_SPEC: LangSpec = {
  commentPrefix: "#",
  keywords: new Set([
    "and", "or", "not", "is", "in", "lambda", "def", "return", "if", "elif",
    "else", "for", "while", "break", "continue", "pass", "import", "from",
    "as", "class", "try", "except", "finally", "raise", "with", "yield",
    "global", "nonlocal", "del", "assert", "async", "await",
  ]),
  constants: new Set(["True", "False", "None"]),
  types: new Set([
    "list", "dict", "set", "tuple", "str", "int", "float", "bool", "print",
    "len", "range", "open", "type", "input", "enumerate", "zip", "map",
    "filter", "sorted", "sum", "min", "max", "abs", "isinstance", "super",
  ]),
}

const PERL_SPEC: LangSpec = {
  commentPrefix: "#",
  keywords: new Set([
    "my", "our", "local", "sub", "if", "elsif", "else", "unless", "while",
    "until", "for", "foreach", "do", "last", "next", "redo", "return", "use",
    "package", "print", "chomp", "require",
  ]),
  constants: new Set(["undef"]),
  types: new Set([]),
}

const JAVASCRIPT_SPEC: LangSpec = {
  commentPrefix: "//",
  keywords: new Set([
    "var", "let", "const", "function", "return", "if", "else", "for", "while",
    "do", "break", "continue", "switch", "case", "default", "class", "extends",
    "new", "this", "typeof", "instanceof", "try", "catch", "finally", "throw",
    "async", "await", "yield", "import", "export", "from", "of", "in",
    "static", "get", "set", "delete", "void", "super",
  ]),
  constants: new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]),
  types: new Set([
    "console", "Array", "Object", "String", "Number", "Boolean", "Math",
    "JSON", "Promise", "Map", "Set", "document", "window", "Date", "Error",
    "RegExp",
  ]),
}

const SPECS: Record<Lang, LangSpec> = {
  java: JAVA_SPEC,
  python: PYTHON_SPEC,
  perl: PERL_SPEC,
  javascript: JAVASCRIPT_SPEC,
}

// Token pattern is identical for every language except the line-comment marker.
// $var and @var are captured whole so Perl sigils (scalars/arrays) highlight as a unit.
const SLASH_COMMENT_PATTERN = /\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@\w+|\$\w+|\b\d+(?:\.\d+)?[fFdDlL]?\b|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Za-z_]\w*\b|[{}()[\];,.]|[+\-*/%=!<>|&?:]+/g
const HASH_COMMENT_PATTERN = /#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@\w+|\$\w+|\b\d+(?:\.\d+)?[fFdDlL]?\b|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Za-z_]\w*\b|[{}()[\];,.]|[+\-*/%=!<>|&?:]+/g

function tokenPatternFor(spec: LangSpec): RegExp {
  return spec.commentPrefix === "#" ? HASH_COMMENT_PATTERN : SLASH_COMMENT_PATTERN
}

interface CodeBlockProps {
  code: string
  lang?: Lang
  highlightLine?: number
  className?: string
  renderMarkers?: (marker: number) => React.ReactNode
  renderBlanks?: (id: number) => React.ReactNode
}

export function CodeBlock({ code, lang = "java", highlightLine, className, renderMarkers, renderBlanks }: CodeBlockProps) {
  const lines = code.split('\n')
  const spec = SPECS[lang]
  const tokenPattern = tokenPatternFor(spec)

  const tokenClassName = (token: string, source: string, index: number) => {
    if (token.startsWith("//") || token.startsWith("#")) return "text-code-token-comment italic"
    if (token.startsWith("\"") || token.startsWith("'")) return "text-code-token-string"
    if (token.startsWith("@") || token.startsWith("$")) return "text-code-token-type"
    if (/^\d/.test(token)) return "text-code-token-number"
    if (spec.keywords.has(token)) return "text-code-token-keyword"
    if (spec.constants.has(token)) return "text-code-token-number"
    if (spec.types.has(token) || /^[A-Z][A-Za-z0-9_]*$/.test(token)) return "text-code-token-type"
    if (/^[A-Za-z_]\w*$/.test(token) && source.slice(index + token.length).trimStart().startsWith("(")) {
      return "text-code-token-method"
    }
    if (/^[{}()[\];,.]$/.test(token)) return "text-muted-foreground"
    if (/^[+\-*/%=!<>|&?:]+$/.test(token)) return "text-code-token-operator"
    return undefined
  }

  const renderText = (text: string, keyPrefix: string) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0

    for (const match of text.matchAll(tokenPattern)) {
      const token = match[0]
      const index = match.index ?? 0

      if (index > lastIndex) {
        parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{text.slice(lastIndex, index)}</span>)
      }

      parts.push(
        <span key={`${keyPrefix}-token-${index}`} className={tokenClassName(token, text, index)}>
          {token}
        </span>
      )
      lastIndex = index + token.length
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{text.slice(lastIndex)}</span>)
    }

    return parts.length > 0 ? parts : text
  }

  const renderLine = (line: string) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let key = 0

    while (remaining.length > 0) {
      const markerMatch = remaining.match(/<<<(\d+)>>>/)
      const blankMatch = remaining.match(/___(\d+)___/)

      const nextMarker = markerMatch ? remaining.indexOf(markerMatch[0]) : Infinity
      const nextBlank = blankMatch ? remaining.indexOf(blankMatch[0]) : Infinity

      if (nextMarker === Infinity && nextBlank === Infinity) {
        parts.push(<span key={key}>{renderText(remaining, `text-${key}`)}</span>)
        break
      }

      if (nextMarker <= nextBlank && markerMatch) {
        if (nextMarker > 0) {
          parts.push(<span key={key}>{renderText(remaining.slice(0, nextMarker), `text-${key}`)}</span>)
          key++
        }
        const id = parseInt(markerMatch[1])
        parts.push(
          <span key={key++} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs font-bold mx-0.5">
            {renderMarkers ? renderMarkers(id) : id}
          </span>
        )
        remaining = remaining.slice(nextMarker + markerMatch[0].length)
      } else if (blankMatch) {
        if (nextBlank > 0) {
          parts.push(<span key={key}>{renderText(remaining.slice(0, nextBlank), `text-${key}`)}</span>)
          key++
        }
        const id = parseInt(blankMatch[1])
        parts.push(
          <span key={key++}>
            {renderBlanks ? renderBlanks(id) : (
              <span className="inline-block min-w-[60px] border-b-2 border-warning mx-1 text-warning font-bold text-center">___</span>
            )}
          </span>
        )
        remaining = remaining.slice(nextBlank + blankMatch[0].length)
      } else {
        parts.push(<span key={key}>{renderText(remaining, `text-${key}`)}</span>)
        break
      }
    }

    return parts
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border/80 bg-code text-sm shadow-sm", className)}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/35 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-destructive/75" />
          <span className="size-2.5 rounded-full bg-warning/80" />
          <span className="size-2.5 rounded-full bg-success/75" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{getLangLabel(lang)}</span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6 sm:text-sm">
        {lines.map((line, idx) => {
          const lineNum = idx + 1
          const isHighlighted = highlightLine === lineNum
          return (
            <div
              key={idx}
              className={cn(
                "flex min-w-max",
                isHighlighted && "bg-code-highlight border-l-2 border-ring -mx-3 px-3"
              )}
            >
              <span className="select-none w-8 text-right pr-4 text-code-number text-xs leading-6 flex-shrink-0">
                {lineNum}
              </span>
              <span className="text-code-foreground leading-6 flex-1 whitespace-pre">
                {renderLine(line)}
              </span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}

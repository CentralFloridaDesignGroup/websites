export function formatTemplateScopeAsMarkdown(blocks: Array<{ type: "paragraph" | "list-numbered" | "list-bulleted"; content: string | string[] }>, params: Record<string, string>): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return substituteParams(block.content as string, params);
      }

      const items = block.content as string[];
      return items
        .map((item, index) => {
          const prefix = block.type === "list-numbered" ? `${index + 1}. ` : "- ";
          return `${prefix}${substituteParams(item, params)}`;
        })
        .join("\n");
    })
    .join("\n\n");
}

export function getSubtaskLetter(index: number): string {
  let value = index + 1;
  let result = "";

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

export function buildServiceScopeMarkdown(
  phaseScope: string,
  subtasks: Array<{ title: string; scopeOfWork: string }>,
): string {
  const sections: string[] = [];
  const trimmedPhaseScope = phaseScope.trim();

  if (trimmedPhaseScope) {
    sections.push(trimmedPhaseScope);
  }

  subtasks.forEach((subtask, index) => {
    const heading = `### TASK ${getSubtaskLetter(index)}: ${(subtask.title || "Untitled Task").trim()}`;
    const body = subtask.scopeOfWork.trim();
    sections.push(body ? `${heading}\n\n${body}` : heading);
  });

  return sections.join("\n\n").trim();
}

export function buildServiceScopeWordXml(service: {
  scopeOfWork: string;
  subtasks?: Array<{ title: string; scopeOfWork: string }>;
}): string {
  const paragraphs: string[] = [];
  const phaseScopeXml = convertMarkdownToWordParagraphXml(service.scopeOfWork);

  if (phaseScopeXml.length > 0) {
    paragraphs.push(...phaseScopeXml);
  }

  (service.subtasks ?? []).forEach((subtask, index) => {
    paragraphs.push(createTaskHeadingParagraphXml(`TASK ${getSubtaskLetter(index)}: ${subtask.title || "Untitled Task"}`));
    const subtaskScopeXml = convertMarkdownToWordParagraphXml(subtask.scopeOfWork);
    if (subtaskScopeXml.length > 0) {
      paragraphs.push(...subtaskScopeXml);
    }
  });

  return paragraphs.length > 0 ? paragraphs.join("") : createEmptyParagraphXml();
}

export function normalizeScopeOfWorkForWord(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");

  return normalized
    .split("\n")
    .map((line) => {
      const strippedLine = stripInlineMarkdown(line);

      if (/^\s*[-+*]\s+/.test(strippedLine)) {
        return strippedLine.replace(/^\s*[-+*]\s+/, "• ");
      }

      if (/^\s*\d+\.\s+/.test(strippedLine)) {
        return strippedLine;
      }

      return strippedLine.replace(/^\s*#{1,6}\s*/, "").replace(/^>\s?/, "");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function substituteParams(text: string, params: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.*?)(?<!\s)\*/g, "$1$2")
    .replace(/(^|[^_])_(?!\s)(.*?)(?<!\s)_/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");
}

function convertMarkdownToWordParagraphXml(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let currentList:
    | { type: "bullet" | "numbered"; items: string[] }
    | null = null;

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;
    paragraphs.push(createBodyParagraphXml(currentParagraph.join("\n")));
    currentParagraph = [];
  };

  const flushList = () => {
    if (!currentList || currentList.items.length === 0) return;
    currentList.items.forEach((item, index) => {
      paragraphs.push(
        createListParagraphXml(item, currentList!.type === "bullet" ? "•" : `${index + 1}.`, currentList!.type),
      );
    });
    currentList = null;
  };

  lines.forEach((rawLine) => {
    const bulletMatch = /^\s*[-+*]\s+(.*)$/.exec(rawLine);
    const numberedMatch = /^\s*(\d+)\.\s+(.*)$/.exec(rawLine);

    if (!rawLine.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    if (numberedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "numbered") {
        flushList();
        currentList = { type: "numbered", items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      return;
    }

    flushList();
    currentParagraph.push(rawLine);
  });

  flushParagraph();
  flushList();

  return paragraphs;
}

function createEmptyParagraphXml(): string {
  return '<w:p><w:pPr><w:spacing w:after="120" w:line="278" w:lineRule="auto"/></w:pPr></w:p>';
}

function createTaskHeadingParagraphXml(text: string): string {
  return `<w:p><w:pPr><w:spacing w:before="120" w:after="80" w:line="278" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:caps/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function createBodyParagraphXml(text: string): string {
  return `<w:p><w:pPr><w:spacing w:after="120" w:line="278" w:lineRule="auto"/></w:pPr>${buildInlineRunsXml(text)}</w:p>`;
}

function createListParagraphXml(text: string, prefix: string, type: "bullet" | "numbered"): string {
  const hanging = type === "bullet" ? "360" : "420";
  return `<w:p><w:pPr><w:ind w:left="720" w:hanging="${hanging}"/><w:spacing w:after="80" w:line="278" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(prefix)} </w:t></w:r>${buildInlineRunsXml(text)}</w:p>`;
}

function buildInlineRunsXml(text: string): string {
  const tokens = tokenizeInlineMarkdown(text);
  const runs: string[] = [];

  tokens.forEach((token) => {
    if (token.type === "break") {
      runs.push("<w:r><w:br/></w:r>");
      return;
    }

    const runProperties: string[] = [];
    if (token.bold) runProperties.push("<w:b/>");
    if (token.italic) runProperties.push("<w:i/>");
    const propertiesXml = runProperties.length > 0 ? `<w:rPr>${runProperties.join("")}</w:rPr>` : "";
    runs.push(`<w:r>${propertiesXml}<w:t xml:space="preserve">${escapeXml(token.value)}</w:t></w:r>`);
  });

  return runs.length > 0 ? runs.join("") : '<w:r><w:t xml:space="preserve"></w:t></w:r>';
}

function tokenizeInlineMarkdown(text: string): Array<{ type: "text"; value: string; bold: boolean; italic: boolean } | { type: "break" }> {
  const tokens: Array<{ type: "text"; value: string; bold: boolean; italic: boolean } | { type: "break" }> = [];
  let buffer = "";
  let bold = false;
  let italic = false;
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    tokens.push({ type: "text", value: buffer, bold, italic });
    buffer = "";
  };

  while (index < text.length) {
    if (text.startsWith("***", index)) {
      flush();
      bold = !bold;
      italic = !italic;
      index += 3;
      continue;
    }

    if (text.startsWith("**", index)) {
      flush();
      bold = !bold;
      index += 2;
      continue;
    }

    if (text[index] === "*") {
      flush();
      italic = !italic;
      index += 1;
      continue;
    }

    if (text[index] === "\n") {
      flush();
      tokens.push({ type: "break" });
      index += 1;
      continue;
    }

    buffer += text[index];
    index += 1;
  }

  flush();
  return tokens;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
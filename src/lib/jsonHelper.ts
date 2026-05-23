export function tryParseJSON(raw: string): { success: true; data: unknown } | { success: false; error: string } {
  const text = raw.trim();
  if (!text) return { success: false, error: "Empty input." };

  try {
    return { success: true, data: JSON.parse(text) };
  } catch {
    const fixed = fixJSON(text);
    try {
      return { success: true, data: JSON.parse(fixed) };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
}

function fixJSON(json: string): string {
  const out: string[] = [];
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escapeNext) {
      const isLatexCmd = inString
        && (ch === "t" || ch === "f")
        && i + 1 < json.length
        && /[a-zA-Z]/.test(json[i + 1]);
      if (isLatexCmd) {
        out.push("\\");
      } else if (inString && !isValidJSONEscapeTarget(ch)) {
        out.push("\\");
      }
      out.push(ch);
      escapeNext = false;
      continue;
    }

    if (inString && ch === "\\") {
      out.push(ch);
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out.push(ch);
      continue;
    }

    if (inString && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && i + 1 < json.length && json[i + 1] === "\n") i++;
      out.push("\\", "n");
      continue;
    }

    if (inString && ch === "\t") {
      out.push("\\", "t");
      continue;
    }

    out.push(ch);
  }

  return out.join("");
}

function isValidJSONEscapeTarget(ch: string): boolean {
  return /["\\\/bfnrtu]/.test(ch);
}

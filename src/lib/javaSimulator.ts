import { CodeValidationSpec } from '../types/codeland';

export interface JavaExecutionResult {
  success: boolean;
  outputLines: string[];
  rawOutput: string;
  errorLine?: number;
  errorTitle?: string;
  friendlyErrorExplanation?: string;
}

export interface JavaEvaluationFeedback {
  passed: boolean;
  execution: JavaExecutionResult;
  headline: string;
  explanation: string;
  highlightSnippet?: string;
}

type SimValue = number | string | boolean | SimValue[] | SimObject | null | undefined;

interface SimObject {
  __className: string;
  fields: Record<string, SimValue>;
  __listItems?: SimValue[];
}

interface ParsedField {
  type: string;
  name: string;
  isStatic: boolean;
  initExpr?: string;
}

interface ParsedMethod {
  name: string;
  returnType: string;
  isStatic: boolean;
  isAbstract: boolean;
  params: { type: string; name: string }[];
  body: string;
}

interface ParsedClass {
  name: string;
  isInterface?: boolean;
  superClass?: string;
  interfaces: string[];
  fields: ParsedField[];
  constructors: { params: { type: string; name: string }[]; body: string }[];
  methods: ParsedMethod[];
}

class ReturnSignal {
  constructor(public value: SimValue) {}
}
class BreakSignal {}
class ContinueSignal {}

class JavaRuntimeExceptionSignal {
  constructor(
    public exceptionType: string,
    public message: string
  ) {}
}

function stripCommentsPreserveLines(code: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let inChar = false;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (!inString && !inChar && ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    if (!inString && !inChar && ch === '/' && next === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') result += '\n';
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === '"' && !inChar && code[i - 1] !== '\\') {
      inString = !inString;
    } else if (ch === "'" && !inString && code[i - 1] !== '\\') {
      inChar = !inChar;
    }
    result += ch;
    i++;
  }
  return result;
}

function stripImportsAndAnnotationsPreserveLines(cleanCode: string): string {
  return cleanCode
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (/^import\s+[\w.*]+\s*;$/.test(trimmed) || /^package\s+[\w.]+\s*;$/.test(trimmed)) {
        return '';
      }
      if (/^@[A-Za-z_]\w*(\([^)]*\))?$/.test(trimmed)) {
        return '';
      }
      return line.replace(/@Override\b/g, '');
    })
    .join('\n');
}

function stripGenericsFromType(rawType: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < rawType.length; i++) {
    const c = rawType[i];
    if (c === '<') depth++;
    else if (c === '>') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += c;
  }
  return out.trim();
}

function preflightDiagnostics(rawCode: string): { line: number; title: string; message: string } | null {
  const clean = stripCommentsPreserveLines(rawCode);
  const lines = clean.split('\n');

  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    if (/\bsystem\.out\.print/i.test(l) && !/\bSystem\.out\.print/.test(l)) {
      return {
        line: idx + 1,
        title: 'Capitalization Error in System.out',
        message:
          'Java is case-sensitive. Write `System.out.println(...)` with a capital `S` on `System`.',
      };
    }
    if (/\bstring\s+[a-zA-Z_]/.test(l)) {
      return {
        line: idx + 1,
        title: 'Capitalize String Type',
        message:
          'In Java, `String` is a class name, so it always starts with a capital `S` (for example: `String name = "Alex";`).',
      };
    }
    if (/\bBoolean\b/.test(l) === false && /\bbool\s+[a-zA-Z_]/.test(l)) {
      return {
        line: idx + 1,
        title: 'Use `boolean` in Java',
        message:
          'Java spells the true/false type in full as `boolean` (for example: `boolean hasKey = true;`).',
      };
    }

    let quotes = 0;
    for (let c = 0; c < l.length; c++) {
      if (l[c] === '"' && l[c - 1] !== '\\') quotes++;
    }
    if (quotes % 2 !== 0) {
      return {
        line: idx + 1,
        title: 'Unclosed Double Quote',
        message:
          'Every text String in Java must start and end with double quotes `"..."` on the same line.',
      };
    }

    const ifMatch = l.match(/\bif\s*\(([^)]+)\)/);
    if (ifMatch) {
      const cond = ifMatch[1];
      if (/(?<![=!<>])=(?!=)/.test(cond)) {
        return {
          line: idx + 1,
          title: 'Assignment `=` Inside `if` Condition',
          message:
            'A single `=` assigns a value, whereas `==` compares two values. Inside `if (...)`, use `==` to check equality.',
        };
      }
    }

    const trimmed = l.trim();
    if (
      trimmed.length > 0 &&
      !trimmed.startsWith('@') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith('?') &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('else') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('do') &&
      !trimmed.startsWith('switch') &&
      !trimmed.startsWith('case') &&
      !trimmed.startsWith('default') &&
      !trimmed.startsWith('try') &&
      !trimmed.startsWith('catch') &&
      !trimmed.startsWith('finally') &&
      !trimmed.startsWith('class ') &&
      !trimmed.startsWith('interface ') &&
      !trimmed.startsWith('abstract ') &&
      !trimmed.startsWith('public ') &&
      !trimmed.startsWith('private ') &&
      !trimmed.startsWith('protected ') &&
      !trimmed.startsWith('static ') &&
      !trimmed.startsWith('void ') &&
      !trimmed.includes('{') &&
      (/^(System\.out\.|Scanner\s|ArrayList|List<|int\s|double\s|float\s|char\s|boolean\s|String\s|return\b|throw\b|[a-zA-Z_]\w*\s*=|[a-zA-Z_]\w*\s*\()/.test(trimmed))
    ) {
      const nextTrimmed = (lines[idx + 1] || '').trim();
      if (
        !nextTrimmed.startsWith('{') &&
        !nextTrimmed.startsWith('+') &&
        !nextTrimmed.startsWith('.') &&
        !nextTrimmed.startsWith('?') &&
        !nextTrimmed.startsWith(':')
      ) {
        return {
          line: idx + 1,
          title: 'Missing Semicolon `;`',
          message: `Line ${idx + 1} looks like a Java instruction (\`${trimmed}\`), which needs a semicolon \`;\` at the end.`,
        };
      }
    }
  }

  let braceDepth = 0;
  let parenDepth = 0;
  let inStr = false;
  let inChr = false;
  let lastOpenBraceLine = 1;
  let curLine = 1;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '\n') curLine++;
    if (ch === '"' && !inChr && clean[i - 1] !== '\\') inStr = !inStr;
    else if (ch === "'" && !inStr && clean[i - 1] !== '\\') inChr = !inChr;
    if (inStr || inChr) continue;
    if (ch === '{') {
      braceDepth++;
      lastOpenBraceLine = curLine;
    } else if (ch === '}') {
      braceDepth--;
      if (braceDepth < 0) {
        return {
          line: curLine,
          title: 'Extra Closing Brace `}`',
          message: `Line ${curLine} has a closing curly brace \`}\` without a matching opening \`{\`.`,
        };
      }
    } else if (ch === '(') {
      parenDepth++;
    } else if (ch === ')') {
      parenDepth--;
      if (parenDepth < 0) {
        return {
          line: curLine,
          title: 'Extra Closing Parenthesis `)`',
          message: `Line ${curLine} has an extra \`)\` without a matching opening \`(\`.`,
        };
      }
    }
  }

  if (braceDepth > 0) {
    return {
      line: lastOpenBraceLine,
      title: 'Missing Closing Brace `}`',
      message: `A code block opened near line ${lastOpenBraceLine} is missing its closing curly brace \`}\`.`,
    };
  }
  if (parenDepth > 0) {
    return {
      line: curLine,
      title: 'Unclosed Parenthesis `(`',
      message: 'One of your parentheses `(` was never closed with a matching `)`.',
    };
  }

  return null;
}

function findMatchingDelimiter(str: string, openIdx: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let inStr = false;
  let inChr = false;
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"' && !inChr && str[i - 1] !== '\\') inStr = !inStr;
    else if (ch === "'" && !inStr && str[i - 1] !== '\\') inChr = !inChr;
    if (inStr || inChr) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevelArgs(argStr: string, sep = ','): string[] {
  const parts: string[] = [];
  let cur = '';
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;
  let inStr = false;
  let inChr = false;

  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i];
    if (ch === '"' && !inChr && argStr[i - 1] !== '\\') inStr = !inStr;
    else if (ch === "'" && !inStr && argStr[i - 1] !== '\\') inChr = !inChr;

    if (!inStr && !inChr) {
      if (ch === '(') paren++;
      else if (ch === ')') paren--;
      else if (ch === '{') brace++;
      else if (ch === '}') brace--;
      else if (ch === '[') bracket++;
      else if (ch === ']') bracket--;
      else if (sep === ',' && ch === '<' && /[A-Za-z0-9_?]/.test(argStr[i + 1] || '')) angle++;
      else if (sep === ',' && ch === '>' && angle > 0) angle--;

      if (ch === sep && paren === 0 && brace === 0 && bracket === 0 && angle === 0) {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim().length > 0) parts.push(cur.trim());
  return parts;
}

function parseParamList(raw: string): { type: string; name: string }[] {
  if (!raw.trim()) return [];
  return splitTopLevelArgs(raw).map((item) => {
    const cleaned = stripGenericsFromType(item.replace(/\bfinal\s+/g, '').trim());
    const tokens = cleaned.split(/\s+/);
    let name = tokens[tokens.length - 1];
    let type = tokens.slice(0, -1).join(' ');
    if (name.endsWith('[]')) {
      name = name.slice(0, -2);
      type = `${type}[]`;
    }
    return { type: type.replace(/\s+/g, ''), name };
  });
}

function parseClassesAndMembers(cleanCode: string): {
  classes: Map<string, ParsedClass>;
  standaloneBody: string | null;
} {
  const stripped = stripImportsAndAnnotationsPreserveLines(cleanCode);
  const classes = new Map<string, ParsedClass>();
  let idx = 0;
  let foundAnyClass = false;

  const declRegex =
    /(?:public\s+|abstract\s+|final\s+)*(class|interface)\s+([A-Za-z_]\w*)(?:<[^>]*>)?(?:\s+extends\s+([A-Za-z_]\w*)(?:<[^>]*>)?)?(?:\s+implements\s+([A-Za-z0-9_,\s<>]+))?\s*\{/;

  while (idx < stripped.length) {
    const sub = stripped.slice(idx);
    const classMatch = sub.match(declRegex);
    if (!classMatch || classMatch.index === undefined) break;

    foundAnyClass = true;
    const isInterface = classMatch[1] === 'interface';
    const className = classMatch[2];
    const superClass = classMatch[3];
    const implRaw = classMatch[4];
    const interfaces = implRaw
      ? implRaw
          .split(',')
          .map((s) => stripGenericsFromType(s).trim())
          .filter(Boolean)
      : [];

    const openBracePos = idx + classMatch.index + classMatch[0].length - 1;
    const closeBracePos = findMatchingDelimiter(stripped, openBracePos, '{', '}');
    if (closeBracePos === -1) break;

    const classBody = stripped.slice(openBracePos + 1, closeBracePos);
    const parsedClass: ParsedClass = {
      name: className,
      isInterface,
      superClass,
      interfaces,
      fields: [],
      constructors: [],
      methods: [],
    };

    let mIdx = 0;
    while (mIdx < classBody.length) {
      while (mIdx < classBody.length && /\s/.test(classBody[mIdx])) mIdx++;
      if (mIdx >= classBody.length) break;

      let scan = mIdx;
      let pDepth = 0;
      let bDepth = 0;
      let inS = false;
      let inC = false;
      while (scan < classBody.length) {
        const c = classBody[scan];
        if (c === '"' && !inC && classBody[scan - 1] !== '\\') inS = !inS;
        else if (c === "'" && !inS && classBody[scan - 1] !== '\\') inC = !inC;
        if (!inS && !inC) {
          if (c === '(') pDepth++;
          else if (c === ')') pDepth--;
          else if (c === '{' && pDepth > 0) bDepth++;
          else if (c === '}' && pDepth > 0) bDepth--;
          else if (pDepth === 0 && bDepth === 0 && (c === ';' || c === '{')) {
            // Check if '{' is actually an array initializer `int[] a = {1, 2};`
            if (c === '{') {
              const headerSlice = classBody.slice(mIdx, scan);
              if (headerSlice.includes('=')) {
                const initClose = findMatchingDelimiter(classBody, scan, '{', '}');
                if (initClose !== -1) {
                  scan = initClose + 1;
                  continue;
                }
              }
            }
            break;
          }
        }
        scan++;
      }

      if (scan >= classBody.length) break;

      if (classBody[scan] === ';') {
        const decl = classBody.slice(mIdx, scan).trim();
        // Check if this is an abstract or interface method declaration ending in `)`!
        if (!decl.includes('=') && /\)\s*$/.test(decl) && decl.includes('(')) {
          const openP = decl.indexOf('(');
          const closeP = decl.lastIndexOf(')');
          const beforeParen = decl.slice(0, openP).trim();
          const params = parseParamList(decl.slice(openP + 1, closeP));
          const tokens = beforeParen.split(/\s+/).filter(Boolean);
          const memberName = tokens[tokens.length - 1];
          const nonModTokens = tokens.filter(
            (t) => !['public', 'private', 'protected', 'static', 'final', 'abstract', 'default'].includes(t)
          );
          const returnType = stripGenericsFromType(nonModTokens.slice(0, -1).join(' ') || 'void');
          parsedClass.methods.push({
            name: memberName,
            returnType,
            isStatic: tokens.includes('static'),
            isAbstract: true,
            params,
            body: '',
          });
        } else {
          // Field declaration
          const isStatic = /\bstatic\b/.test(decl.split('=')[0]);
          const cleanedDecl = decl
            .replace(/\b(public|private|protected|static|final)\s+/g, '')
            .trim();
          const eqIdx = cleanedDecl.indexOf('=');
          const left = eqIdx >= 0 ? cleanedDecl.slice(0, eqIdx).trim() : cleanedDecl;
          const initExpr = eqIdx >= 0 ? cleanedDecl.slice(eqIdx + 1).trim() : undefined;
          const cleanLeft = stripGenericsFromType(left);
          const parts = cleanLeft.split(/\s+/);
          if (parts.length >= 2) {
            let name = parts[parts.length - 1];
            let type = parts.slice(0, -1).join('');
            if (name.endsWith('[]')) {
              name = name.slice(0, -2);
              type = `${type}[]`;
            }
            parsedClass.fields.push({ type, name, isStatic, initExpr });
          }
        }
        mIdx = scan + 1;
      } else {
        // Method or constructor block
        const header = classBody.slice(mIdx, scan).trim();
        const blockEnd = findMatchingDelimiter(classBody, scan, '{', '}');
        if (blockEnd === -1) break;
        const body = classBody.slice(scan + 1, blockEnd);

        const openP = header.indexOf('(');
        const closeP = header.lastIndexOf(')');
        if (openP > 0 && closeP > openP) {
          const beforeParen = stripGenericsFromType(header.slice(0, openP).trim());
          const paramsRaw = header.slice(openP + 1, closeP);
          const params = parseParamList(paramsRaw);
          const tokens = beforeParen.split(/\s+/).filter(Boolean);
          const memberName = tokens[tokens.length - 1];
          const isStatic = tokens.includes('static');
          const nonModTokens = tokens.filter(
            (t) => !['public', 'private', 'protected', 'static', 'final', 'synchronized', 'default'].includes(t)
          );

          if (memberName === className && nonModTokens.length === 1) {
            parsedClass.constructors.push({ params, body });
          } else {
            const returnType = nonModTokens.slice(0, -1).join(' ').replace(/\s+/g, '') || 'void';
            parsedClass.methods.push({
              name: memberName,
              returnType,
              isStatic,
              isAbstract: false,
              params,
              body,
            });
          }
        }
        mIdx = blockEnd + 1;
      }
    }

    classes.set(className, parsedClass);
    idx = closeBracePos + 1;
  }

  return {
    classes,
    standaloneBody: foundAnyClass ? null : stripped,
  };
}

interface ExecEnv {
  scopes: Record<string, SimValue>[];
  thisObj?: SimObject;
  currentClass?: ParsedClass;
  classes: Map<string, ParsedClass>;
  staticFields: Map<string, Record<string, SimValue>>;
  stdinQueue: string[];
  stdinCursor: number;
  outputBuffer: string[];
  currentLineBuffer: string;
  stepCount: number;
  maxSteps: number;
}

const BUILTIN_REFERENCE_TYPES = new Set([
  'String',
  'Scanner',
  'ArrayList',
  'List',
  'Object',
  'Integer',
  'Double',
  'Boolean',
  'Character',
  'Exception',
  'RuntimeException',
  'ArithmeticException',
  'IllegalArgumentException',
  'IndexOutOfBoundsException',
  'ArrayIndexOutOfBoundsException',
  'NullPointerException',
]);

function isPrimitiveOrKnownType(baseType: string, classes: Map<string, ParsedClass>): boolean {
  return (
    ['int', 'double', 'float', 'long', 'short', 'byte', 'char', 'boolean'].includes(baseType) ||
    BUILTIN_REFERENCE_TYPES.has(baseType) ||
    classes.has(baseType)
  );
}

function findStaticFieldOwner(env: ExecEnv, className: string, fieldName: string): Record<string, SimValue> | null {
  let cur: ParsedClass | undefined = env.classes.get(className);
  while (cur) {
    const bag = env.staticFields.get(cur.name);
    if (bag && Object.prototype.hasOwnProperty.call(bag, fieldName)) {
      return bag;
    }
    cur = cur.superClass ? env.classes.get(cur.superClass) : undefined;
  }
  return null;
}

function lookupVar(env: ExecEnv, name: string): { found: boolean; value: SimValue } {
  for (let i = env.scopes.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(env.scopes[i], name)) {
      return { found: true, value: env.scopes[i][name] };
    }
  }
  if (env.thisObj && Object.prototype.hasOwnProperty.call(env.thisObj.fields, name)) {
    return { found: true, value: env.thisObj.fields[name] };
  }
  if (env.currentClass) {
    const staticBag = findStaticFieldOwner(env, env.currentClass.name, name);
    if (staticBag) {
      return { found: true, value: staticBag[name] };
    }
  }
  return { found: false, value: undefined };
}

function assignVar(env: ExecEnv, name: string, val: SimValue): void {
  for (let i = env.scopes.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(env.scopes[i], name)) {
      env.scopes[i][name] = val;
      return;
    }
  }
  if (env.thisObj && Object.prototype.hasOwnProperty.call(env.thisObj.fields, name)) {
    env.thisObj.fields[name] = val;
    return;
  }
  if (env.currentClass) {
    const staticBag = findStaticFieldOwner(env, env.currentClass.name, name);
    if (staticBag) {
      staticBag[name] = val;
      return;
    }
  }
  throw new Error(`Undeclared variable \`${name}\`. Declare it with a Java type first (e.g., \`int ${name} = ...;\`).`);
}

function coerceType(val: SimValue, declaredType: string): SimValue {
  const base = stripGenericsFromType(declaredType).replace(/\s+/g, '');
  if (base === 'int' || base === 'long' || base === 'short' || base === 'byte' || base === 'Integer') {
    return Math.trunc(Number(val ?? 0));
  }
  if (base === 'double' || base === 'float' || base === 'Double') {
    return Number(val ?? 0);
  }
  if (base === 'boolean' || base === 'Boolean') {
    return Boolean(val);
  }
  if (base === 'char' || base === 'Character') {
    if (typeof val === 'number') return String.fromCharCode(val);
    const s = String(val ?? ' ');
    return s.length > 0 ? s[0] : ' ';
  }
  if (base === 'String') {
    return val === null ? null : String(val ?? '');
  }
  return val;
}

function defaultForType(type: string): SimValue {
  const t = stripGenericsFromType(type).trim();
  if (['int', 'long', 'short', 'byte', 'double', 'float'].includes(t)) return 0;
  if (t === 'boolean') return false;
  if (t === 'char') return '\0';
  return null;
}

function formatJavaValue(val: SimValue): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : String(val);
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return `[${val.map(formatJavaValue).join(', ')}]`;
  if (val.__className === 'ArrayList' && Array.isArray(val.__listItems)) {
    return `[${val.__listItems.map(formatJavaValue).join(', ')}]`;
  }
  return `${val.__className}@obj`;
}

function tickStep(env: ExecEnv) {
  env.stepCount++;
  if (env.stepCount > env.maxSteps) {
    throw new Error(
      'Infinite or excessive loop detected (exceeded 1,200 steps). Check your loop condition or recursion base case!'
    );
  }
}

function scoreParamCompatibility(params: { type: string; name: string }[], args: SimValue[]): number {
  if (params.length !== args.length) return -1;
  let score = 10;
  for (let i = 0; i < params.length; i++) {
    const pType = stripGenericsFromType(params[i].type).replace(/\s+/g, '');
    const arg = args[i];
    if (pType.endsWith('[]')) {
      if (!Array.isArray(arg)) return -1;
      score += 5;
      continue;
    }
    if (pType === 'String') {
      if (typeof arg !== 'string' && arg !== null) return -1;
      score += 5;
    } else if (pType === 'boolean' || pType === 'Boolean') {
      if (typeof arg !== 'boolean') return -1;
      score += 5;
    } else if (['int', 'long', 'short', 'byte', 'Integer'].includes(pType)) {
      if (typeof arg !== 'number' || !Number.isInteger(arg)) return -1;
      score += 6;
    } else if (['double', 'float', 'Double'].includes(pType)) {
      if (typeof arg !== 'number') return -1;
      score += Number.isInteger(arg) ? 3 : 6;
    } else if (pType === 'char' || pType === 'Character') {
      if (typeof arg !== 'string' || arg.length !== 1) return -1;
      score += 5;
    } else {
      score += 2;
    }
  }
  return score;
}

function findMethodOnClassHierarchy(
  classes: Map<string, ParsedClass>,
  className: string,
  methodName: string,
  args: SimValue[]
): { cls: ParsedClass; method: ParsedMethod } | null {
  let cur: ParsedClass | undefined = classes.get(className);
  while (cur) {
    const candidates = cur.methods.filter(
      (m) => !m.isAbstract && m.name === methodName && m.params.length === args.length
    );
    if (candidates.length > 0) {
      let best = candidates[0];
      let bestScore = scoreParamCompatibility(best.params, args);
      for (let i = 1; i < candidates.length; i++) {
        const s = scoreParamCompatibility(candidates[i].params, args);
        if (s > bestScore) {
          bestScore = s;
          best = candidates[i];
        }
      }
      return { cls: cur, method: best };
    }
    cur = cur.superClass ? classes.get(cur.superClass) : undefined;
  }
  return null;
}

function runConstructorForClass(
  env: ExecEnv,
  cls: ParsedClass,
  obj: SimObject,
  args: SimValue[]
): void {
  const candidates = cls.constructors.filter((c) => c.params.length === args.length);
  if (candidates.length === 0) {
    if (args.length === 0) return;
    throw new Error(
      `Constructor \`new ${cls.name}(...)\` received ${args.length} argument(s), which doesn't match the defined constructor parameters.`
    );
  }
  let chosen = candidates[0];
  let bestScore = scoreParamCompatibility(chosen.params, args);
  for (let i = 1; i < candidates.length; i++) {
    const s = scoreParamCompatibility(candidates[i].params, args);
    if (s > bestScore) {
      bestScore = s;
      chosen = candidates[i];
    }
  }

  const ctorEnv: ExecEnv = {
    ...env,
    scopes: [{}],
    thisObj: obj,
    currentClass: cls,
  };
  chosen.params.forEach((p, idx) => {
    ctorEnv.scopes[0][p.name] = coerceType(args[idx], p.type);
  });

  // Check leading `super(...)` or `this(...)` call in constructor body
  let bodyToRun = chosen.body.trim();
  const chainMatch = bodyToRun.match(/^(super|this)\s*\(/);
  if (chainMatch) {
    const openP = chainMatch[0].length - 1;
    const closeP = findMatchingDelimiter(bodyToRun, openP, '(', ')');
    if (closeP !== -1) {
      const chainArgsRaw = bodyToRun.slice(openP + 1, closeP);
      const chainArgs = splitTopLevelArgs(chainArgsRaw).map((a) => evalExpr(ctorEnv, a));
      let afterSemi = closeP + 1;
      while (afterSemi < bodyToRun.length && /\s/.test(bodyToRun[afterSemi])) afterSemi++;
      if (bodyToRun[afterSemi] === ';') afterSemi++;
      bodyToRun = bodyToRun.slice(afterSemi);

      if (chainMatch[1] === 'this') {
        runConstructorForClass(ctorEnv, cls, obj, chainArgs);
      } else if (chainMatch[1] === 'super' && cls.superClass) {
        const superCls = env.classes.get(cls.superClass);
        if (superCls) {
          runConstructorForClass(ctorEnv, superCls, obj, chainArgs);
        }
      }
    }
  }

  try {
    executeBlock(ctorEnv, bodyToRun);
  } catch (sig) {
    if (!(sig instanceof ReturnSignal)) throw sig;
  }
  env.stepCount = ctorEnv.stepCount;
  env.currentLineBuffer = ctorEnv.currentLineBuffer;
  env.stdinCursor = ctorEnv.stdinCursor;
}

function instantiateObject(env: ExecEnv, rawClassName: string, args: SimValue[]): SimObject {
  const className = stripGenericsFromType(rawClassName).trim();

  if (className === 'Scanner') {
    return {
      __className: 'Scanner',
      fields: {},
    };
  }

  if (className === 'ArrayList') {
    return {
      __className: 'ArrayList',
      fields: {},
      __listItems: [],
    };
  }

  if (BUILTIN_REFERENCE_TYPES.has(className) && className.endsWith('Exception')) {
    return {
      __className: className,
      fields: { message: String(args[0] ?? '') },
    };
  }

  const cls = env.classes.get(className);
  if (!cls) {
    throw new Error(`Unknown class \`${className}\`. Make sure \`class ${className}\` is spelled properly.`);
  }
  if (cls.isInterface) {
    throw new Error(`\`${className}\` is an interface and cannot be instantiated directly with \`new\`.`);
  }

  const hierarchy: ParsedClass[] = [];
  let cursor: ParsedClass | undefined = cls;
  while (cursor) {
    hierarchy.unshift(cursor);
    cursor = cursor.superClass ? env.classes.get(cursor.superClass) : undefined;
  }

  const obj: SimObject = {
    __className: className,
    fields: {},
  };

  for (const c of hierarchy) {
    for (const f of c.fields) {
      if (f.isStatic) continue;
      obj.fields[f.name] = f.initExpr
        ? coerceType(evalExpr(env, f.initExpr), f.type)
        : defaultForType(f.type);
    }
  }

  runConstructorForClass(env, cls, obj, args);
  return obj;
}

function invokeMethod(
  env: ExecEnv,
  targetClassName: string,
  methodName: string,
  args: SimValue[],
  receiver?: SimObject
): SimValue {
  const found = findMethodOnClassHierarchy(env.classes, targetClassName, methodName, args);
  if (!found) {
    throw new Error(
      `Method \`${methodName}\` taking ${args.length} argument(s) was not found in class \`${targetClassName}\`.`
    );
  }
  const callEnv: ExecEnv = {
    ...env,
    scopes: [{}],
    thisObj: receiver,
    currentClass: found.cls,
  };
  found.method.params.forEach((p, idx) => {
    callEnv.scopes[0][p.name] = coerceType(args[idx], p.type);
  });

  try {
    executeBlock(callEnv, found.method.body);
  } catch (sig) {
    env.stepCount = callEnv.stepCount;
    env.currentLineBuffer = callEnv.currentLineBuffer;
    env.stdinCursor = callEnv.stdinCursor;
    if (sig instanceof ReturnSignal) {
      return found.method.returnType === 'void'
        ? undefined
        : coerceType(sig.value, found.method.returnType);
    }
    throw sig;
  }
  env.stepCount = callEnv.stepCount;
  env.currentLineBuffer = callEnv.currentLineBuffer;
  env.stdinCursor = callEnv.stdinCursor;
  return undefined;
}

function findLastTopLevelDot(expr: string): number {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let inStr = false;
  let inChr = false;
  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i];
    if (ch === '"' && !inChr && expr[i - 1] !== '\\') inStr = !inStr;
    else if (ch === "'" && !inStr && expr[i - 1] !== '\\') inChr = !inChr;
    if (inStr || inChr) continue;
    if (ch === ')') paren++;
    else if (ch === '(') paren--;
    else if (ch === ']') bracket++;
    else if (ch === '[') bracket--;
    else if (ch === '}') brace++;
    else if (ch === '{') brace--;
    else if (ch === '.' && paren === 0 && bracket === 0 && brace === 0) {
      // Ignore decimal numbers like 3.14
      const prev = expr[i - 1] || '';
      const next = expr[i + 1] || '';
      if (/\d/.test(prev) && /\d/.test(next)) continue;
      return i;
    }
  }
  return -1;
}

function readNextScannerToken(env: ExecEnv, wholeLine: boolean): string {
  if (env.stdinCursor >= env.stdinQueue.length) {
    return wholeLine ? 'Explorer' : '10';
  }
  const val = env.stdinQueue[env.stdinCursor];
  env.stdinCursor++;
  return val;
}

function invokeBuiltinReceiverMethod(
  env: ExecEnv,
  receiver: SimValue,
  methodName: string,
  args: SimValue[]
): { handled: boolean; value: SimValue } {
  if (typeof receiver === 'string') {
    if (methodName === 'length') return { handled: true, value: receiver.length };
    if (methodName === 'toUpperCase') return { handled: true, value: receiver.toUpperCase() };
    if (methodName === 'toLowerCase') return { handled: true, value: receiver.toLowerCase() };
    if (methodName === 'trim') return { handled: true, value: receiver.trim() };
    if (methodName === 'equals') return { handled: true, value: receiver === String(args[0] ?? '') };
    if (methodName === 'equalsIgnoreCase') {
      return { handled: true, value: receiver.toLowerCase() === String(args[0] ?? '').toLowerCase() };
    }
    if (methodName === 'contains') return { handled: true, value: receiver.includes(String(args[0] ?? '')) };
    if (methodName === 'startsWith') return { handled: true, value: receiver.startsWith(String(args[0] ?? '')) };
    if (methodName === 'endsWith') return { handled: true, value: receiver.endsWith(String(args[0] ?? '')) };
    if (methodName === 'indexOf') return { handled: true, value: receiver.indexOf(String(args[0] ?? '')) };
    if (methodName === 'replace') {
      return {
        handled: true,
        value: receiver.split(String(args[0] ?? '')).join(String(args[1] ?? '')),
      };
    }
    if (methodName === 'charAt') {
      const idx = Math.trunc(Number(args[0] ?? 0));
      if (idx < 0 || idx >= receiver.length) {
        throw new JavaRuntimeExceptionSignal(
          'IndexOutOfBoundsException',
          `String index out of range: ${idx}`
        );
      }
      return { handled: true, value: receiver[idx] };
    }
    if (methodName === 'substring') {
      return {
        handled: true,
        value:
          args.length === 2
            ? receiver.slice(Number(args[0]), Number(args[1]))
            : receiver.slice(Number(args[0])),
      };
    }
  }

  if (receiver && typeof receiver === 'object' && !Array.isArray(receiver)) {
    if (receiver.__className === 'Scanner') {
      if (methodName === 'nextLine') return { handled: true, value: readNextScannerToken(env, true) };
      if (methodName === 'next') return { handled: true, value: readNextScannerToken(env, false).split(/\s+/)[0] || '' };
      if (methodName === 'nextInt') {
        const raw = readNextScannerToken(env, false).trim();
        const parsed = parseInt(raw, 10);
        return { handled: true, value: Number.isNaN(parsed) ? 0 : parsed };
      }
      if (methodName === 'nextDouble' || methodName === 'nextFloat') {
        const raw = readNextScannerToken(env, false).trim();
        const parsed = parseFloat(raw);
        return { handled: true, value: Number.isNaN(parsed) ? 0.0 : parsed };
      }
      if (methodName === 'nextBoolean') {
        const raw = readNextScannerToken(env, false).trim().toLowerCase();
        return { handled: true, value: raw === 'true' };
      }
      if (methodName === 'hasNext' || methodName === 'hasNextLine' || methodName === 'hasNextInt') {
        return { handled: true, value: env.stdinCursor < env.stdinQueue.length };
      }
      if (methodName === 'close') return { handled: true, value: undefined };
    }

    if (receiver.__className === 'ArrayList' && Array.isArray(receiver.__listItems)) {
      const list = receiver.__listItems;
      if (methodName === 'add') {
        if (args.length === 2 && typeof args[0] === 'number') {
          list.splice(Math.trunc(args[0]), 0, args[1]);
          return { handled: true, value: undefined };
        }
        list.push(args[0]);
        return { handled: true, value: true };
      }
      if (methodName === 'get') {
        const i = Math.trunc(Number(args[0] ?? 0));
        if (i < 0 || i >= list.length) {
          throw new JavaRuntimeExceptionSignal(
            'IndexOutOfBoundsException',
            `Index ${i} out of bounds for length ${list.length}`
          );
        }
        return { handled: true, value: list[i] };
      }
      if (methodName === 'set') {
        const i = Math.trunc(Number(args[0] ?? 0));
        if (i < 0 || i >= list.length) {
          throw new JavaRuntimeExceptionSignal(
            'IndexOutOfBoundsException',
            `Index ${i} out of bounds for length ${list.length}`
          );
        }
        const prev = list[i];
        list[i] = args[1];
        return { handled: true, value: prev };
      }
      if (methodName === 'remove') {
        if (typeof args[0] === 'number' && Number.isInteger(args[0]) && args[0] >= 0 && args[0] < list.length) {
          const [removed] = list.splice(args[0], 1);
          return { handled: true, value: removed };
        }
        const foundIdx = list.findIndex((item) => item === args[0]);
        if (foundIdx >= 0) {
          list.splice(foundIdx, 1);
          return { handled: true, value: true };
        }
        return { handled: true, value: false };
      }
      if (methodName === 'size') return { handled: true, value: list.length };
      if (methodName === 'isEmpty') return { handled: true, value: list.length === 0 };
      if (methodName === 'clear') {
        list.length = 0;
        return { handled: true, value: undefined };
      }
      if (methodName === 'contains') return { handled: true, value: list.includes(args[0]) };
    }

    if (methodName === 'getMessage' && Object.prototype.hasOwnProperty.call(receiver.fields, 'message')) {
      return { handled: true, value: receiver.fields.message };
    }
    if (methodName === 'toString') {
      const custom = findMethodOnClassHierarchy(env.classes, receiver.__className, 'toString', []);
      if (custom) {
        return { handled: true, value: invokeMethod(env, receiver.__className, 'toString', [], receiver) };
      }
      return { handled: true, value: formatJavaValue(receiver) };
    }
  }

  return { handled: false, value: undefined };
}

function findTopLevelTernaryQuestion(expr: string): { qIdx: number; colonIdx: number } | null {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let inStr = false;
  let inChr = false;
  let qIdx = -1;
  let qDepth = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"' && !inChr && expr[i - 1] !== '\\') inStr = !inStr;
    else if (ch === "'" && !inStr && expr[i - 1] !== '\\') inChr = !inChr;
    if (inStr || inChr) continue;

    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (paren === 0 && bracket === 0 && brace === 0) {
      if (ch === '?') {
        if (qIdx === -1) qIdx = i;
        qDepth++;
      } else if (ch === ':' && qIdx !== -1) {
        qDepth--;
        if (qDepth === 0) {
          return { qIdx, colonIdx: i };
        }
      }
    }
  }
  return null;
}

function evalExpr(env: ExecEnv, rawExpr: string): SimValue {
  tickStep(env);
  const expr = rawExpr.trim();
  if (!expr) return undefined;

  if (expr.startsWith('(') && findMatchingDelimiter(expr, 0, '(', ')') === expr.length - 1) {
    return evalExpr(env, expr.slice(1, -1));
  }

  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;
  if (expr === 'this') return env.thisObj;
  if (expr === 'System.in') return 'System.in';
  if (/^-?\d+[lL]?$/.test(expr)) return parseInt(expr, 10);
  if (/^-?\d+\.\d+[fFdD]?$/.test(expr)) return parseFloat(expr);

  if (expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2) {
    let isSingleStr = true;
    for (let i = 1; i < expr.length - 1; i++) {
      if (expr[i] === '"' && expr[i - 1] !== '\\') {
        isSingleStr = false;
        break;
      }
    }
    if (isSingleStr) {
      return expr
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  if (expr.startsWith("'") && expr.endsWith("'") && expr.length >= 3 && expr.length <= 4) {
    return expr
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  if (expr.startsWith('{') && expr.endsWith('}')) {
    const inner = expr.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevelArgs(inner).map((item) => evalExpr(env, item));
  }

  if (expr.startsWith('new ')) {
    const afterNew = expr.slice(4).trim();
    const arrInitMatch = afterNew.match(/^([A-Za-z_]\w*)\s*\[\s*\]\s*(\{[\s\S]*\})$/);
    if (arrInitMatch) {
      return evalExpr(env, arrInitMatch[2]);
    }
    const arrSizeMatch = afterNew.match(/^([A-Za-z_]\w*)\s*\[\s*([^\]]+)\s*\]$/);
    if (arrSizeMatch) {
      const len = Number(evalExpr(env, arrSizeMatch[2]));
      return Array.from({ length: Math.max(0, Math.min(200, len)) }, () =>
        defaultForType(arrSizeMatch[1])
      );
    }
    const openP = afterNew.indexOf('(');
    if (openP > 0 && afterNew.endsWith(')')) {
      const closeP = findMatchingDelimiter(afterNew, openP, '(', ')');
      if (closeP === afterNew.length - 1) {
        const clsName = stripGenericsFromType(afterNew.slice(0, openP));
        const args = splitTopLevelArgs(afterNew.slice(openP + 1, closeP)).map((a) =>
          evalExpr(env, a)
        );
        return instantiateObject(env, clsName, args);
      }
    }
  }

  // Ternary operator: `condition ? exprIfTrue : exprIfFalse`
  const ternary = findTopLevelTernaryQuestion(expr);
  if (ternary) {
    const condVal = Boolean(evalExpr(env, expr.slice(0, ternary.qIdx)));
    return condVal
      ? evalExpr(env, expr.slice(ternary.qIdx + 1, ternary.colonIdx))
      : evalExpr(env, expr.slice(ternary.colonIdx + 1));
  }

  // Binary operators by precedence (lowest to highest)
  const binaryPrecedence: string[][] = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<=', '>=', '<', '>'],
    ['+', '-'],
    ['*', '/', '%'],
  ];

  for (const ops of binaryPrecedence) {
    let paren = 0;
    let bracket = 0;
    let brace = 0;
    let inStr = false;
    let inChr = false;

    for (let i = expr.length - 1; i >= 0; i--) {
      const ch = expr[i];
      if (ch === '"' && !inChr && expr[i - 1] !== '\\') inStr = !inStr;
      else if (ch === "'" && !inStr && expr[i - 1] !== '\\') inChr = !inChr;
      if (inStr || inChr) continue;

      if (ch === ')') paren++;
      else if (ch === '(') paren--;
      else if (ch === ']') bracket++;
      else if (ch === '[') bracket--;
      else if (ch === '}') brace++;
      else if (ch === '{') brace--;

      if (paren !== 0 || bracket !== 0 || brace !== 0) continue;

      for (const op of ops) {
        const start = i - op.length + 1;
        if (start <= 0) continue;
        if (expr.slice(start, start + op.length) !== op) continue;

        if ((op === '<' || op === '>') && expr[start + 1] === '=') continue;
        if (op === '+' && (expr[start - 1] === '+' || expr[start + 1] === '+')) continue;
        if (op === '-' && (expr[start - 1] === '-' || expr[start + 1] === '-')) continue;

        const leftPart = expr.slice(0, start).trim();
        const rightPart = expr.slice(start + op.length).trim();
        if (!leftPart || !rightPart) continue;
        if ((op === '-' || op === '+') && /[+\-*/%&|=<>!,(?:]$/.test(leftPart)) continue;

        const lVal = evalExpr(env, leftPart);
        if (op === '||') return Boolean(lVal) || Boolean(evalExpr(env, rightPart));
        if (op === '&&') return Boolean(lVal) && Boolean(evalExpr(env, rightPart));

        const rVal = evalExpr(env, rightPart);
        switch (op) {
          case '==':
            return lVal === rVal;
          case '!=':
            return lVal !== rVal;
          case '<=':
            return Number(lVal) <= Number(rVal);
          case '>=':
            return Number(lVal) >= Number(rVal);
          case '<':
            return Number(lVal) < Number(rVal);
          case '>':
            return Number(lVal) > Number(rVal);
          case '+':
            if (typeof lVal === 'string' || typeof rVal === 'string') {
              return formatJavaValue(lVal) + formatJavaValue(rVal);
            }
            return Number(lVal) + Number(rVal);
          case '-':
            return Number(lVal) - Number(rVal);
          case '*':
            return Number(lVal) * Number(rVal);
          case '/':
            if (Number(rVal) === 0) {
              throw new JavaRuntimeExceptionSignal('ArithmeticException', '/ by zero');
            }
            if (Number.isInteger(lVal) && Number.isInteger(rVal)) {
              return Math.trunc(Number(lVal) / Number(rVal));
            }
            return Number(lVal) / Number(rVal);
          case '%':
            if (Number(rVal) === 0) {
              throw new JavaRuntimeExceptionSignal('ArithmeticException', '/ by zero');
            }
            return Number(lVal) % Number(rVal);
        }
      }
    }
  }

  // Type cast `(int) expr` or `(double) expr`
  const castMatch = expr.match(/^\(\s*(int|double|float|long|char)\s*\)\s*([\s\S]+)$/);
  if (castMatch) {
    return coerceType(evalExpr(env, castMatch[2]), castMatch[1]);
  }

  if (expr.startsWith('!')) {
    return !Boolean(evalExpr(env, expr.slice(1)));
  }
  if (expr.startsWith('-')) {
    return -Number(evalExpr(env, expr.slice(1)));
  }

  // Postfix / prefix ++ or -- (including ClassName.field++ or obj.field++)
  const postInc = expr.match(/^([A-Za-z_][\w.]*)\s*(\+\+|--)$/);
  if (postInc) {
    const targetName = postInc[1];
    const delta = postInc[2] === '++' ? 1 : -1;
    if (targetName.includes('.')) {
      const dotIdx = targetName.lastIndexOf('.');
      const lhs = targetName.slice(0, dotIdx);
      const prop = targetName.slice(dotIdx + 1);
      if (env.classes.has(lhs)) {
        const sBag = findStaticFieldOwner(env, lhs, prop);
        if (!sBag) throw new Error(`Unknown static field \`${lhs}.${prop}\`.`);
        const oldVal = Number(sBag[prop]);
        sBag[prop] = oldVal + delta;
        return oldVal;
      }
      const obj = evalExpr(env, lhs);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const oldVal = Number(obj.fields[prop]);
        obj.fields[prop] = oldVal + delta;
        return oldVal;
      }
    }
    const found = lookupVar(env, targetName);
    if (!found.found) throw new Error(`Undeclared variable \`${targetName}\`.`);
    const oldVal = Number(found.value);
    assignVar(env, targetName, oldVal + delta);
    return oldVal;
  }

  const preInc = expr.match(/^(\+\+|--)\s*([A-Za-z_]\w*)$/);
  if (preInc) {
    const found = lookupVar(env, preInc[2]);
    if (!found.found) throw new Error(`Undeclared variable \`${preInc[2]}\`.`);
    const nextVal = preInc[1] === '++' ? Number(found.value) + 1 : Number(found.value) - 1;
    assignVar(env, preInc[2], nextVal);
    return nextVal;
  }

  // Math / Integer / Double built-ins
  const mathCall = expr.match(/^(Math|Integer|Double|Arrays)\.([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/);
  if (mathCall) {
    const ns = mathCall[1];
    const fn = mathCall[2];
    const args = splitTopLevelArgs(mathCall[3]).map((a) => evalExpr(env, a));
    if (ns === 'Math') {
      if (fn === 'max') return Math.max(Number(args[0]), Number(args[1]));
      if (fn === 'min') return Math.min(Number(args[0]), Number(args[1]));
      if (fn === 'abs') return Math.abs(Number(args[0]));
      if (fn === 'pow') return Math.pow(Number(args[0]), Number(args[1]));
      if (fn === 'sqrt') return Math.sqrt(Number(args[0]));
      if (fn === 'round') return Math.round(Number(args[0]));
    }
    if (ns === 'Integer' && fn === 'parseInt') {
      const n = parseInt(String(args[0] ?? ''), 10);
      if (Number.isNaN(n)) {
        throw new JavaRuntimeExceptionSignal('IllegalArgumentException', `For input string: "${args[0]}"`);
      }
      return n;
    }
    if (ns === 'Double' && fn === 'parseDouble') {
      const n = parseFloat(String(args[0] ?? ''));
      if (Number.isNaN(n)) {
        throw new JavaRuntimeExceptionSignal('IllegalArgumentException', `For input string: "${args[0]}"`);
      }
      return n;
    }
    if (ns === 'Arrays' && fn === 'toString') {
      return formatJavaValue(args[0]);
    }
  }

  // Array indexing at end: `<target>[<index>]`
  if (expr.endsWith(']')) {
    let openB = -1;
    let bDepth = 0;
    let inS = false;
    let inC = false;
    for (let i = expr.length - 1; i >= 0; i--) {
      const ch = expr[i];
      if (ch === '"' && !inC && expr[i - 1] !== '\\') inS = !inS;
      else if (ch === "'" && !inS && expr[i - 1] !== '\\') inC = !inC;
      if (inS || inC) continue;
      if (ch === ']') bDepth++;
      else if (ch === '[') {
        bDepth--;
        if (bDepth === 0) {
          openB = i;
          break;
        }
      }
    }
    if (openB > 0) {
      const arrExpr = expr.slice(0, openB).trim();
      const idxExpr = expr.slice(openB + 1, -1).trim();
      const arrVal = evalExpr(env, arrExpr);
      if (!Array.isArray(arrVal)) {
        throw new Error(`\`${arrExpr}\` is not a valid array.`);
      }
      const index = Math.trunc(Number(evalExpr(env, idxExpr)));
      if (index < 0 || index >= arrVal.length) {
        throw new JavaRuntimeExceptionSignal(
          'ArrayIndexOutOfBoundsException',
          `Index ${index} out of bounds for length ${arrVal.length}`
        );
      }
      return arrVal[index];
    }
  }

  // Member access or method call via last top-level `.`
  const lastDot = findLastTopLevelDot(expr);
  if (lastDot > 0) {
    const targetExpr = expr.slice(0, lastDot).trim();
    const afterDot = expr.slice(lastDot + 1).trim();

    const callOpenP = afterDot.indexOf('(');
    if (callOpenP > 0 && afterDot.endsWith(')')) {
      const methodName = afterDot.slice(0, callOpenP).trim();
      const args = splitTopLevelArgs(afterDot.slice(callOpenP + 1, -1)).map((a) =>
        evalExpr(env, a)
      );

      if (targetExpr === 'super' && env.currentClass?.superClass) {
        return invokeMethod(env, env.currentClass.superClass, methodName, args, env.thisObj);
      }

      if (env.classes.has(targetExpr)) {
        return invokeMethod(env, targetExpr, methodName, args);
      }

      const receiver = evalExpr(env, targetExpr);
      if (receiver === null || receiver === undefined) {
        throw new JavaRuntimeExceptionSignal(
          'NullPointerException',
          `Cannot invoke \`${methodName}()\` because \`${targetExpr}\` is null`
        );
      }
      const builtin = invokeBuiltinReceiverMethod(env, receiver, methodName, args);
      if (builtin.handled) return builtin.value;

      if (typeof receiver === 'object' && !Array.isArray(receiver)) {
        return invokeMethod(env, receiver.__className, methodName, args, receiver);
      }
    } else if (/^[A-Za-z_]\w*$/.test(afterDot)) {
      if (env.classes.has(targetExpr)) {
        const sBag = findStaticFieldOwner(env, targetExpr, afterDot);
        if (sBag) return sBag[afterDot];
        throw new Error(`Static field \`${afterDot}\` does not exist on class \`${targetExpr}\`.`);
      }
      if (targetExpr === 'super' && env.thisObj) {
        return env.thisObj.fields[afterDot];
      }
      const target = evalExpr(env, targetExpr);
      if (Array.isArray(target) && afterDot === 'length') return target.length;
      if (target && typeof target === 'object' && !Array.isArray(target)) {
        if (Object.prototype.hasOwnProperty.call(target.fields, afterDot)) {
          return target.fields[afterDot];
        }
        throw new Error(`Field \`${afterDot}\` does not exist on \`${target.__className}\`.`);
      }
    }
  }

  // Unqualified method call `add(3, 5)`
  const localOpenP = expr.indexOf('(');
  if (localOpenP > 0 && expr.endsWith(')')) {
    const mName = expr.slice(0, localOpenP).trim();
    if (/^[A-Za-z_]\w*$/.test(mName) && env.currentClass) {
      const args = splitTopLevelArgs(expr.slice(localOpenP + 1, -1)).map((a) =>
        evalExpr(env, a)
      );
      return invokeMethod(env, env.currentClass.name, mName, args, env.thisObj);
    }
  }

  if (/^[A-Za-z_]\w*$/.test(expr)) {
    const found = lookupVar(env, expr);
    if (found.found) return found.value;
    throw new Error(
      `Cannot find symbol \`${expr}\`. Did you declare this variable or spell its name accurately?`
    );
  }

  throw new Error(`Unsupported or malformed expression: \`${expr}\`.`);
}

function executeSimpleStatement(env: ExecEnv, stmtRaw: string): void {
  const stmt = stmtRaw.trim();
  if (!stmt) return;
  tickStep(env);

  if (stmt === 'break') throw new BreakSignal();
  if (stmt === 'continue') throw new ContinueSignal();
  if (stmt === 'return') throw new ReturnSignal(undefined);
  if (stmt.startsWith('return ')) {
    const val = evalExpr(env, stmt.slice(7));
    throw new ReturnSignal(val);
  }

  if (stmt.startsWith('throw ')) {
    const thrown = evalExpr(env, stmt.slice(6));
    if (thrown && typeof thrown === 'object' && !Array.isArray(thrown)) {
      throw new JavaRuntimeExceptionSignal(
        thrown.__className,
        String(thrown.fields.message ?? thrown.__className)
      );
    }
    throw new JavaRuntimeExceptionSignal('RuntimeException', String(thrown ?? 'Exception'));
  }

  const printlnMatch = stmt.match(/^System\.out\.(println|print)\s*\(([\s\S]*)\)$/);
  if (printlnMatch) {
    const isLn = printlnMatch[1] === 'println';
    const inner = printlnMatch[2].trim();
    const text = inner.length === 0 ? '' : formatJavaValue(evalExpr(env, inner));
    if (isLn) {
      const combined = env.currentLineBuffer + text;
      env.currentLineBuffer = '';
      combined.split('\n').forEach((line) => env.outputBuffer.push(line));
    } else {
      env.currentLineBuffer += text;
    }
    return;
  }

  // Variable / Array / Generic Collection declaration
  const eqPos = (() => {
    let p = 0;
    let b = 0;
    let br = 0;
    let inS = false;
    let inC = false;
    for (let i = 0; i < stmt.length; i++) {
      const ch = stmt[i];
      if (ch === '"' && !inC && stmt[i - 1] !== '\\') inS = !inS;
      else if (ch === "'" && !inS && stmt[i - 1] !== '\\') inC = !inC;
      if (inS || inC) continue;
      if (ch === '(') p++;
      else if (ch === ')') p--;
      else if (ch === '[') b++;
      else if (ch === ']') b--;
      else if (ch === '{') br++;
      else if (ch === '}') br--;
      else if (
        ch === '=' &&
        p === 0 &&
        b === 0 &&
        br === 0 &&
        stmt[i - 1] !== '+' &&
        stmt[i - 1] !== '-' &&
        stmt[i - 1] !== '*' &&
        stmt[i - 1] !== '/' &&
        stmt[i - 1] !== '%' &&
        stmt[i - 1] !== '!' &&
        stmt[i - 1] !== '<' &&
        stmt[i - 1] !== '>' &&
        stmt[i + 1] !== '='
      ) {
        return i;
      }
    }
    return -1;
  })();

  const lhsCandidate = stripGenericsFromType(
    (eqPos >= 0 ? stmt.slice(0, eqPos) : stmt).replace(/^final\s+/, '').trim()
  );
  const declMatch = lhsCandidate.match(
    /^([A-Za-z_]\w*(?:\s*\[\s*\])?)\s+([A-Za-z_]\w*(?:\s*\[\s*\])?)$/
  );
  if (declMatch) {
    const rawType = declMatch[1].replace(/\s+/g, '');
    let varName = declMatch[2].trim();
    let isArray = rawType.endsWith('[]');
    if (varName.endsWith('[]')) {
      isArray = true;
      varName = varName.replace(/\[\s*\]$/, '').trim();
    }
    const baseType = rawType.replace(/\[\]$/, '');

    if (isPrimitiveOrKnownType(baseType, env.classes)) {
      const topScope = env.scopes[env.scopes.length - 1];
      if (Object.prototype.hasOwnProperty.call(topScope, varName)) {
        throw new Error(`Variable \`${varName}\` is already defined in this scope.`);
      }
      if (eqPos >= 0) {
        const initRaw = stmt.slice(eqPos + 1).trim();
        const evaluated = evalExpr(env, initRaw);
        topScope[varName] = isArray ? evaluated : coerceType(evaluated, baseType);
      } else {
        topScope[varName] = isArray ? [] : defaultForType(baseType);
      }
      return;
    }
  }

  if (/^([A-Za-z_][\w.]*\s*(\+\+|--)|(\+\+|--)\s*[A-Za-z_]\w*)$/.test(stmt)) {
    evalExpr(env, stmt);
    return;
  }

  // Field assignment `this.name = name`, `ClassName.count += 1`, `arr[0].power = 90`
  const assignMatch = stmt.match(/^([\s\S]+?)\s*(\+=|-=|\*=|\/=|%=|=)\s*([\s\S]+)$/);
  if (assignMatch && !assignMatch[1].includes('(')) {
    const lhsRaw = assignMatch[1].trim();
    const op = assignMatch[2];
    const rhsRaw = assignMatch[3].trim();

    const dotIdx = findLastTopLevelDot(lhsRaw);
    if (dotIdx > 0) {
      const recvExpr = lhsRaw.slice(0, dotIdx).trim();
      const field = lhsRaw.slice(dotIdx + 1).trim();
      const rhs = evalExpr(env, rhsRaw);

      if (env.classes.has(recvExpr)) {
        const sBag = findStaticFieldOwner(env, recvExpr, field);
        if (!sBag) throw new Error(`Static field \`${recvExpr}.${field}\` does not exist.`);
        const cur = sBag[field];
        sBag[field] = computeCompoundAssign(cur, op, rhs);
        return;
      }

      const target = recvExpr === 'this' ? env.thisObj : evalExpr(env, recvExpr);
      if (target && typeof target === 'object' && !Array.isArray(target)) {
        const cur = target.fields[field];
        target.fields[field] = computeCompoundAssign(cur, op, rhs);
        return;
      }
    }

    // Array element assignment `nums[0] = 42`
    const arrAssign = lhsRaw.match(/^([A-Za-z_]\w*)\s*\[\s*([^\]]+)\s*\]$/);
    if (arrAssign) {
      const arrFound = lookupVar(env, arrAssign[1]);
      if (!arrFound.found || !Array.isArray(arrFound.value)) {
        throw new Error(`\`${arrAssign[1]}\` is not an array.`);
      }
      const index = Math.trunc(Number(evalExpr(env, arrAssign[2])));
      if (index < 0 || index >= arrFound.value.length) {
        throw new JavaRuntimeExceptionSignal(
          'ArrayIndexOutOfBoundsException',
          `Index ${index} out of bounds for length ${arrFound.value.length}`
        );
      }
      const rhs = evalExpr(env, rhsRaw);
      arrFound.value[index] = computeCompoundAssign(arrFound.value[index], op, rhs);
      return;
    }

    if (/^[A-Za-z_]\w*$/.test(lhsRaw)) {
      const rhs = evalExpr(env, rhsRaw);
      const current = lookupVar(env, lhsRaw);
      if (!current.found) {
        throw new Error(
          `Cannot assign to \`${lhsRaw}\` before declaring its type (for example: \`int ${lhsRaw} = ...;\`).`
        );
      }
      let nextVal = computeCompoundAssign(current.value, op, rhs);
      if (
        typeof current.value === 'number' &&
        Number.isInteger(current.value) &&
        typeof nextVal === 'number' &&
        Number.isInteger(rhs)
      ) {
        nextVal = Math.trunc(nextVal);
      }
      assignVar(env, lhsRaw, nextVal);
      return;
    }
  }

  evalExpr(env, stmt);
}

function computeCompoundAssign(cur: SimValue, op: string, rhs: SimValue): SimValue {
  if (op === '=') return rhs;
  if (op === '+=') {
    return typeof cur === 'string' || typeof rhs === 'string'
      ? formatJavaValue(cur) + formatJavaValue(rhs)
      : Number(cur) + Number(rhs);
  }
  if (op === '-=') return Number(cur) - Number(rhs);
  if (op === '*=') return Number(cur) * Number(rhs);
  if (op === '/=') {
    if (Number(rhs) === 0) throw new JavaRuntimeExceptionSignal('ArithmeticException', '/ by zero');
    return Number.isInteger(cur) && Number.isInteger(rhs)
      ? Math.trunc(Number(cur) / Number(rhs))
      : Number(cur) / Number(rhs);
  }
  if (op === '%=') return Number(cur) % Number(rhs);
  return rhs;
}

function readNextStatementOrBlock(code: string, startIdx: number): { body: string; nextIdx: number } {
  let i = startIdx;
  while (i < code.length && /\s/.test(code[i])) i++;
  if (code[i] === '{') {
    const close = findMatchingDelimiter(code, i, '{', '}');
    if (close === -1) throw new Error('Missing closing brace `}`.');
    return { body: code.slice(i + 1, close), nextIdx: close + 1 };
  }
  let inStr = false;
  let inChr = false;
  let paren = 0;
  let scan = i;
  while (scan < code.length) {
    const c = code[scan];
    if (c === '"' && !inChr && code[scan - 1] !== '\\') inStr = !inStr;
    else if (c === "'" && !inStr && code[scan - 1] !== '\\') inChr = !inChr;
    if (!inStr && !inChr) {
      if (c === '(') paren++;
      else if (c === ')') paren--;
      else if (c === ';' && paren === 0) {
        return { body: code.slice(i, scan + 1), nextIdx: scan + 1 };
      }
    }
    scan++;
  }
  return { body: code.slice(i), nextIdx: code.length };
}

function doesExceptionMatchCatch(thrownType: string, catchType: string): boolean {
  if (catchType === 'Exception' || catchType === 'Throwable' || catchType === 'RuntimeException') {
    return true;
  }
  if (thrownType === catchType) return true;
  if (
    catchType === 'IndexOutOfBoundsException' &&
    thrownType === 'ArrayIndexOutOfBoundsException'
  ) {
    return true;
  }
  return false;
}

function executeBlock(env: ExecEnv, blockCode: string): void {
  let idx = 0;
  while (idx < blockCode.length) {
    while (idx < blockCode.length && /\s/.test(blockCode[idx])) idx++;
    if (idx >= blockCode.length) break;

    const rest = blockCode.slice(idx);

    if (rest.startsWith('{')) {
      const close = findMatchingDelimiter(blockCode, idx, '{', '}');
      if (close === -1) throw new Error('Missing closing `}`.');
      env.scopes.push({});
      try {
        executeBlock(env, blockCode.slice(idx + 1, close));
      } finally {
        env.scopes.pop();
      }
      idx = close + 1;
      continue;
    }

    // `try { ... } catch (...) { ... } finally { ... }`
    const tryMatch = rest.match(/^try\s*\{/);
    if (tryMatch) {
      const tryOpen = idx + tryMatch[0].length - 1;
      const tryClose = findMatchingDelimiter(blockCode, tryOpen, '{', '}');
      if (tryClose === -1) throw new Error('Missing closing `}` on `try` block.');
      const tryBody = blockCode.slice(tryOpen + 1, tryClose);

      let cursor = tryClose + 1;
      const catches: { exType: string; exVar: string; body: string }[] = [];
      let finallyBody: string | null = null;

      while (cursor < blockCode.length) {
        while (cursor < blockCode.length && /\s/.test(blockCode[cursor])) cursor++;
        const afterTry = blockCode.slice(cursor);
        const catchMatch = afterTry.match(/^catch\s*\(/);
        if (catchMatch) {
          const cOpenP = cursor + catchMatch[0].length - 1;
          const cCloseP = findMatchingDelimiter(blockCode, cOpenP, '(', ')');
          const paramTokens = blockCode
            .slice(cOpenP + 1, cCloseP)
            .trim()
            .split(/\s+/);
          const exVar = paramTokens[paramTokens.length - 1] || 'e';
          const exType = paramTokens[0] || 'Exception';
          const cBody = readNextStatementOrBlock(blockCode, cCloseP + 1);
          catches.push({ exType, exVar, body: cBody.body });
          cursor = cBody.nextIdx;
          continue;
        }
        const finMatch = afterTry.match(/^finally\s*\{/);
        if (finMatch) {
          const fOpen = cursor + finMatch[0].length - 1;
          const fClose = findMatchingDelimiter(blockCode, fOpen, '{', '}');
          finallyBody = blockCode.slice(fOpen + 1, fClose);
          cursor = fClose + 1;
        }
        break;
      }

      try {
        env.scopes.push({});
        try {
          executeBlock(env, tryBody);
        } finally {
          env.scopes.pop();
        }
      } catch (err) {
        if (err instanceof JavaRuntimeExceptionSignal) {
          const handler = catches.find((c) => doesExceptionMatchCatch(err.exceptionType, c.exType));
          if (handler) {
            const exObj: SimObject = {
              __className: err.exceptionType,
              fields: { message: err.message },
            };
            env.scopes.push({ [handler.exVar]: exObj });
            try {
              executeBlock(env, handler.body);
            } finally {
              env.scopes.pop();
            }
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      } finally {
        if (finallyBody !== null) {
          env.scopes.push({});
          try {
            executeBlock(env, finallyBody);
          } finally {
            env.scopes.pop();
          }
        }
      }

      idx = cursor;
      continue;
    }

    const ifMatch = rest.match(/^if\s*\(/);
    if (ifMatch) {
      const openP = idx + ifMatch[0].length - 1;
      const closeP = findMatchingDelimiter(blockCode, openP, '(', ')');
      if (closeP === -1) throw new Error('Unclosed `if (` condition.');
      const condExpr = blockCode.slice(openP + 1, closeP);
      const thenBranch = readNextStatementOrBlock(blockCode, closeP + 1);
      let cursor = thenBranch.nextIdx;

      const branches: { cond?: string; body: string }[] = [{ cond: condExpr, body: thenBranch.body }];

      while (cursor < blockCode.length) {
        let ws = cursor;
        while (ws < blockCode.length && /\s/.test(blockCode[ws])) ws++;
        const afterIf = blockCode.slice(ws);
        const elseIfMatch = afterIf.match(/^else\s+if\s*\(/);
        if (elseIfMatch) {
          const eOpenP = ws + elseIfMatch[0].length - 1;
          const eCloseP = findMatchingDelimiter(blockCode, eOpenP, '(', ')');
          if (eCloseP === -1) throw new Error('Unclosed `else if (` condition.');
          const eCond = blockCode.slice(eOpenP + 1, eCloseP);
          const eBody = readNextStatementOrBlock(blockCode, eCloseP + 1);
          branches.push({ cond: eCond, body: eBody.body });
          cursor = eBody.nextIdx;
          continue;
        }
        const elseMatch = afterIf.match(/^else(?![A-Za-z0-9_])/);
        if (elseMatch) {
          const eBody = readNextStatementOrBlock(blockCode, ws + elseMatch[0].length);
          branches.push({ body: eBody.body });
          cursor = eBody.nextIdx;
        }
        break;
      }

      for (const b of branches) {
        if (b.cond === undefined || Boolean(evalExpr(env, b.cond))) {
          env.scopes.push({});
          try {
            executeBlock(env, b.body);
          } finally {
            env.scopes.pop();
          }
          break;
        }
      }
      idx = cursor;
      continue;
    }

    const forMatch = rest.match(/^for\s*\(/);
    if (forMatch) {
      const openP = idx + forMatch[0].length - 1;
      const closeP = findMatchingDelimiter(blockCode, openP, '(', ')');
      if (closeP === -1) throw new Error('Unclosed `for (` header.');
      const headerContent = blockCode.slice(openP + 1, closeP);
      const bodyPart = readNextStatementOrBlock(blockCode, closeP + 1);

      if (headerContent.includes(':') && !headerContent.includes(';')) {
        const colonIdx = headerContent.indexOf(':');
        const lhs = stripGenericsFromType(headerContent.slice(0, colonIdx).trim());
        const rhs = headerContent.slice(colonIdx + 1).trim();
        const lhsParts = lhs.replace(/^final\s+/, '').split(/\s+/);
        const itemVar = lhsParts[lhsParts.length - 1];
        const itemType = lhsParts.slice(0, -1).join(' ');
        const iterableVal = evalExpr(env, rhs);
        let items: SimValue[];
        if (Array.isArray(iterableVal)) {
          items = iterableVal;
        } else if (
          iterableVal &&
          typeof iterableVal === 'object' &&
          iterableVal.__className === 'ArrayList' &&
          Array.isArray(iterableVal.__listItems)
        ) {
          items = [...iterableVal.__listItems];
        } else {
          throw new Error(`Enhanced for-loop requires an array or ArrayList, got \`${rhs}\`.`);
        }

        for (const item of items) {
          tickStep(env);
          env.scopes.push({ [itemVar]: coerceType(item, itemType) });
          let broke = false;
          try {
            executeBlock(env, bodyPart.body);
          } catch (sig) {
            if (sig instanceof BreakSignal) {
              broke = true;
            } else if (sig instanceof ContinueSignal) {
              // continue next item
            } else {
              throw sig;
            }
          } finally {
            env.scopes.pop();
          }
          if (broke) break;
        }
      } else {
        const parts = splitTopLevelArgs(headerContent, ';');
        const initStmt = parts[0] ?? '';
        const condStmt = parts[1] ?? 'true';
        const stepStmt = parts[2] ?? '';

        env.scopes.push({});
        try {
          if (initStmt) executeSimpleStatement(env, initStmt);
          while (condStmt === '' || Boolean(evalExpr(env, condStmt))) {
            tickStep(env);
            env.scopes.push({});
            let broke = false;
            try {
              executeBlock(env, bodyPart.body);
            } catch (sig) {
              if (sig instanceof BreakSignal) broke = true;
              else if (sig instanceof ContinueSignal) {
                // proceed to stepStmt
              } else {
                throw sig;
              }
            } finally {
              env.scopes.pop();
            }
            if (broke) break;
            if (stepStmt) executeSimpleStatement(env, stepStmt);
          }
        } finally {
          env.scopes.pop();
        }
      }
      idx = bodyPart.nextIdx;
      continue;
    }

    const whileMatch = rest.match(/^while\s*\(/);
    if (whileMatch) {
      const openP = idx + whileMatch[0].length - 1;
      const closeP = findMatchingDelimiter(blockCode, openP, '(', ')');
      if (closeP === -1) throw new Error('Unclosed `while (` condition.');
      const condExpr = blockCode.slice(openP + 1, closeP);
      const bodyPart = readNextStatementOrBlock(blockCode, closeP + 1);

      while (Boolean(evalExpr(env, condExpr))) {
        tickStep(env);
        env.scopes.push({});
        let broke = false;
        try {
          executeBlock(env, bodyPart.body);
        } catch (sig) {
          if (sig instanceof BreakSignal) broke = true;
          else if (sig instanceof ContinueSignal) {
            // continue loop
          } else {
            throw sig;
          }
        } finally {
          env.scopes.pop();
        }
        if (broke) break;
      }
      idx = bodyPart.nextIdx;
      continue;
    }

    const doMatch = rest.match(/^do(?![A-Za-z0-9_])/);
    if (doMatch) {
      const bodyPart = readNextStatementOrBlock(blockCode, idx + 2);
      const afterDo = blockCode.slice(bodyPart.nextIdx);
      const wMatch = afterDo.match(/^\s*while\s*\(/);
      if (!wMatch) throw new Error('`do` loop is missing its `while (...);` condition at the end.');
      const wOpenP = bodyPart.nextIdx + wMatch[0].length - 1;
      const wCloseP = findMatchingDelimiter(blockCode, wOpenP, '(', ')');
      const condExpr = blockCode.slice(wOpenP + 1, wCloseP);
      let semiIdx = wCloseP + 1;
      while (semiIdx < blockCode.length && /\s/.test(blockCode[semiIdx])) semiIdx++;
      if (blockCode[semiIdx] === ';') semiIdx++;

      do {
        tickStep(env);
        env.scopes.push({});
        let broke = false;
        try {
          executeBlock(env, bodyPart.body);
        } catch (sig) {
          if (sig instanceof BreakSignal) broke = true;
          else if (sig instanceof ContinueSignal) {
            // continue to while check
          } else {
            throw sig;
          }
        } finally {
          env.scopes.pop();
        }
        if (broke) break;
      } while (Boolean(evalExpr(env, condExpr)));

      idx = semiIdx;
      continue;
    }

    const switchMatch = rest.match(/^switch\s*\(/);
    if (switchMatch) {
      const openP = idx + switchMatch[0].length - 1;
      const closeP = findMatchingDelimiter(blockCode, openP, '(', ')');
      const switchVal = evalExpr(env, blockCode.slice(openP + 1, closeP));
      let braceStart = closeP + 1;
      while (braceStart < blockCode.length && /\s/.test(blockCode[braceStart])) braceStart++;
      const braceEnd = findMatchingDelimiter(blockCode, braceStart, '{', '}');
      const switchInner = blockCode.slice(braceStart + 1, braceEnd);

      const caseRegex = /(?:case\s+([^:]+)|default)\s*:/g;
      const markers: { isDefault: boolean; expr?: string; labelStart: number; bodyStart: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = caseRegex.exec(switchInner)) !== null) {
        markers.push({
          isDefault: m[1] === undefined,
          expr: m[1]?.trim(),
          labelStart: m.index,
          bodyStart: m.index + m[0].length,
        });
      }

      let startCaseIdx = markers.findIndex(
        (mk) => !mk.isDefault && mk.expr && evalExpr(env, mk.expr) === switchVal
      );
      if (startCaseIdx === -1) {
        startCaseIdx = markers.findIndex((mk) => mk.isDefault);
      }

      if (startCaseIdx !== -1) {
        env.scopes.push({});
        try {
          for (let cIdx = startCaseIdx; cIdx < markers.length; cIdx++) {
            const sliceEnd = cIdx + 1 < markers.length ? markers[cIdx + 1].labelStart : switchInner.length;
            const caseBody = switchInner.slice(markers[cIdx].bodyStart, sliceEnd);
            executeBlock(env, caseBody);
          }
        } catch (sig) {
          if (!(sig instanceof BreakSignal)) throw sig;
        } finally {
          env.scopes.pop();
        }
      }

      idx = braceEnd + 1;
      continue;
    }

    let scan = idx;
    let inS = false;
    let inC = false;
    let pDepth = 0;
    let bDepth = 0;
    while (scan < blockCode.length) {
      const ch = blockCode[scan];
      if (ch === '"' && !inC && blockCode[scan - 1] !== '\\') inS = !inS;
      else if (ch === "'" && !inS && blockCode[scan - 1] !== '\\') inC = !inC;
      if (!inS && !inC) {
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth--;
        else if (ch === '{') bDepth++;
        else if (ch === '}') bDepth--;
        else if (ch === ';' && pDepth === 0 && bDepth === 0) break;
      }
      scan++;
    }

    const stmtText = blockCode.slice(idx, scan).trim();
    if (stmtText) {
      executeSimpleStatement(env, stmtText);
    }
    idx = scan + 1;
  }
}

export function runJavaSimulator(
  sourceCode: string,
  simulatedStdin?: string[]
): JavaExecutionResult {
  if (!sourceCode.trim()) {
    return {
      success: false,
      outputLines: [],
      rawOutput: '',
      errorLine: 1,
      errorTitle: 'Empty Program',
      friendlyErrorExplanation:
        'Your editor is empty. Type or restore the starter Java code and click Run!',
    };
  }

  const preflight = preflightDiagnostics(sourceCode);
  if (preflight) {
    return {
      success: false,
      outputLines: [],
      rawOutput: '',
      errorLine: preflight.line,
      errorTitle: preflight.title,
      friendlyErrorExplanation: preflight.message,
    };
  }

  try {
    const cleanCode = stripCommentsPreserveLines(sourceCode);
    const { classes, standaloneBody } = parseClassesAndMembers(cleanCode);

    const staticFields = new Map<string, Record<string, SimValue>>();
    const env: ExecEnv = {
      scopes: [{}],
      classes,
      staticFields,
      stdinQueue: simulatedStdin && simulatedStdin.length > 0 ? [...simulatedStdin] : ['Aria', '12'],
      stdinCursor: 0,
      outputBuffer: [],
      currentLineBuffer: '',
      stepCount: 0,
      maxSteps: 1200,
    };

    // Initialize static fields for all parsed classes
    for (const cls of classes.values()) {
      const bag: Record<string, SimValue> = {};
      staticFields.set(cls.name, bag);
      env.currentClass = cls;
      for (const f of cls.fields) {
        if (f.isStatic) {
          bag[f.name] = f.initExpr
            ? coerceType(evalExpr(env, f.initExpr), f.type)
            : defaultForType(f.type);
        }
      }
    }

    if (standaloneBody !== null) {
      executeBlock(env, standaloneBody);
    } else {
      let entryClass: ParsedClass | undefined;
      let mainMethod: ParsedMethod | undefined;
      for (const cls of classes.values()) {
        const m = cls.methods.find((method) => method.name === 'main');
        if (m) {
          entryClass = cls;
          mainMethod = m;
          break;
        }
      }
      if (!entryClass || !mainMethod) {
        return {
          success: false,
          outputLines: [],
          rawOutput: '',
          errorLine: 1,
          errorTitle: 'Missing `main` Entry Method',
          friendlyErrorExplanation:
            'Every runnable Java program needs a `public static void main(String[] args)` method so Java knows where to start running.',
        };
      }
      env.currentClass = entryClass;
      try {
        executeBlock(env, mainMethod.body);
      } catch (sig) {
        if (!(sig instanceof ReturnSignal)) throw sig;
      }
    }

    if (env.currentLineBuffer.length > 0) {
      env.outputBuffer.push(env.currentLineBuffer);
    }

    return {
      success: true,
      outputLines: env.outputBuffer,
      rawOutput: env.outputBuffer.join('\n'),
    };
  } catch (err) {
    if (err instanceof JavaRuntimeExceptionSignal) {
      return {
        success: false,
        outputLines: [],
        rawOutput: '',
        errorTitle: `Uncaught ${err.exceptionType}`,
        friendlyErrorExplanation: `${err.exceptionType}: ${err.message}. Handle this case or wrap risky code in a \`try / catch\` block.`,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      outputLines: [],
      rawOutput: '',
      errorTitle: 'Java Execution Error',
      friendlyErrorExplanation: msg,
    };
  }
}

export function evaluateJavaSubmission(
  sourceCode: string,
  spec: CodeValidationSpec,
  cliCommandInput?: string
): JavaEvaluationFeedback {
  const execution = runJavaSimulator(sourceCode, spec.simulatedStdin);

  if (!execution.success) {
    return {
      passed: false,
      execution,
      headline: execution.errorTitle || 'Fix the Code Error First',
      explanation:
        execution.friendlyErrorExplanation ||
        'Your code encountered an error before finishing. Check the line number and syntax carefully.',
    };
  }

  const cleanCode = stripCommentsPreserveLines(sourceCode);

  if (spec.forbiddenPatterns) {
    for (const rule of spec.forbiddenPatterns) {
      if (rule.regex.test(cleanCode)) {
        return {
          passed: false,
          execution,
          headline: 'Shortcut Detected — Use the Java Concept!',
          explanation: rule.message,
        };
      }
    }
  }

  if (spec.requiredRawPatterns) {
    for (const req of spec.requiredRawPatterns) {
      if (!req.regex.test(sourceCode)) {
        return {
          passed: false,
          execution,
          headline: 'Missing Required Java Comment or Syntax',
          explanation: req.message,
        };
      }
    }
  }

  if (spec.requiredPatterns) {
    for (const req of spec.requiredPatterns) {
      if (!req.regex.test(cleanCode)) {
        return {
          passed: false,
          execution,
          headline: 'Almost There — Missing Required Java Construct',
          explanation: req.message,
        };
      }
    }
  }

  if (spec.requireExactPrintCount !== undefined) {
    const printCalls = (cleanCode.match(/System\.out\.print(ln)?\s*\(/g) || []).length;
    if (printCalls > spec.requireExactPrintCount) {
      return {
        passed: false,
        execution,
        headline: 'Too Many Manual Print Statements',
        explanation: `You used ${printCalls} print statements, but this challenge requires at most ${spec.requireExactPrintCount} (let your loop or method do the repetition!).`,
      };
    }
  }

  if (spec.expectedOutputLines) {
    const actualTrimmed = execution.outputLines.map((l) => l.trim());
    const expectedTrimmed = spec.expectedOutputLines.map((l) => l.trim());

    if (actualTrimmed.length === 0) {
      return {
        passed: false,
        execution,
        headline: 'No Console Output Produced',
        explanation: `Your code ran without errors, but it didn't print anything. Expected output: "${expectedTrimmed.join(', ')}". Use \`System.out.println(...);\`!`,
      };
    }

    const matchesExact =
      actualTrimmed.length === expectedTrimmed.length &&
      actualTrimmed.every((line, i) => line === expectedTrimmed[i]);

    if (!matchesExact) {
      return {
        passed: false,
        execution,
        headline: 'Output Does Not Match Expected Result Yet',
        explanation: `Your program printed "${actualTrimmed.join(' | ')}", whereas the target output is "${expectedTrimmed.join(' | ')}". Check exact spelling, capitalization, and numbers!`,
        highlightSnippet: expectedTrimmed.join('\n'),
      };
    }
  }

  if (spec.expectedOutputContains) {
    const fullLower = execution.rawOutput.toLowerCase();
    for (const needle of spec.expectedOutputContains) {
      if (!fullLower.includes(needle.toLowerCase())) {
        return {
          passed: false,
          execution,
          headline: 'Output Missing Required Information',
          explanation: `Your output ("${execution.rawOutput || 'empty'}") did not include "${needle}". Double-check what your program prints!`,
        };
      }
    }
  }

  if (spec.cliCommandSpec) {
    const normalizedCmd = (cliCommandInput ?? '').trim().replace(/\s+/g, ' ');
    if (!normalizedCmd) {
      return {
        passed: false,
        execution,
        headline: 'Enter the JDK / JVM Terminal Command',
        explanation: `Main.java is ready! Now type the required command in the "${spec.cliCommandSpec.promptLabel}" bar below the code editor before running.`,
      };
    }

    if (spec.cliCommandSpec.wrongCommandHints) {
      for (const wrong of spec.cliCommandSpec.wrongCommandHints) {
        if (wrong.pattern.test(normalizedCmd)) {
          return {
            passed: false,
            execution,
            headline: 'Check Your JDK vs JVM Command',
            explanation: wrong.message,
          };
        }
      }
    }

    if (normalizedCmd !== spec.cliCommandSpec.expectedCommand) {
      return {
        passed: false,
        execution,
        headline: 'Terminal Command Does Not Match',
        explanation: `You entered "${normalizedCmd}". Remember: use javac with the .java source filename to compile, and use java with the class name (no .class extension) to run on the JVM.`,
      };
    }

    const isCompileCmd = normalizedCmd.startsWith('javac ');
    return {
      passed: true,
      execution: isCompileCmd
        ? {
            ...execution,
            outputLines: [
              `$ ${normalizedCmd}`,
              '[javac] Compiling Main.java -> Main.class (Bytecode verified)',
              ...execution.outputLines,
            ],
          }
        : {
            ...execution,
            outputLines: [`$ ${normalizedCmd}`, ...execution.outputLines],
          },
      headline: isCompileCmd
        ? 'Bytecode Compiled Successfully (Main.class)!'
        : 'JVM Execution Succeeded!',
      explanation: isCompileCmd
        ? 'javac translated Main.java into platform-independent Main.class bytecode and triggered the 3D builder crew!'
        : 'The JVM loaded Main.class and executed your program cleanly!',
    };
  }

  return {
    passed: true,
    execution,
    headline: 'Excellent Java Code!',
    explanation:
      'Your Java program compiled cleanly in the simulator and produced the exact expected behaviour.',
  };
}

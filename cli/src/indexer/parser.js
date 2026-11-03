import fs from 'node:fs';
import path from 'node:path';

/**
 * Universal multi-language structural parser
 * Extracts: imports, exports, symbols (functions, classes, types, routes), calls, and signatures
 */
export function parseSourceFile(fileInfo) {
  let content = '';
  try {
    content = fs.readFileSync(fileInfo.fullPath, 'utf-8');
  } catch (err) {
    return {
      path: fileInfo.path,
      symbols: [],
      imports: [],
      exports: [],
      calls: [],
      linesOfCode: 0,
      summary: '',
      error: err.message,
    };
  }

  const lines = content.split('\n');
  const linesOfCode = lines.length;

  let parsed = {
    path: fileInfo.path,
    language: fileInfo.language,
    linesOfCode,
    sizeBytes: fileInfo.sizeBytes,
    isSensitive: fileInfo.isSensitive,
    imports: [],
    exports: [],
    symbols: [],
    calls: new Set(),
  };

  switch (fileInfo.language) {
    case 'javascript':
    case 'javascript-react':
    case 'typescript':
    case 'typescript-react':
      parsed = parseJavaScriptFamily(content, lines, parsed, fileInfo);
      break;
    case 'python':
      parsed = parsePython(content, lines, parsed, fileInfo);
      break;
    case 'java':
      parsed = parseJava(content, lines, parsed, fileInfo);
      break;
    case 'go':
      parsed = parseGo(content, lines, parsed, fileInfo);
      break;
    case 'rust':
      parsed = parseRust(content, lines, parsed, fileInfo);
      break;
    default:
      break;
  }

  // Convert calls set to array
  parsed.calls = Array.from(parsed.calls);

  // Generate heuristic summary for the file
  parsed.summary = generateFileSummary(parsed);

  return parsed;
}

/**
 * JavaScript, TypeScript, React, Next.js parser
 */
function parseJavaScriptFamily(content, lines, data, fileInfo) {
  // 1. Imports
  const importRegex = /(?:import\s+(?:([\w*\s{},]+)\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const symbolsRaw = match[1];
    const source = match[2] || match[3];
    if (source) {
      const importedNames = symbolsRaw
        ? symbolsRaw
            .replace(/[{}]/g, '')
            .split(',')
            .map((s) => s.trim().split(/\s+as\s+/)[0])
            .filter(Boolean)
        : [];
      data.imports.push({ source, symbols: importedNames });
    }
  }

  // 2. Exports
  const exportNamedRegex = /export\s+(?:default\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = exportNamedRegex.exec(content)) !== null) {
    data.exports.push(match[1]);
  }
  if (/export\s+default\b/.test(content) && !data.exports.includes('default')) {
    data.exports.push('default');
  }

  // 3. Next.js Routes / Pages detection
  const isNextPage = fileInfo.path.includes('/pages/') || fileInfo.path.includes('/app/') || fileInfo.name.match(/^(page|route|layout)\.[jt]sx?$/);
  if (isNextPage) {
    data.symbols.push({
      name: fileInfo.name.replace(/\.[jt]sx?$/, ''),
      kind: 'next-route',
      line: 1,
      signature: `Next.js route: ${fileInfo.path}`,
      exported: true,
    });
  }

  // 4. Function & Class Declarations
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Standard function declaration
    const fnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const isExported = trimmed.startsWith('export');
      data.symbols.push({
        name: fnMatch[1],
        kind: /^[A-Z]/.test(fnMatch[1]) ? 'component' : 'function',
        line: lineNum,
        signature: `${fnMatch[1]}(${fnMatch[2].trim()})`,
        exported: isExported,
      });
      return;
    }

    // Arrow function or const function / hook
    const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
    if (arrowMatch) {
      const name = arrowMatch[1];
      const isHook = name.startsWith('use');
      const isComponent = /^[A-Z]/.test(name);
      data.symbols.push({
        name,
        kind: isHook ? 'hook' : isComponent ? 'component' : 'function',
        line: lineNum,
        signature: `${name} = (...) => ...`,
        exported: trimmed.startsWith('export'),
      });
      return;
    }

    // Class declaration
    const classMatch = trimmed.match(/^(?:export\s+)?class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$]+))?/);
    if (classMatch) {
      data.symbols.push({
        name: classMatch[1],
        kind: 'class',
        line: lineNum,
        signature: classMatch[2] ? `class ${classMatch[1]} extends ${classMatch[2]}` : `class ${classMatch[1]}`,
        exported: trimmed.startsWith('export'),
      });
      return;
    }

    // TypeScript interface or type
    const tsTypeMatch = trimmed.match(/^(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/);
    if (tsTypeMatch) {
      data.symbols.push({
        name: tsTypeMatch[1],
        kind: 'type',
        line: lineNum,
        signature: tsTypeMatch[0],
        exported: trimmed.startsWith('export'),
      });
    }
  });

  // 5. Calls / Invocations
  const callRegex = /\b([a-zA-Z0-9_$]{2,})\s*\(/g;
  while ((match = callRegex.exec(content)) !== null) {
    const callName = match[1];
    if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'import', 'require', 'typeof', 'sizeof'].includes(callName)) {
      data.calls.add(callName);
    }
  }

  return data;
}

/**
 * Python parser
 */
function parsePython(content, lines, data, fileInfo) {
  // 1. Imports
  const importRegex = /^(?:from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_,\s*]+)|import\s+([a-zA-Z0-9_.,\s]+))/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      const symbols = match[2].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
      data.imports.push({ source: match[1], symbols });
    } else if (match[3]) {
      const modules = match[3].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
      modules.forEach((mod) => data.imports.push({ source: mod, symbols: [] }));
    }
  }

  // 2. Classes and Functions
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?:/);
    if (classMatch) {
      data.symbols.push({
        name: classMatch[1],
        kind: 'class',
        line: lineNum,
        signature: classMatch[2] ? `class ${classMatch[1]}(${classMatch[2]})` : `class ${classMatch[1]}`,
        exported: !classMatch[1].startsWith('_'),
      });
      return;
    }

    const defMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (defMatch) {
      data.symbols.push({
        name: defMatch[1],
        kind: defMatch[1].startsWith('__') ? 'special-method' : 'function',
        line: lineNum,
        signature: `def ${defMatch[1]}(${defMatch[2].trim()})`,
        exported: !defMatch[1].startsWith('_'),
      });
    }
  });

  // 3. Calls
  const callRegex = /\b([a-zA-Z0-9_]{2,})\s*\(/g;
  while ((match = callRegex.exec(content)) !== null) {
    const callName = match[1];
    if (!['if', 'for', 'while', 'def', 'class', 'with', 'return', 'print', 'super', 'len', 'range', 'isinstance'].includes(callName)) {
      data.calls.add(callName);
    }
  }

  return data;
}

/**
 * Java parser
 */
function parseJava(content, lines, data, fileInfo) {
  // 1. Package and Imports
  const packageMatch = content.match(/^package\s+([a-zA-Z0-9_.]+);/m);
  const pkg = packageMatch ? packageMatch[1] : '';

  const importRegex = /^import\s+(?:static\s+)?([a-zA-Z0-9_.]+);/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const fullImport = match[1];
    const parts = fullImport.split('.');
    const symbol = parts[parts.length - 1];
    data.imports.push({ source: fullImport, symbols: symbol !== '*' ? [symbol] : [] });
  }

  // 2. Class, Interface, Enum, Record, Methods
  let currentClass = '';
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Type definition (class, interface, enum, record)
    const typeMatch = trimmed.match(/(?:public|protected|private)?\s*(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(class|interface|enum|record)\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_]+))?(?:\s+implements\s+([a-zA-Z0-9_,\s]+))?/);
    if (typeMatch) {
      currentClass = typeMatch[2];
      data.symbols.push({
        name: typeMatch[2],
        kind: typeMatch[1],
        line: lineNum,
        signature: trimmed.replace(/\{.*/, '').trim(),
        package: pkg,
        exported: true,
      });
      data.exports.push(typeMatch[2]);
      return;
    }

    // Spring controller endpoints detection
    if (trimmed.match(/@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*\(([^)]*)\)/)) {
      data.symbols.push({
        name: `${currentClass || 'API'} Endpoint (L${lineNum})`,
        kind: 'endpoint',
        line: lineNum,
        signature: trimmed,
        exported: true,
      });
      return;
    }

    // Method declaration
    const methodMatch = trimmed.match(/(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?([a-zA-Z0-9_<>[\]]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[a-zA-Z0-9_,\s]+)?\s*\{?/);
    if (methodMatch && !trimmed.startsWith('new ') && !['if', 'while', 'for', 'switch'].includes(methodMatch[2])) {
      const methodName = methodMatch[2];
      data.symbols.push({
        name: currentClass ? `${currentClass}.${methodName}` : methodName,
        shortName: methodName,
        kind: 'method',
        line: lineNum,
        signature: `${methodMatch[1]} ${methodName}(${methodMatch[3].trim()})`,
        exported: trimmed.startsWith('public') || trimmed.startsWith('protected'),
      });
    }
  });

  // 3. Calls
  const callRegex = /\b([a-zA-Z0-9_]{2,})\s*\(/g;
  while ((match = callRegex.exec(content)) !== null) {
    const callName = match[1];
    if (!['if', 'for', 'while', 'switch', 'catch', 'new', 'super', 'this'].includes(callName)) {
      data.calls.add(callName);
    }
  }

  return data;
}

/**
 * Go parser
 */
function parseGo(content, lines, data, fileInfo) {
  // 1. Imports
  const importSingleRegex = /^import\s+"([^"]+)"/gm;
  let match;
  while ((match = importSingleRegex.exec(content)) !== null) {
    data.imports.push({ source: match[1], symbols: [] });
  }

  const importBlockRegex = /import\s*\(([\s\S]*?)\)/g;
  while ((match = importBlockRegex.exec(content)) !== null) {
    const lines = match[1].split('\n');
    lines.forEach((l) => {
      const clean = l.replace(/"/g, '').trim();
      if (clean) data.imports.push({ source: clean, symbols: [] });
    });
  }

  // 2. Structs, Interfaces, Functions
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Functions and methods
    const fnMatch = trimmed.match(/^func\s+(?:\(([^)]+)\)\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const receiver = fnMatch[1];
      const fnName = fnMatch[2];
      const isExported = /^[A-Z]/.test(fnName);
      data.symbols.push({
        name: receiver ? `${receiver.split(/\s+/).pop()}.${fnName}` : fnName,
        kind: receiver ? 'method' : 'function',
        line: lineNum,
        signature: trimmed.replace(/\{.*/, '').trim(),
        exported: isExported,
      });
      if (isExported) data.exports.push(fnName);
      return;
    }

    // Type struct/interface
    const typeMatch = trimmed.match(/^type\s+([a-zA-Z0-9_]+)\s+(struct|interface)/);
    if (typeMatch) {
      const typeName = typeMatch[1];
      const isExported = /^[A-Z]/.test(typeName);
      data.symbols.push({
        name: typeName,
        kind: typeMatch[2],
        line: lineNum,
        signature: `type ${typeName} ${typeMatch[2]}`,
        exported: isExported,
      });
      if (isExported) data.exports.push(typeName);
    }
  });

  // 3. Calls
  const callRegex = /\b([a-zA-Z0-9_]{2,})\s*\(/g;
  while ((match = callRegex.exec(content)) !== null) {
    const callName = match[1];
    if (!['if', 'for', 'switch', 'func', 'return', 'make', 'new', 'append', 'len', 'panic', 'recover'].includes(callName)) {
      data.calls.add(callName);
    }
  }

  return data;
}

/**
 * Rust parser
 */
function parseRust(content, lines, data, fileInfo) {
  // 1. Uses / Imports
  const useRegex = /^use\s+([^;]+);/gm;
  let match;
  while ((match = useRegex.exec(content)) !== null) {
    const raw = match[1].trim();
    data.imports.push({ source: raw, symbols: [] });
  }

  // 2. Struct, Enum, Trait, Functions
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Functions
    const fnMatch = trimmed.match(/^(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      data.symbols.push({
        name: fnName,
        kind: 'function',
        line: lineNum,
        signature: trimmed.replace(/\{.*/, '').trim(),
        exported: trimmed.startsWith('pub'),
      });
      if (trimmed.startsWith('pub')) data.exports.push(fnName);
      return;
    }

    // Struct, Enum, Trait
    const typeMatch = trimmed.match(/^(?:pub(?:\([^)]+\))?\s+)?(struct|enum|trait)\s+([a-zA-Z0-9_]+)/);
    if (typeMatch) {
      const typeName = typeMatch[2];
      data.symbols.push({
        name: typeName,
        kind: typeMatch[1],
        line: lineNum,
        signature: `${typeMatch[1]} ${typeName}`,
        exported: trimmed.startsWith('pub'),
      });
      if (trimmed.startsWith('pub')) data.exports.push(typeName);
    }
  });

  // 3. Calls
  const callRegex = /\b([a-zA-Z0-9_]{2,})\s*\(/g;
  while ((match = callRegex.exec(content)) !== null) {
    const callName = match[1];
    if (!['if', 'for', 'while', 'match', 'loop', 'fn', 'let', 'mut', 'return', 'println', 'vec'].includes(callName)) {
      data.calls.add(callName);
    }
  }

  return data;
}

/**
 * Generates heuristic structural summary for a file without AI
 */
function generateFileSummary(parsed) {
  const parts = [];

  const symKinds = parsed.symbols.reduce((acc, s) => {
    acc[s.kind] = (acc[s.kind] || 0) + 1;
    return acc;
  }, {});

  const symDescriptions = Object.entries(symKinds)
    .map(([kind, count]) => `${count} ${kind}${count > 1 ? 's' : ''}`)
    .join(', ');

  const primarySymbols = parsed.symbols
    .filter((s) => s.exported || s.kind === 'class' || s.kind === 'component')
    .slice(0, 4)
    .map((s) => s.name);

  if (parsed.isSensitive) {
    parts.push('⚠️ Security-sensitive module');
  }

  if (parsed.language.includes('react')) {
    parts.push('React UI component module');
  } else if (parsed.symbols.some((s) => s.kind === 'endpoint')) {
    parts.push('REST API controller');
  } else if (parsed.symbols.some((s) => s.name.toLowerCase().includes('service'))) {
    parts.push('Business logic service');
  } else if (parsed.symbols.some((s) => s.name.toLowerCase().includes('repo') || s.name.toLowerCase().includes('model') || s.name.toLowerCase().includes('entity'))) {
    parts.push('Data model / persistence layer');
  } else {
    parts.push(`${parsed.language} module`);
  }

  if (symDescriptions) {
    parts.push(`contains ${symDescriptions}`);
  }

  if (primarySymbols.length > 0) {
    parts.push(`primary: ${primarySymbols.join(', ')}`);
  }

  return parts.join(' | ');
}

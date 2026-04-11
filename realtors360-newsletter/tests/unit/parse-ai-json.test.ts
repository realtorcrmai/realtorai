import { describe, it, expect } from 'vitest';
import { parseAIJson, unescapeNewlines, bodyToHtml } from '../../src/lib/parse-ai-json.js';

describe('parseAIJson', () => {
  it('parses plain JSON', () => {
    expect(parseAIJson('{"subject":"hello"}')).toEqual({ subject: 'hello' });
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"subject":"hello","body":"world"}\n```';
    expect(parseAIJson(input)).toEqual({ subject: 'hello', body: 'world' });
  });

  it('strips ``` fences without json label', () => {
    const input = '```\n{"a":1}\n```';
    expect(parseAIJson(input)).toEqual({ a: 1 });
  });

  it('handles fences with extra whitespace', () => {
    const input = '  ```json  \n  {"x": true}  \n  ```  ';
    expect(parseAIJson(input)).toEqual({ x: true });
  });

  it('handles trailing commas', () => {
    expect(parseAIJson('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
  });

  it('returns null for empty input', () => {
    expect(parseAIJson('')).toBeNull();
    expect(parseAIJson('  ')).toBeNull();
  });

  it('returns null for unparseable text', () => {
    expect(parseAIJson('This is not JSON at all')).toBeNull();
  });

  it('parses JSON array', () => {
    expect(parseAIJson('```json\n["rule1","rule2"]\n```')).toEqual(['rule1', 'rule2']);
  });
});

describe('unescapeNewlines', () => {
  it('converts literal \\n to real newlines', () => {
    expect(unescapeNewlines('Hello\\nWorld')).toBe('Hello\nWorld');
  });

  it('handles multiple \\n', () => {
    expect(unescapeNewlines('A\\n\\nB\\nC')).toBe('A\n\nB\nC');
  });

  it('leaves text without \\n unchanged', () => {
    expect(unescapeNewlines('No newlines here')).toBe('No newlines here');
  });
});

describe('bodyToHtml', () => {
  it('converts newlines to <br> and unescapes \\n', () => {
    expect(bodyToHtml('Hello\\n\\nWorld')).toBe('Hello<br><br>World');
  });

  it('handles real newlines', () => {
    expect(bodyToHtml('Hello\nWorld')).toBe('Hello<br>World');
  });
});

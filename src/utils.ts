export function createCodeBlock(code: string, language = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

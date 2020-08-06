import { createCodeBlock } from '../src/utils';

describe('utls', () => {
  it(createCodeBlock.name, () => {
    expect(createCodeBlock('echo foo', 'bash')).toBe('```bash\necho foo\n```');
  });
});

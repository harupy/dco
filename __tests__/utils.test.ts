import { createCodeBlock } from '../src/utils';

describe('utils', () => {
  it(createCodeBlock.name, () => {
    expect(createCodeBlock('echo foo')).toBe('\n\necho foo\n\n');
  });
});

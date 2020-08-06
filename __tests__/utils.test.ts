import { createCodeBlock } from '../src/utils';

describe('utls', () => {
  it(createCodeBlock.name, () => {
    expect(createCodeBlock('echo foo')).toBe('\n\necho foo\n\n');
  });
});

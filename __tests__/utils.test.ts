import { createCodeBlock } from '../src/utils';

describe('utils', () => {
  it(createCodeBlock.name, () => {
    expect(createCodeBlock('echo foo')).toBe('\necho foo\n');
  });
});

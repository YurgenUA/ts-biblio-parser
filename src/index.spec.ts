import test from 'ava';

import { main } from './index';

test('emulate parsing invocation', async (t) => {
  await main();
  t.is(true, true);
});

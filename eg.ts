import { main, suspend } from "effection";

await main(function*() {
  try {
    console.log('hello')
    yield* suspend();
  } finally {
    console.log('goodbye');
  }
})

import { call, each, main, Operation, resource, stream, spawn, race, Stream, sleep, useAbortSignal, Result, Err, Ok } from "effection";
import { x as $x, Options, Output, KillSignal } from 'npm:tinyexec';

export interface TinyProcess extends Operation<Output> {
  lines: Stream<string,void>;

  kill(signal?: KillSignal): Operation<void>;
}

export function x(cmd: string, args: string[] = [], options?: Partial<Options>): Operation<TinyProcess> {
  return resource(function*(provide) {
    let signal = yield* useAbortSignal();

    let tinyexec = $x(cmd, args, {...options, signal });

    let promise: Promise<Output> = tinyexec as unknown as Promise<Output>;

    let output = call(() => promise);

    let tinyproc: TinyProcess = {
      *[Symbol.iterator]() {
	return yield* output;
      },
      lines: stream(tinyexec),
      *kill(signal) {
	tinyexec.kill(signal);
	yield* output;
      },
    }

    try {
      yield* provide(tinyproc);      
    } finally {
      yield* tinyproc.kill();
    }
  })
}

await main(function*() {
  let proc = yield* x('deno', ['run', '-A', 'eg.ts'], {
    nodeOptions: {
      stdio: 'inherit'
    }
  });
  
  yield* spawn(function*() {
    for (let line of yield* each(proc.lines)) {
      console.log(line);
      yield* each.next();
    }
  });

  let result = yield* raceTime(1000, () => proc);

  console.log(result)
  
  console.log("done");
});

function raceTime<T>(timeout: number, op: () => Operation<T>): Operation<Result<T>> {
  function* win() {
    return Ok(yield* op());
  }

  function* lose() {
    yield* sleep(timeout);
    return Err(new Error(`timeout`));
  }
  return race([win(), lose()]);
}

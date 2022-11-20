# yellow pipeline

V. 2: With the new release you can only run string expression, no more arrays. Please note the run method instead of serial.

Example of use:

```ts
const {run, w, compile} = require("yellow-machine")
const npm = require('npm-commands')
const {docker} = require('./docker')
const {dgraph} = require('./dgraph')
const config = require("./config")

function test(){
    npm().run('tap');
}

const {up, down} = docker({name: "my-container-dgraph-v13", 
                           image: "dgraph/standalone:master", 
                           port: "8080"
                        })

const dql = dgraph(config)

async function main() {
    const exp = `up[
                      w[ dql? | test ]
                      down`;
    const options = {
        namespace: {up, dql, test, down}, 
        plugins: {w: w(["./tests/*.js", "./schema/*.*"])}
    }
    const f = compile(exp, options);
    await f('some initial data');
    // or
    await run(exp, options, 'some initial data'); 
    // if up is ok, then enters into next scope. w watchs for file changes and
    // dispatch the pipe: if dql is ok then test is executed
    // if dql fails, if it were just "dql" then would throw an exception that stops watch
    // but due to '?' the exception is catched and w continues.
    // if key 'q' is pressed then watch finishes and down is executed
}

main()
```

If you want to use several times the same expression, you should compile first:

```ts
const {compile} = require("yellow-machine");

const f = compile("a|p[b,c]", options);

//then
await f("some data");
await f("other data");

// you still can use context but it is not recommended
```

Things you can do:

```ts
// argument to run can be a string or an array. Every element of the array can be the same
// initial data is optional
await f("p[a|b,c"); // in parallel are executed: c and (a|b): a|b means a is executed then b if successful

// p is shorthand for parallel
await f("up|p[a,b,c]|end", data);
// end will execute when p finishes. Default mode for parallel is "all" (await Promise.all...)

// throwing
await f("ini[a!|b]end", data); //if a, for example, throws, then b is not executed and the exception is raised

// or
await f('ini[a|b]!end', data);

// you can use ! the next way
await f('a|b!|c!|d', data); // if b or c throws then the whole pipe throws

// more expressions
"w[^a|b,c" // a is non reentrant

"w[a|^b,c" // b is non reentrant

"w[a|b,^c" // c is non reentrant

"x[a|b]3!y" //[a|b] will retry 3 times if exception 
```

// repeat is a plugin that spawns n pipes
```ts
const { repeat, compile } = require("yellow-machine")

const options = {
        namespace: {a, b}, 
        plugins: {r2: repeat(2)},
        dev: true,
        path: []
    }
    
const f = compile("r2[^[a|b", options);

await f(); //--> a1 ... b1 ... a2 ... b2
```

// you don't need to close with ] at the end of the expression:
```"p[a,b"```

// if b throw, c is not executed and exception should be out, but ? catch it
```"[ini|a[b!|c]?x]y"``` // x is not executed because previous pipe was not successful but y will be executed

//note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators

```ts
test("]? without !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    // you can use the old mode
    const run = dev(path)({a, b, c, x}, {});
    const response = await run("a[b|c]x");

    expect(response).toBe("x");
    expect(path).toEqual(["a", "throws", "x"]);
});
```

A producer consumer is passed a type Data:

```ts
type Data = {data: any, ctx: Ctx};
type Ctx = {close: Close, promise?: Promise<any>};
type Close = (err?: boolean, data?: any)=>boolean;

function someProducerConsumer({data, ctx}){
    // do something with data
    ctx.close(); // call close programatically if you want
    return //some data
}

```

How to use the switch or decide plugin;

```ts
import {sw, compile} from 'yellow-machine';
...
const a = g(["a"]);
const b = g(["b"]);
const c = g(["c"]);

// if you return true the given pipe will be executed
// if you return false, then it will continue with the next pipe after sw
// if you return a number, then it consider given pipes and it will be indexed and executed
function decide(data: Data): number|boolean{
        if(data.data === 'a') return 0;
        else return 1;
    }

const options = {
    namespace: {a, b, c},
    plugins: {sw: sw(decide)},
    dev: true,
    path: []
}

const f = compile("a|sw[b,c]", options);

await f(); // a ... b
```

Example of a producer / consumer:

// you can return null, and it means that the current pipe should stop and go out to continue
// executing outer pipe
// you can also throw an exception and current pipe will stop and bubble up the exception
```ts
function myF(data: Data){ // (data: Data) => any
    if(data.data === 'a') return 'b';
    if(data.data === 'x')
        data.ctx.close(true); // manually close the closer plugin
                    // true means close with error, you can pass false, "some data"
                    // to close without error and return that data
    return 'other';
}
```

A producer consumer doesn't need to use the data passed in. For example.

```ts
exports.docker = function({image, port, name, waitOn=null}){
    const docker = new Docker()
    let container = null
    if(waitOn === null){
        waitOn = "http://localhost:" + port
    }
    return {
        up: async () => { // a producer / consumer
            try{
                container = await docker.container.create({
                    Image: image,
                    name,
                    PortBindings: {
                        "8080/tcp": [{
                            "HostIP":"0.0.0.0",
                            "HostPort": port
                        }]
                    }
                })
                await container.start()
                await _waitOn({
                    resources: [waitOn]
                });
                console.log('docker started')
            }catch(err){
                console.log(err)
                if(container){
                    await stopAndDelete(container)
                }
                throw err
            }
        },
        down: async () => { // a producer / consumer
            await stopAndDelete(container)
        }
    }
}
```

# Plugins

A plugin is a function that returns a setup function, which will return a producer / consumer. The plugin is used for example to get an array of pipes and run them in parallel. So a plugin can receive a pipe or an array of pipes. Here two examples.


- `p` to execute an array of pipes in parallel

    ```ts
    // you can pass a map function that is called to pass a fresh object of Data to each parallel pipe
    (mode: "all"|"race"|"allSettled" = "all", map: ((data: Data)=>any)|null = null)
    ```

- `w` to watch some files

    ```ts
    (files: string[]) // the array of files to watch
    ```
- `nr` means not reentrant

    ```ts
    // MODE "buffer"|"nobuffer"
    // size: number, size of buffer
    ({mode, size}: {mode?: MODE, size?: number} = {mode: "buffer"})
    ```

- `sw` switch: is constructed with a function like this

- `repeat` : export default (n: number) spawns n pipes

Some implementations:

```ts
// parallel

import { Data, type SETUP } from '.';

export default (mode: "all"|"race"|"allSettled" = "all", map: ((data: Data)=>any)|null = null) => (setup: SETUP) => async (data: Data) => {
    const pipes = setup["multiple"];
    const promises: Promise<any>[] = [];   

    for(const t of pipes){
        if(map) data = {ctx: data.ctx, data: map(data.data)};
        promises.push(t(data));
    }
    if(mode === "all") return await Promise.all(promises);
    //else if (mode === "any") return await Promise.any(promises);
    else if (mode === "race") return await Promise.race(promises);
    else if (mode === "allSettled") return await Promise.allSettled(promises);
    return false;
};
```

An example of a plugin that uses both single and multiple:

```ts
// switch
import { Data, type SETUP } from '.';
type SWF = (data: any)=>number|boolean;

export default (f: SWF) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];
    const pipes = setup["multiple"];

    const v = f(data);
    if(typeof v === 'boolean'){
        if(v) return await pipe(data);
        else return null;
    }else{
        return await pipes[v](data); 
    }
};
```

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)

Tests: `npm run test`

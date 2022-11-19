# very simple pipeline alternative

Example of use:

```ts
// C will create a context given producer/consumers and plugins
// watch is a plugin
const {context: C, watch, g, i} = require("yellow-machine")
const npm = require('npm-commands')
const {docker} = require('./docker')  
const {dgraph} = require('./dgraph')  
const config = require("./config")


function test(){
    npm().run('tap');
}

// up and down are producer / consumers
// up will start a docker image and down will stop it
const {up, down} = docker({name: "my-container-dgraph-v13", 
                           image: "dgraph/standalone:master", 
                           port: "8080"
                        })

// dql is a producer / consumer
// it loads a graphql to a instance of dgraph
const dql = dgraph(config)

async function main() {
    // C(namespace, plugins)
    // serial is called to start the pipeline of tasks
    const {serial} = C({up, dql, test, down}, {w: watch(["./tests/*.js", "./schema/*.*"])});
    await serial(`up[  
                      w[ dql? | test ]
                      down`
    )(i()); //i() generates a default initial value for the pipe
    // if up is ok, then enters into next scope. w watchs for file changes and
    // dispatch the pipe: if dql is ok then test is executed
    // if dql fails, if it were just "dql" then would throw an exception that stops watch
    // but due to '?' the exception is catched and w continues.
    // if key 'q' is pressed then watch finishes and down is executed
}

main()
```

Things you can do:

```ts
// argument to serial can be a string or an array. Every element of the array can be the same
await serial([f1, f2, "f3"])(i()); // f1 is executed, then f2 then f3 unless exception ("f3" is in the context)

// with initial data
const response = await serial("a|b")(i("x"));
await serial([f1, f2, "f3"])(i("my initial data")); 

// we use the plugin w. You pass {w: watch(...)} in the plugins sections and 
// you get w in const {serial, w} = C({
const {serial, w, p} = C({up, test, down}, {w: watch(["./tests/*.js", "./schema/*.*"])});
await serial(["up", w([dql, "test"]), "down"])(i());

// or
const {serial} = C({up, dql, test, down}, {w: watch(["./tests/*.js", "./schema/*.*"])});
await serial("up|w[dql|test]down")(i());

// p is shorthand for parallel
await serial("up", p([a, b, c]), "end")(i());

// or
await serial("up|p[a,b,c]|end")(i());
// end will execute when p finishes. Default mode for parallel is "all" (await Promise.all...)

// throwing
await serial([a, b, 'throws'])(i()); //if f1, for example, throws, then f2 is not executed and the exception is raised

// or
await serial('[a|b]!')(i());

// you can use ! the next way
await serial('a|b!|c!|d')(i()); // if b or c throws then the whole pipe throws

// default nested to serial
await serial([f1, f2, [f3, f4], f5])(i());

// more expressions
"w[^a|b,c" // a is non reentrant

"w[a|^b,c" // b is non reentrant

"w[a|b,^c" // c is non reentrant
```

// repeat is a plugin that spawns n pipes
```ts
const {serial} = dev(path)({a, b}, {r2: repeat(2)});

await serial("r2[^[a|b")(i()); //--> a1 ... b1 ... a2 ... b2
```

// you don't need to close with ] at the end of the expression:
"p[a,b"

// if b throw, c is not executed and exception should be out, but ? catch it
"a[b!|c]?x" // x is not executed because previous pipe was not successful

//note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators

```ts
test("]? without !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    const response = await serial("a[b|c]x")(i());

    expect(response).toBe("x");
    expect(path).toEqual(["a", "throws", "x"]);
});
```

To test paths I think this is the way:

```js
function create(G, ctx, plugins){
    const {serial} = G(ctx, plugins);
    return serial("..."); 
}

const p = create(dev(path), ctx_dev, plugins)
//or in production
const p = create(C, ctx_production, plugins)
```

A producer consumer is passed a type Data:

```ts
type Data = {data?: any, ctx: Ctx};
type Ctx = {quit: Quit};
type Quit = (err?: boolean, data?: any)=>boolean;

function someProducerConsumer({ctx}){
    ctx.quit(); // call quit programatically
    return //some data
}

```
Plugins:

`p` to execute an array of pipes in parallel

    ```ts
    // you can pass a map function that is called to pass a fresh object of Data to each parallel pipe
    (mode: "all"|"race"|"allSettled" = "all", map: ((data: Data)=>any)|null = null)
    ```

`w` to watch some files

    ```ts
    (files: string[]) // the array of files to watch
    ```
`nr` means not reentrant

    ```ts
    // MODE "buffer"|"nobuffer"
    // size: number, size of buffer
    ({mode, size}: {mode?: MODE, size?: number} = {mode: "buffer"})
    ```

`sw` switch: is constructed with a function like this

```ts
import {sw} from 'yellow-machine';
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

const {serial} = dev(path)({a, b, c}, {sw: sw(decide)});
await serial("a|sw[b,c]")(i()); // a ... b
```

Example of a producer / consumer:

// you can return null, and it means that the current pipe should stop and go out to continue
// executing outer pipe
// you can also throw an exception and current pipe will stop and bubble up the exception
```ts
function myF(data: Data){ // (data: Data) => any
    if(data.data === 'a') return 'b';
    if(data.data === 'x')
        data.ctx.quit(true); // manually close the closer plugin
                    // true means quit with error, you can pass false, "some data"
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

An example of a plugin that uses both:

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

*** Current limitation:
Cannot be used array notation inside plugins, must be "a|b|c,w[p[...]]..." for example, i.e, an string to be compiled;

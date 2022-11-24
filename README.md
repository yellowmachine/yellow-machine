# yellow pipeline

A simple language to specify, compile and run tasks.

Examples of expressions:

```ts
"a|b"  // a then b
"'[a,c|b]"  // in parallel a and c|b
"'[a,b,c]"  // in parallel a and b and c
"3'[a|b]"   // repeat 3 times a|b
"3'^[a|b]"  // repeat 3 times with no reentrance a|b (only when b finishes then can be other execution. Default mode is no buffer)
//given { plugins: {buffer: nr({mode: "buffer", size: 2})} }
"3'buffer'[a|b]" // repeat 3 times, with a buffer of size 2
"a[b|c]2!x"      // a then b|c. If b or c throws, it is retried at most two times or the error is thrown. If no error is thrown, then x
"a[b|c]?x"       // a then b|c. If b or c throws, then it is catched and null is go through the pipe
"w'^'[b,a|c]x"   // watch some files and with no reentrance, in parallel b and a|c. When finishes x (x is passed an array of values [result of b, result of c])
```

Example of use:

```ts
const {compile, w} = require("yellow-machine")
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

/*
up will start a database dgraph.io docker container, and if no problems, then w will watch some files. When changes, dql will load a schema to the database. If no problem, tests are executed. When user press 'q' key, the watch finishes and down will stop container.
*/
async function main() {
    const t = `up[
                    w'[ dql? | test ]
                    down
                 ]`;
    const f = compile(t, {
                            namespace: {up, dql, test, down}, 
                            plugins: {w: w(["./tests/*.js", "./schema/*.*"])}
        });
    await f();
}

main()
```

You can use ```run``` directly, but ```compile``` is recommended:

```ts
const {run, compile} = require("yellow-machine");

await run("a|'[b,c]", options, initialData);

//or
const f = compile("a|'[b,c]", options);

//then
await f("some data");
await f("other data");
```

# The language:

```ts
// pseudo-code:

Catch = /\d*[\?!]/
Atom = /[a-zA-Z][a-zA-Z\d]*\??/
Plugin = /([a-zA-Z\d]+)?'/
C = Plugin*Atom|Expression;
Expression = Plugin*[C](Catch)?;
```

# Producer / Consumer

A producer consumer is passed a data of type Data:

```ts
type Data = {data: any, ctx: Ctx};
type Ctx = {close: Close, promise?: Promise<any>};
type Close = (err?: boolean, data?: any)=>boolean;
```

Example of a producer / consumer:

```ts
// you can return null, and it means that the current pipe will do nothing
// you can also throw an exception and current pipe will stop and bubble up the exception
// close: think on watching files, you have opened listeners. If you close somewhere on the pipe that is been executed by watch, it is closed.
function myF({data, ctx}){ // (data: Data) => any
    if(data === 'a') return 'b';
    if(data === 'x')
        ctx.close(true); // manually close the closer plugin
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

A plugin is a setup function like, for example:

```ts
// retry
export default (n: number) => (pipe: FD[]) => async (data: Data) => {
        
    const initialData = data.data;
    
    for(;;){        
        try{
            return await pipe[0]({...data, data: initialData}); 
        }catch(err){
            n--;
            if(n === 0) throw err;
        }    
    } 
};
```

Then a function is returned, a special function that takes an array of pipes to be executed.

These are some builtin plugins:

- `p` to execute an array of pipes in parallel

    ```ts
    // map: you can pass a map function that is called to pass a fresh object of Data to each parallel pipe
    export default (mode: "all"|"race"|"allSettled" = "all", 
                map: ((data: Data)=>any)|null = null) => (pipes: FD[]) => async (data: Data) => {...
    ```

- `w` to watch some files

    ```ts
    // the array of files to watch
    export default (files: string[]) => (pipes: FD[]) => async (data: Data) => { 
    ```
- `nr` means not reentrant

    ```ts
    // MODE "buffer"|"nobuffer"
    // size: number
    export default ({mode, size}: {mode?: MODE, size?: number} = {mode: "nobuffer"}) => 
    (pipes: FD[]): FD => {
    ```

- `sw` switch: to decide which pipe to be executed

    ```ts
    type SWF = (data: any)=>number|boolean; // boolean: decide if execute pipe or not; number: switch pipe
    export default (f: SWF) => (pipes: FD[]) => async (data: Data) => {
    ```

- `repeat` :

    ```ts
    export default (n: number) => (pipes: FD[]) => async (data: Data) => {
    ```

Some implementations of plugins:

* parallel:

```ts
import { Data, FD } from '.';

export default (mode: "all"|"race"|"allSettled" = "all", 
                map: ((data: Data)=>any)|null = null) => (pipes: FD[]) => async (data: Data) => {
    
    const promises: Promise<any>[] = [];   

    for(const t of pipes){
        if(map) data = {ctx: data.ctx, data: map(data.data)};
        promises.push(t(data));
    }
    try{
        if(mode === "all"){
            return await Promise.all(promises);
        } 
        //else if (mode === "any") return await Promise.any(promises);
        else if (mode === "race") return await Promise.race(promises);
        else if (mode === "allSettled") return await Promise.allSettled(promises);
    }catch(err){
        const msg = err instanceof Error ? err.message: "";
        throw new Error(data.data + msg);
    }
    return false;
};

```

* switch:

```ts
import { Data, FD } from '.';

type SWF = (data: any)=>number|boolean;

export default (f: SWF) => (pipes: FD[]) => async (data: Data) => {

    const v = f(data);
    
    if(typeof v === 'boolean'){
        if(v) return await pipes[0](data);
        else return null;
    }else{
        return await pipes[v](data); 
    }
};
```

Note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators.

```ts
test("run a[b|c]2!x", async ()=>{

    const a = g("a,q,y,z");
    const b = g("b!");
    const c = g("c,c2,c3");
    const x = g("x,k,m");

    const t = "a[b|c]2!x";
    const cmp = compile(t, {
        namespace: {a, b, c, x}
    });
    const result = await cmp("");
    expect(result).toEqual("undefinedcx"); // ab! is discarded by the retry, then the b generator returns undefined. Generators created by g just concatenate what yield with value received
});
```

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)

Tests: `npm run test`

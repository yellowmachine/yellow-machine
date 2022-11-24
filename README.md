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
                      w'[ dql? | test ]
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

const f = compile("a|'[b,c]", options);

//then
await f("some data");
await f("other data");

// you still can use context but it is not recommended
```

Possible expresssions:

```ts

```

# Producer / Consumer

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
    // size: number, size of buffer
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

// repeat is a plugin that spawns n pipes
```ts
const { repeat, compile } = require("yellow-machine")

const options = {
        namespace: {a, b}, 
        //plugins: {r2: repeat(2)}
    }
    
const f = compile("2'^[a|b]", options);    
// or    
const f = compile("r2'^[a|b]", options);

await f(); //--> a1 ... b1 ... a2 ... b2
```

//note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators

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
    expect(result).toEqual("undefinedcx"); // ab! is discarded by the retry, then the b generator return undefined
});
```

Some implementations of plugins:

```ts
// parallel
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

An example of a plugin that uses both single and multiple:

```ts
// switch
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

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)

Tests: `npm run test`

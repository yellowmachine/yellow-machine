# very simple pipeline alternative

Example of use:

```ts
// C will create a context given producer/consumers and plugins
// watch is a plugin
const {context: C, watch, g} = require("yellow-machine")
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
    )();
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
await serial([f1, f2, "f3"])(); // f1 is executed, then f2 then f3 unless exception ("f3" is in the context)

// with initial data
await serial([f1, f2, "f3"])({data: "someinitial data", ctx: {quit: ()=>true}}); // it will be changed in next version so it will be no necessary to pass ctx

// we use the plugin w. You pass w: watch(["./te... in the plugins sections and 
// you get in const {serial, w} = C({
const {serial, w, p} = C({up, dql, test, down}, {w: watch(["./tests/*.js", "./schema/*.*"])});
await serial(["up", w([k1, "k"]), "down"])();

// p is shorthand for parallel
await serial("up", p([a, b, c]), "end")();

// or
await serial("up|p[a,b,c]|end")();
// end will execute when p finishes. Now the mode of p is all: await Promise.all(promises);

// throwing
await serial([a, b, 'throws'])(); //if f1, for example, throws, then f2 is not executed and the exception is raised

// or
await serial('[a|b]!')();

// you can use ! the next way
await serial('a|b!|c!|d')(); // if b or c throws then the whole pipe throws

// default nested to serial
await serial([f1, f2, [f3, f4], f5])();

// soon: more expressions
"w[^a|b,c" // a is non reentrant

"w[a|b,^c" // c is non reentrant

"w^[a,b]"  // [a,b] is non reentrant

//note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators
test("plugin w and !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]); // g is useful to create generators. You pass an array of strings
    const b = g(["b!"]); // if a string starts with "trhow" or ends with ! the exception is trhown
    const c = g(["c"]);

    const {serial, w} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    await serial(["a", w("b"), "c"])();
    // or await serial("a|w[b]c])();

    expect(path).toEqual(["a", "b!", "c"]);
```

To test paths I think this is the way:

```js
function create(G, ctx, plugins){
    const {...} = G(ctx, plugins);
    return serial(...); 
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
`w` to watch some files
`nr` means not reentrant
`sw` : receive an array of Tpipe; not coded yet, a switch plugin that is constructed with a function like this:

```ts
function(data: any){
    ...
    return i // where i: number is the index of the Tpipe to be executed
}
```

Example of a producer / consumer:

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

An example of a plugin:

```ts
// watch

export default (files: string[]) => () => {
    let _close: Quit;
    return {
        setup: ({single}: SingleOrMultiple) => {
            const {promise, close} = watch(files, single);
            _close = close;
            return promise;
        },
        close: () => _close()
    };
};

const watch = (files: string[], f: SingleOrMultiple["single"]) => {
    const q = 'q';

    const h = (ch: string) => {
        if(ch === q){
            close();
        }
    };
    process.stdin.on('keypress', h);        

    let resolve: (null|((arg0: (any)) => void)) = null;
    let reject: (null|(() => void)) = null;

    const p = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });

    let exited = false;
    function close(err = false, data: any = null){
        if(!exited){
            exited = true;
            process.stdin.pause();
            process.stdin.removeListener("keypress", h);
            if(err){
                if(reject) reject();
            }
            else if(resolve) resolve(data);
            if(watcher)
                watcher.close();
        }
        return true;
    }

    async function run(){
        try{
            await f();         
            if(SHOW_QUIT_MESSAGE.v)
                // eslint-disable-next-line no-console
                console.log("Press " + q + " to quit!");
        }catch(err){
            // eslint-disable-next-line no-console
            console.log(err);
        }
    }

    let watcher: null | ReturnType<typeof chwatch> = null;
    
    watcher = chwatch(files, {ignoreInitial: true}).
        on('all', (event, path) => {
            // eslint-disable-next-line no-console
            //console.log(event, path);
            run();
        });
    run();
    
    return {promise: p, close};
};
```

Other plugin example:

```ts
// nr
export default  () => {
    return {
        setup: ({single}: {single: F}) => {
            return nr(single)();  
        },
        //close: () => some boolean // if you return false then it does not bubble up the close
    };
};

type F = () => Promise<any>;

const nr = (f: F) => {
    let exited = true;
    return async () => {
        try{
            exited = false;
            return await f();
        }catch(err){
            // eslint-disable-next-line no-console
            console.log(err);
            throw(err);
        }finally{
            exited = true;
        }
    };
};
```

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)

Tests: `npm run test`

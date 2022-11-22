import { DEBUG } from '../index';
import { parse, nextToken } from '../parse';

DEBUG.v = false;

const plugins = ['nr', 'p'];

const consume = (t: string) => {
    return [...nextToken(t)];
};

test("next token empty string", ()=>{
    const t = "";
    const tokens = consume(t);
    expect(tokens).toEqual([]);
});

test("next token", ()=>{
    const t = "a,^b|c[e3";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", ",", "^b", "|", "c", "[", "e3"]);
});

test("next token ^[", ()=>{
    const t = "c^[e";
    const tokens = consume(t);
    expect(tokens).toEqual(["c", "^[", "e"]);
});

test("next token []", ()=>{
    const t = "a[b]";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", "[", "b", "]"]);
});

test("next token a|b", ()=>{
    const t = "a|b";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", "|", "b"]);
});

test("parse atom a?", ()=>{
  const t = "a?";
    const p = parse(t, plugins);
    expect(p).toEqual(
      {
        plugin: 's',
        type: 'array',
        c: [
          {
            plugin: 's',
            type: "array",
            c: 
              [
                {
                  type: "atom",
                  name: "a",
                  catched: true,
                }
              ]
          }
        ]
      }
    );
});

test("parse", ()=>{
    const t = "a|b";
    const p = parse(t, plugins);
    expect(p).toEqual(
    {
        plugin: 's',
        c: 
        [
            {
                plugin: 's',
                c: [
                {name: "a", type: "atom", catched: false},
                {name: "b", type: "atom", catched: false}
            
                ], 
                type: "array"
            }
        ], 
        type: "array"
    }
    );
});

test("parse a|w[b]e", ()=>{
    const t = "a|w[b]e";
    const p = parse(t, [...plugins, 'w']);

    expect(p).toEqual(
        {
            "type": "array",
            "plugin": "s",
            "c": [
              {
                "type": "array",
                "plugin": "s",
                "c": [
                  {
                    "type": "atom",
                    "name": "a",
                    catched: false
                  },
                  {
                    "type": "array",
                    "plugin": "w",
                    "c": [
                      {
                        "type": "array",
                        "plugin": "s",
                        "c": [
                          {
                            "type": "atom",
                            "name": "b",
                            catched: false
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "atom",
                    "name": "e",
                    catched: false
                  }
                ]
              }
            ]
          }
    );
});

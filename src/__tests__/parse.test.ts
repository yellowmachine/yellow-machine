import { DEBUG } from '../index';
import { parse, nextToken, TOKEN, matchToken, tokens } from '../parse';

DEBUG.v = false;

const plugins = ['nr', 'p'];

const consume = (t: string) => {
    return [...nextToken(t)].map(x => x.value);
};

test('match token name a[', ()=>{
  const r = matchToken(tokens[TOKEN.NAME], "a[");
  expect(r).toEqual({
    value: 'a',
    opts: ["a", ""]
  });
});

test('match token name a3[', ()=>{
  const r = matchToken(tokens[TOKEN.NAME], "a3[");
  expect(r).toEqual({
    value: 'a3',
    opts: ["a3", ""]
  });
});

test("match token plugin a'[", ()=>{
  const r = matchToken(tokens[TOKEN.PLUGIN], "a'[");
  expect(r).toEqual({
    value: "a'",
    opts: ["a"]
  });
});

test("match token plugin a'b3'k'[", ()=>{
  const r = matchToken(tokens[TOKEN.PLUGIN], "a'b3'k'[");
  expect(r).toEqual({
    value: "a'",
    opts: ["a"]
  });
});

test("match token name w'k'a3?[", ()=>{
  const r = matchToken(tokens[TOKEN.NAME], "w'k'a3?[");
  expect(r).toEqual({
    value: "w",
    opts: ["w", ""]
  });
});

test("match token plugin ^w'k'a3[", ()=>{
  const r = matchToken(tokens[TOKEN.NR], "^w'k'a3[");
  expect(r).toEqual({
    value: "^",
    opts: []
  });
});

test("next token", ()=>{
    const t = "a,^b|c[e3";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", ",", "^", "b", "|", "c", "[", "e3"]);
});

test("next token c^[e", ()=>{
    const t = "c^[e";
    const tokens = consume(t);
    expect(tokens).toEqual(["c", "^", "[", "e"]);
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
        plugins: [],
        c: [
          {
            plugin: 's',
            type: "array",
            plugins: [],
            c: 
              [
                {
                  type: "atom",
                  name: "a",
                  catched: true,
                  plugins: []
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
        plugins: [],
        c: 
        [
            {
                plugin: 's',
                plugins: [],
                c: [
                {name: "a", type: "atom", catched: false, plugins: []},
                {name: "b", type: "atom", catched: false, plugins: []}
            
                ], 
                type: "array"
            }
        ], 
        type: "array"
    }
    );
});

test("parse a|w[b]e", ()=>{
    const t = "a|w'[b]e";
    const p = parse(t, [...plugins, 'w']);

    expect(p).toEqual(
        {
            "type": "array",
            "plugin": "s",
            plugins: [],
            "c": [
              {
                "type": "array",
                "plugin": "s",
                plugins: [],
                "c": [
                  {
                    "type": "atom",
                    "name": "a",
                    plugins: [],
                    catched: false
                  },
                  {
                    "type": "array",
                    "plugin": "s",
                    plugins: ['w'],
                    "c": [
                      {
                        "type": "array",
                        plugins: [],
                        "plugin": "s",
                        "c": [
                          {
                            "type": "atom",
                            "name": "b",
                            plugins: [],
                            catched: false
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "atom",
                    "name": "e",
                    plugins: [],
                    catched: false
                  }
                ]
              }
            ]
          }
    );
});

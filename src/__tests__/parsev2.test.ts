import { DEBUG } from '../index';
import { parse, nextToken } from '../parse';

DEBUG.v = false;

const plugins = ['nr', 'p'];

test("next token empty string", ()=>{
    expect(nextToken("", plugins)).toBe(null);
});

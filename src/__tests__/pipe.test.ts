import {pipe } from '../index';

async function f1(){
  return 1;
}

let f2_executed = false;

async function f2(){
  f2_executed = true;
  return 1;
}

async function f_error(){
  throw new Error("my error");
}

test('pipe ok', async () => {
  f2_executed = false;
  expect(await pipe(f1, f2)).toBeTruthy();
  expect(f2_executed).toBeTruthy();
});

test('pipe fail', async () => {
  f2_executed = false;
  expect(await pipe(f_error, f2)).toBeFalsy();
  expect(f2_executed).toBeFalsy();
});

test('pipe fail that throws', async () => {
  async function t(){
    await pipe(f_error, f2, 'throws');
  }
  await expect(t).rejects.toThrow("my error");
});
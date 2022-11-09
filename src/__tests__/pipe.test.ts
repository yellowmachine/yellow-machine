import { DEBUG, context as C } from '../index';

DEBUG.v = false;

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
  expect(await C().serial([f1, f2])).toBeTruthy();
  expect(f2_executed).toBeTruthy();
});

test('pipe fail', async () => {
  f2_executed = false;
  expect(await C().serial([f_error, f2])).toBeFalsy();
  expect(f2_executed).toBeFalsy();
});

test('pipe fail that throws', async () => {
  async function t(){
    await C().serial([f_error, f2, 'throws']);
  }
  await expect(t).rejects.toThrow("my error");
});

test('pipe nested ok', async () => {
  let k2_v = false;
  let z1_v = false;
  const k1 = async () => {throw new Error();};
  const k2 = async () => k2_v = true;
  const z1 = async () => z1_v = true;

  const p = C().serial([f1, [k1, k2], z1]);
  await p;
  expect(k2_v).toBeFalsy();
  expect(z1_v).toBeTruthy();
});

test('pipe nested that throws', async () => {
  let k2_v = false;
  let z1_v = false;
  const k1 = async () => {throw new Error();};
  const k2 = async () => k2_v = true;
  const z1 = async () => z1_v = true;

  const p = C().serial([f1, [k1, k2, 'throws'], z1]);
  await p;
  expect(k2_v).toBeFalsy();
  expect(z1_v).toBeFalsy();
});
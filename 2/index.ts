import { readFileSync } from 'fs'
import * as R from 'ramda'

const TARGET_VALUE = 19690720

const parseInput = R.compose(
  R.reject(Number.isNaN),
  R.map((s: string) => parseInt(s, 10)),
)

const originalOpcodes = parseInput(
  readFileSync('2/input.txt')
    .toString()
    .split(','),
)

type Action = (a: number, b: number) => number

const performActionAndUpdate = (action: Action) => (i: number) => (
  ops: readonly number[],
) => {
  const [a, b] = [ops[ops[i + 1]], ops[ops[i + 2]]]
  const targetIndex = ops[i + 3]
  return R.update(targetIndex, action(a, b), ops)
}

const actionForOpCode = R.cond<number, (a: number, b: number) => number>([
  [R.equals(1), () => R.add],
  [R.equals(2), () => R.multiply],
  [
    R.T,
    op => {
      throw new Error('Unknown opcode: ' + op)
      return R.add
    },
  ],
])

// FIXME: Ugh, fail. How would this be done in a functional style?
const possibilities = R.xprod(R.range(0, 100), R.range(0, 100))
let noun: number
let verb: number
let output
for ([noun, verb] of possibilities) {
  let i = 0
  let opcodes = originalOpcodes.slice()
  opcodes[1] = noun
  opcodes[2] = verb
  let opcode
  while ((opcode = R.nth(i, opcodes)) != 99 && opcode) {
    opcodes = performActionAndUpdate(actionForOpCode(opcode))(i)(opcodes)
    i += 4
  }
  output = opcodes[0]
  if (output === TARGET_VALUE) {
    break
  }
}

if (output !== TARGET_VALUE) {
  console.error('Unable to find right pair!')
} else {
  console.log('100 * noun + verb: ' + (100 * noun! + verb!))
}

import { readFileSync } from 'fs'
import * as R from 'ramda'

enum Operation {
  ADD = 1,
  MULTIPLY = 2,
  INPUT = 3,
  OUTPUT = 4,
  JUMP_IF_TRUE = 5,
  JUMP_IF_FALSE = 6,
  LESS_THAN = 7,
  EQUALS = 8,
}

let INPUT: number[] = []
let OUTPUT: number[] = []

const FUNCTION_FOR_OPERATION: {
  [o in Operation]: (...args: any[]) => any
} = {
  [Operation.ADD]: function(a: number, b: number) {
    return a + b
  },
  [Operation.MULTIPLY]: function(a: number, b: number) {
    return a * b
  },
  [Operation.INPUT]: function() {
    const value = INPUT.shift()
    // console.log('Sending input:', value)
    return value
  },
  [Operation.OUTPUT]: function(value: number) {
    // console.log('Output:', value)
    OUTPUT.push(value)
    return value
  },
  [Operation.JUMP_IF_TRUE]: function(value: number, target: number) {
    return !!value ? target : undefined
  },
  [Operation.JUMP_IF_FALSE]: function(value: number, target: number) {
    return !value ? target : undefined
  },
  [Operation.LESS_THAN]: function(a: number, b: number) {
    return a < b ? 1 : 0
  },
  [Operation.EQUALS]: function(a: number, b: number) {
    return a === b ? 1 : 0
  },
}

enum ParameterMode {
  POSITION,
  IMMEDIATE,
}

interface Action {
  operation: Operation
  parameterCount: number
  getWriteIndex?: (i: number, intcodes: readonly number[]) => number
  getParameters: Array<(i: number, intcodes: readonly number[]) => number>
}

const TOTAL_PARAMETER_COUNT: { [o in Operation]: number } = {
  [Operation.ADD]: 3,
  [Operation.MULTIPLY]: 3,
  [Operation.INPUT]: 1,
  [Operation.OUTPUT]: 1,
  [Operation.JUMP_IF_TRUE]: 2,
  [Operation.JUMP_IF_FALSE]: 2,
  [Operation.LESS_THAN]: 3,
  [Operation.EQUALS]: 3,
}

const INPUT_PARAMETER_COUNT: { [o in Operation]: number } = {
  [Operation.ADD]: 2,
  [Operation.MULTIPLY]: 2,
  [Operation.INPUT]: 0,
  [Operation.OUTPUT]: 1,
  [Operation.JUMP_IF_TRUE]: 2,
  [Operation.JUMP_IF_FALSE]: 2,
  [Operation.LESS_THAN]: 2,
  [Operation.EQUALS]: 2,
}

const WRITE_PARAMETER_INDEX: { [o in Operation]: number } = {
  [Operation.ADD]: 3,
  [Operation.MULTIPLY]: 3,
  [Operation.INPUT]: 1,
  [Operation.OUTPUT]: 0,
  [Operation.JUMP_IF_TRUE]: 0,
  [Operation.JUMP_IF_FALSE]: 0,
  [Operation.LESS_THAN]: 3,
  [Operation.EQUALS]: 3,
}

function isOperation(n: number): n is Operation {
  return [
    Operation.ADD,
    Operation.MULTIPLY,
    Operation.INPUT,
    Operation.OUTPUT,
    Operation.JUMP_IF_TRUE,
    Operation.JUMP_IF_FALSE,
    Operation.LESS_THAN,
    Operation.EQUALS,
  ].includes(n as Operation)
}

const parseIntcodes = R.compose(
  R.reject(Number.isNaN),
  R.map((s: string) => parseInt(s, 10)),
)

function performActionAndUpdate(
  action: Action,
  i: number,
  intcodes: readonly number[],
) {
  const params = R.juxt(action.getParameters)(i, intcodes)
  const writeIndex = action.getWriteIndex?.(i, intcodes)
  const result = R.apply(FUNCTION_FOR_OPERATION[action.operation], params)
  return {
    intcodes:
      writeIndex != null ? R.update(writeIndex, result, intcodes) : intcodes,
    jumpTarget:
      // Ugh
      [Operation.JUMP_IF_FALSE, Operation.JUMP_IF_TRUE].includes(
        action.operation,
      ) && result
        ? params[1]
        : i + action.parameterCount + 1,
  }
}

function getModeForNumber(n: number) {
  switch (n) {
    case 0:
      return ParameterMode.POSITION
    case 1:
      return ParameterMode.IMMEDIATE
    default:
      throw new Error('Unknown parameter mode ' + n)
      return ParameterMode.POSITION
  }
}

function getModes(opcode: number, parameterCount: number) {
  const modes = Math.floor(opcode / 100)
  return R.range(0, parameterCount).map(position =>
    getModeForNumber(Math.floor(modes / 10 ** position) % 10),
  )
}

function writeIndexGetter(o: Operation) {
  return WRITE_PARAMETER_INDEX[o]
    ? (i: number, intcodes: readonly number[]) =>
        intcodes[i + WRITE_PARAMETER_INDEX[o]]
    : undefined
}

function parameterGetterForMode(mode: ParameterMode, offset: number) {
  return mode === ParameterMode.IMMEDIATE
    ? (i: number, intcodes: readonly number[]) => intcodes[i + offset]
    : (i: number, intcodes: readonly number[]) => intcodes[intcodes[i + offset]]
}

function parameterGetters(o: Operation, modes: ParameterMode[]) {
  return R.range(0, INPUT_PARAMETER_COUNT[o]).map(i =>
    parameterGetterForMode(modes[i], i + 1),
  )
}

function parseOpCode(opcode: number): Action {
  const operation = opcode % 100
  if (!isOperation(operation)) {
    throw new Error('Unknown operation: ' + operation)
  }
  const parameterCount = TOTAL_PARAMETER_COUNT[operation]
  const modes = getModes(opcode, parameterCount)
  return {
    operation,
    parameterCount,
    getWriteIndex: writeIndexGetter(operation),
    getParameters: parameterGetters(operation, modes),
  }
}

const originalIntcodes = parseIntcodes(
  readFileSync('7/input.txt')
    .toString()
    .split(','),
)

function* createProgram(initialInputs: number[]) {
  INPUT = initialInputs
  OUTPUT = []

  let i = 0
  let intcodes: readonly number[] = originalIntcodes.slice()
  let opCode
  while ((opCode = intcodes[i]) && opCode != 99) {
    const action = parseOpCode(opCode)
    const result = performActionAndUpdate(action, i, intcodes)
    intcodes = result.intcodes
    i = result.jumpTarget
    if (OUTPUT.length > 0) {
      yield OUTPUT.shift()
    }
  }
}

function permutations(
  tokens: number[],
  subperms: number[][] = [[]],
): number[][] {
  return R.isEmpty(tokens)
    ? subperms
    : (R.addIndex(R.chain) as any)(
        (token: number, idx: number) =>
          permutations(
            R.remove(idx, 1, tokens),
            R.map(R.append(token), subperms),
          ),
        tokens,
      )
}

function runConfiguration(permutation: number[]) {
  let previousResult = 0
  const programs = permutation.map(d => {
    const program = createProgram([d, previousResult])
    previousResult = program.next().value as number // This side-effect is ugly
    return program
  })
  let i = 0
  while (true) {
    INPUT.push(previousResult)
    const result = programs[i].next()
    if (result.done) {
      break
    }
    i = (i + 1) % 5
    previousResult = result.value!
  }
  return previousResult
}

const getHighestOutput = R.pipe(
  R.map(runConfiguration),
  R.reduce(R.max, Number.NEGATIVE_INFINITY),
)

console.log('Highest:', getHighestOutput(permutations([5, 6, 7, 8, 9])))

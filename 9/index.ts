import { readFileSync } from 'fs'
import { prompt } from 'inquirer'
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
  MODIFY_RELATIVE_BASE = 9,
}

const FUNCTION_FOR_OPERATION: {
  [o in Operation]: (...args: any[]) => Promise<any>
} = {
  [Operation.ADD]: async function(a: number, b: number) {
    return a + b
  },
  [Operation.MULTIPLY]: async function(a: number, b: number) {
    return a * b
  },
  [Operation.INPUT]: async function() {
    const result: { input: number } = await prompt([
      { type: 'number', name: 'input' },
    ])
    return result.input
  },
  [Operation.OUTPUT]: async function(value: number) {
    console.log('Output:', value)
    return undefined
  },
  [Operation.JUMP_IF_TRUE]: async function(value: number, target: number) {
    return !!value ? target : undefined
  },
  [Operation.JUMP_IF_FALSE]: async function(value: number, target: number) {
    return !value ? target : undefined
  },
  [Operation.LESS_THAN]: async function(a: number, b: number) {
    return a < b ? 1 : 0
  },
  [Operation.EQUALS]: async function(a: number, b: number) {
    return a === b ? 1 : 0
  },
  [Operation.MODIFY_RELATIVE_BASE]: async function(value: number) {
    return value
  },
}

enum ParameterMode {
  POSITION,
  IMMEDIATE,
  RELATIVE,
}

interface Action {
  operation: Operation
  parameterCount: number
  getWriteIndex?: (
    i: number,
    relativeBase: number,
    intcodes: readonly number[],
  ) => number
  getParameters: Array<
    (i: number, relativeBase: number, intcodes: readonly number[]) => number
  >
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
  [Operation.MODIFY_RELATIVE_BASE]: 1,
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
  [Operation.MODIFY_RELATIVE_BASE]: 1,
}

const WRITE_PARAMETER_POSITION: { [o in Operation]: number } = {
  [Operation.ADD]: 3,
  [Operation.MULTIPLY]: 3,
  [Operation.INPUT]: 1,
  [Operation.OUTPUT]: -1,
  [Operation.JUMP_IF_TRUE]: -1,
  [Operation.JUMP_IF_FALSE]: -1,
  [Operation.LESS_THAN]: 3,
  [Operation.EQUALS]: 3,
  [Operation.MODIFY_RELATIVE_BASE]: -1,
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
    Operation.MODIFY_RELATIVE_BASE,
  ].includes(n as Operation)
}

const parseIntcodes = R.compose(
  R.reject(Number.isNaN),
  R.map((s: string) => parseInt(s, 10)),
)

async function performActionAndUpdate(
  action: Action,
  opPosition: number,
  relativeBase: number,
  intcodes: readonly number[],
) {
  const params = R.juxt(action.getParameters)(
    opPosition,
    relativeBase,
    intcodes,
  )
  const writeIndex = action.getWriteIndex?.(opPosition, relativeBase, intcodes)
  const result = await R.apply(FUNCTION_FOR_OPERATION[action.operation], params)
  const newIntcodes =
    writeIndex != null
      ? R.update(
          writeIndex,
          result,
          intcodes.concat(
            // if we try to write to an out of bounds index then increase array size
            R.repeat(0, Math.max(1 + writeIndex - intcodes.length, 0)),
          ),
        )
      : intcodes
  const jumpTarget =
    [Operation.JUMP_IF_FALSE, Operation.JUMP_IF_TRUE].includes(
      action.operation,
    ) && result != null
      ? result
      : opPosition + action.parameterCount + 1
  const newRelativeBase =
    action.operation === Operation.MODIFY_RELATIVE_BASE
      ? relativeBase + result
      : relativeBase
  return {
    intcodes: newIntcodes,
    jumpTarget,
    relativeBase: newRelativeBase,
  }
}

function getModeForNumber(n: number) {
  switch (n) {
    case 0:
      return ParameterMode.POSITION
    case 1:
      return ParameterMode.IMMEDIATE
    case 2:
      return ParameterMode.RELATIVE
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

function writeIndexGetter(o: Operation, modes: ParameterMode[]) {
  const writePosition = WRITE_PARAMETER_POSITION[o]
  if (writePosition < 0) {
    return undefined
  }
  const mode = modes[writePosition - 1]

  switch (mode) {
    case ParameterMode.POSITION:
      return (i: number, _relativeBase: number, intcodes: readonly number[]) =>
        intcodes[i + writePosition]
    case ParameterMode.RELATIVE:
      return (i: number, relativeBase: number, intcodes: readonly number[]) =>
        relativeBase + intcodes[i + writePosition]
    default:
      throw new Error(
        'Write index only support position or relative modes: ' + mode,
      )
  }
}

function parameterGetter(mode: ParameterMode, offset: number) {
  switch (mode) {
    case ParameterMode.IMMEDIATE:
      return (i: number, _relativeBase: number, intcodes: readonly number[]) =>
        intcodes[i + offset] || 0
    case ParameterMode.POSITION:
      return (i: number, _relativeBase: number, intcodes: readonly number[]) =>
        intcodes[intcodes[i + offset]] || 0
    case ParameterMode.RELATIVE:
      return (i: number, relativeBase: number, intcodes: readonly number[]) =>
        intcodes[relativeBase + intcodes[i + offset]] || 0
  }
}

function parameterGetters(o: Operation, modes: ParameterMode[]) {
  return R.range(0, INPUT_PARAMETER_COUNT[o]).map(i =>
    parameterGetter(modes[i], i + 1),
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
    getWriteIndex: writeIndexGetter(operation, modes),
    getParameters: parameterGetters(operation, modes),
  }
}

const originalIntcodes = parseIntcodes(
  readFileSync('9/input.txt')
    .toString()
    .split(','),
)

async function startProgram() {
  let intcodes: readonly number[] = originalIntcodes.slice()
  let i = 0
  let relativeBase = 0
  let opCode
  while ((opCode = intcodes[i]) && opCode != 99) {
    const action = parseOpCode(opCode)
    const result = await performActionAndUpdate(
      action,
      i,
      relativeBase,
      intcodes,
    )
    intcodes = result.intcodes
    i = result.jumpTarget
    relativeBase = result.relativeBase
  }
  console.log('Finished!')
}

startProgram()

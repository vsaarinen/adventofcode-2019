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
    return value
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

async function performActionAndUpdate(
  action: Action,
  i: number,
  intcodes: readonly number[],
) {
  const params = R.juxt(action.getParameters)(i, intcodes)
  const writeIndex = action.getWriteIndex?.(i, intcodes)
  const result = await R.apply(FUNCTION_FOR_OPERATION[action.operation], params)
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

async function start() {
  const originalIntcodes = parseIntcodes(
    readFileSync('5/input.txt')
      .toString()
      .split(','),
  )

  let i = 0
  let intcodes: readonly number[] = originalIntcodes.slice()
  let opCode
  while ((opCode = intcodes[i]) && opCode != 99) {
    const action = parseOpCode(opCode)
    const result = await performActionAndUpdate(action, i, intcodes)
    intcodes = result.intcodes
    i = result.jumpTarget
  }
}

start()

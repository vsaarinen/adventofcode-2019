import { readFileSync } from 'fs'
import * as R from 'ramda'

const ROW_WIDTH = 25
const ROW_COUNT = 6

const parseInput = R.pipe(
  R.split(''),
  R.map((c: string) => parseInt(c, 10)),
)

const generateLayers = R.splitEvery(ROW_WIDTH * ROW_COUNT)
const makePixelArray = R.transpose
const resolvePixel = R.find(R.complement(R.equals(2)))

const finalImage = R.pipe<string, number[], number[][], number[][], number[]>(
  parseInput,
  generateLayers,
  makePixelArray,
  R.map(resolvePixel),
)(readFileSync('8/input.txt').toString())

const printImage = R.pipe(
  R.map(R.ifElse(R.equals(0), R.always(' '), R.always('X'))),
  R.splitEvery(ROW_WIDTH),
  R.map(R.join('')),
  R.join('\n'),
)
console.log('final image:')
console.log(printImage(finalImage))

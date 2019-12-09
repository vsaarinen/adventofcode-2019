import { readFileSync } from 'fs'
import * as R from 'ramda'

const ROW_WIDTH = 25
const ROW_COUNT = 6

const parseInput = R.pipe(
  R.split(''),
  R.map((c: string) => parseInt(c, 10)),
)

const generateLayers = R.pipe<number[], number[][], number[][][]>(
  R.splitEvery(ROW_WIDTH),
  R.splitEvery(ROW_COUNT),
)

const countNumber = (n: number) =>
  R.pipe<
    number[][],
    number[],
    {
      [index: string]: number
    },
    number
  >(R.flatten, R.countBy(R.identity), R.prop(n.toString()))

const layerWithFewestZeros = (layers: number[][][]) =>
  R.reduce<number[][], number[][]>(
    R.minBy(countNumber(0)),
    layers[0],
  )(layers.slice(1))
const getChecksum: (xs: number[][]) => number = R.converge(R.multiply, [
  countNumber(1),
  countNumber(2),
])

const checksum = R.pipe(
  parseInput,
  generateLayers,
  layerWithFewestZeros,
  getChecksum,
)(readFileSync('8/input.txt').toString())
console.log('checksum:', checksum)

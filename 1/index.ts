import { readFileSync } from 'fs'
import * as R from 'ramda'

const parseInput = R.compose(
  R.reject(Number.isNaN),
  R.map((s: string) => parseInt(s, 10)),
)
const calculateFuelPerItem = R.compose(
  R.flip(R.subtract)(2),
  Math.floor,
  R.flip(R.divide)(3),
)
const calculateFuelForFuel = R.compose(
  R.sum,
  R.unfold((weight: number) =>
    weight <= 0 ? false : [weight, calculateFuelPerItem(weight)],
  ),
)

const moduleWeights = parseInput(
  readFileSync('1/input.txt')
    .toString()
    .split('\n'),
)
const moduleFuelWeights = R.map(calculateFuelPerItem, moduleWeights)
const totalNaive = R.sum(moduleFuelWeights)
const total = R.sum(R.map(calculateFuelForFuel, moduleFuelWeights))
console.log('Naive total fuel: ', totalNaive)
console.log('Proper total fuel: ', total)

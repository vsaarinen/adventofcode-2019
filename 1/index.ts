import { readFileSync } from 'fs'
import { compose, subtract, divide, __, sum, map } from 'ramda'

const input = readFileSync('1/input.txt')
  .toString()
  .split('\n')
  .map(Number)
const calculateFuelPerItem = compose(subtract(__, 2), Math.floor, divide(__, 3))
const calculateTotalFuel = compose(sum, map(calculateFuelPerItem))
const total = calculateTotalFuel(input)
console.log('Total fuel: ', total)

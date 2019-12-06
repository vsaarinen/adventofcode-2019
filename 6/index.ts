import { readFileSync } from 'fs'
import * as R from 'ramda'

const parseInput = R.compose(
  R.filter(R.where({ length: R.equals(2) })),
  R.map(R.split(')')),
)

interface Orbiter {
  orbits: string
}

interface System {
  [obj: string]: Orbiter
}

const generateSystem = R.reduce<string[], System>(
  (system, [orbits, orbiter]) => {
    system[orbiter] = {
      orbits,
    }
    return system
  },
  {},
)

function countAllOrbits(o: Orbiter, _id: string, system?: System): number {
  return !o ? 0 : 1 + countAllOrbits(system![o.orbits], o.orbits, system)
}

const countOrbits = R.pipe(
  R.mapObjIndexed<Orbiter, number, string>(countAllOrbits),
  R.values,
  R.sum,
)

const orbitPairs = parseInput(
  readFileSync('6/input.txt')
    .toString()
    .split('\n'),
)

console.log('Total orbits:', countOrbits(generateSystem(orbitPairs)))

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

function hierarchyTree(system: System) {
  function iterator(id: string): string[] {
    const orbiter = system[id]
    return !orbiter ? [id] : [id].concat(iterator(orbiter.orbits))
  }
  return iterator
}

const orbitPairs = parseInput(
  readFileSync('6/input.txt')
    .toString()
    .split('\n'),
)

const system = generateSystem(orbitPairs)

const findShortestPath = R.pipe(
  R.map(hierarchyTree(system)),
  R.apply(R.symmetricDifference),
  R.length as any,
  // We need to remove 'YOU' and 'SAN', re-add the common ancestor but remove
  // one since we're calculating movement
  R.subtract(R.__, 2),
)
console.log('Total orbits:', countOrbits(system))
console.log('Shortest path length:', findShortestPath(['YOU', 'SAN']))

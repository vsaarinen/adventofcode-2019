import { readFileSync } from 'fs'
import * as R from 'ramda'

type Direction = 'R' | 'U' | 'L' | 'D'
type Coordinate = [number, number]
type CoordinateWithCount = [number, number, number]
const getXCoord = R.view<CoordinateWithCount | Coordinate, number>(
  R.lensIndex(0),
)
const getYCoord = R.view<CoordinateWithCount | Coordinate, number>(
  R.lensIndex(1),
)
const getCount = R.view<CoordinateWithCount, number>(R.lensIndex(2))
interface Movement {
  direction: Direction
  amount: number
}

function validateDirection(s: string): s is Direction {
  return 'RULD'.includes(s)
}

function parseInput(input: string) {
  const selectDirection = R.lensIndex(0)
  const selectAmount = R.lensIndex(1)
  const validateAmount = R.complement(Number.isNaN)
  const validateAll = R.allPass([
    R.pipe(R.view(selectDirection), validateDirection),
    R.pipe(R.view(selectAmount), validateAmount),
  ])
  const convertAmount = R.over(selectAmount, Number)
  // R.zipObj(['direction', 'amount']) would be nicer but doesn't play well with TypeScript
  const createObject = ([direction, amount]: [Direction, number]) => ({
    direction,
    amount,
  })

  const parseMovement = R.pipe(
    R.match(/([RULD])(\d+)/),
    R.drop(1), // First result is the whole match
    convertAmount,
    R.unless(validateAll, parsedData => {
      throw new Error(`Invalid data: ${parsedData}`)
      // Ugh
      const d: [Direction, number] = ['U', 0]
      return d
    }),
    createObject,
  )
  const parseLine = R.compose(R.map(parseMovement), R.split(','))
  return R.compose(R.map(parseLine), R.split('\n'))(input)
}

function getMovementVector(direction: Direction): Coordinate {
  switch (direction) {
    case 'U':
      return [0, 1]
    case 'R':
      return [1, 0]
    case 'D':
      return [0, -1]
    case 'L':
      return [-1, 0]
  }
}

function getFinalPosition(
  { direction, amount }: Movement,
  startPosition: Coordinate,
): Coordinate {
  const getMovement = R.pipe(getMovementVector, R.map(R.multiply(amount)))
  const calculateFinalPosition = R.zipWith<number, number, number>(R.add)
  return calculateFinalPosition(startPosition, getMovement(direction)) as [
    number,
    number,
  ] // Ugh
}

/**
 * @param start Starting number
 * @param end Last number, inclusive
 */
function range(start: number, end: number) {
  if (start <= end) {
    return R.range(start, end + 1)
  }

  return R.reverse(R.range(end, start + 1))
}

function trailsBetweenPositions(
  startPosition: Coordinate,
  endPosition: Coordinate,
) {
  const coordinates = [getXCoord, getYCoord].map(getCoord =>
    range(getCoord(startPosition), getCoord(endPosition)),
  )
  if (coordinates.every(c => c.length !== 1)) {
    throw new Error(
      "Shouldn't move on more than one dimension! " +
        coordinates[0].length +
        ' ' +
        coordinates[1].length,
    )
  }
  // Remove the first one since we don't want to double-count the initial position
  return R.tail(R.xprod(coordinates[0], coordinates[1])) as Coordinate[]
}

function generateTrails(movements: Movement[]) {
  const generate = R.reduce(
    (
      [moveCount, position, trails]: [
        number,
        Coordinate,
        CoordinateWithCount[],
      ],
      command: Movement,
    ): [number, Coordinate, CoordinateWithCount[]] => {
      const finalPosition = getFinalPosition(command, position)
      const newTrails = trailsBetweenPositions(position, finalPosition)
      return [
        moveCount + newTrails.length,
        finalPosition,
        trails.concat(
          newTrails.map((coordinate, i) => [
            getXCoord(coordinate),
            getYCoord(coordinate),
            i + 1 + moveCount,
          ]),
        ),
      ]
    },
    [0, [0, 0], []],
  )
  const [, , trails] = generate(movements)
  return trails
}

class TwoKeyMap<T> {
  private __map__: {
    [firstKey: number]: { [secondKey: number]: T | undefined } | undefined
  }

  constructor() {
    this.__map__ = {}
  }

  public get = (key: number, nestedKey: number) => {
    return this.__map__[key]?.[nestedKey]
  }

  public set = (key: number, nestedKey: number, value: T) => {
    if (!this.__map__[key]) {
      this.__map__[key] = {}
    }

    if (!this.__map__[key]![nestedKey]) {
      Object.defineProperty(this.__map__[key], nestedKey, {
        value: value,
        configurable: true,
        enumerable: true,
      })
    }

    return this
  }
}

function findIntersections(trails: CoordinateWithCount[][]) {
  const firstWireTrailsMap = trails[0].reduce(
    (map, trail) => map.set(getXCoord(trail), getYCoord(trail), trail),
    new TwoKeyMap<CoordinateWithCount>(),
  )
  return trails[1].reduce<Array<[CoordinateWithCount, CoordinateWithCount]>>(
    (result, trail): Array<[CoordinateWithCount, CoordinateWithCount]> => {
      const firstWireTrail = firstWireTrailsMap.get(
        getXCoord(trail),
        getYCoord(trail),
      )
      if (firstWireTrail) {
        return result.concat([[firstWireTrail, trail]])
      }
      return result
    },
    [],
  )
}

const getTrails = R.map(generateTrails)

// const getIntersections = R.apply(R.innerJoin(coordinatesEqual)), // This is really slow

const toDistances = R.map(R.compose(R.sum, R.map(getCount)))

const getMin = R.reduce(R.min, Number.POSITIVE_INFINITY)

const lines: Movement[][] = parseInput(readFileSync('3/input.txt').toString())
const findShortestDistanceToIntersection = R.pipe(
  getTrails,
  findIntersections,
  toDistances,
  getMin,
)
console.log(
  'Closest intersection distance: ',
  findShortestDistanceToIntersection(lines),
)

import { readFileSync } from 'fs'
import * as R from 'ramda'

type Direction = 'R' | 'U' | 'L' | 'D'
type Coordinate = [number, number]
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
 * @param start First number
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
  const [xPositions, yPositions] = [0, 1].map(coord =>
    range(startPosition[coord], endPosition[coord]),
  )
  if (xPositions.length !== 1 && yPositions.length !== 1) {
    throw new Error(
      "Shouldn't move on more than one dimension! " +
        xPositions.length +
        ' ' +
        yPositions.length,
    )
  }
  return R.xprod(xPositions, yPositions) as Coordinate[] // Ugh
}

function coordinatesEqual(a: Coordinate, b: Coordinate) {
  return a[0] === b[0] && a[1] === b[1]
}

function generateTrails(movements: Movement[]) {
  const generate = R.reduce(
    (
      [position, trails]: [Coordinate, Coordinate[]],
      command: Movement,
    ): [Coordinate, Coordinate[]] => {
      const finalPosition = getFinalPosition(command, position)
      return [
        finalPosition,
        trails.concat(trailsBetweenPositions(position, finalPosition)),
      ]
    },
    [[0, 0], []],
  )
  const [, trails] = generate(movements)
  // Shouldn't really need to do this but speeds up the intersection detection later on
  const uniqueTrails = R.uniqWith(coordinatesEqual, trails)
  console.log('Generated' + uniqueTrails.length + 'trails')
  return uniqueTrails
}

const getTrails = R.map(generateTrails)

const getIntersections = R.pipe(
  R.apply(R.innerJoin(coordinatesEqual)), // This is really slow
  R.reject(R.equals([0, 0])), // Don't count [0, 0]
)

const getClosestDistance = R.pipe(
  R.map(R.compose(R.sum, R.map(Math.abs))),
  R.reduce(R.min, Number.POSITIVE_INFINITY),
)

const lines: Movement[][] = parseInput(readFileSync('3/input.txt').toString())
console.log('Parsed lines')
const trails = getTrails(lines)
console.log(`Done generating trails`)
const intersections = getIntersections(trails)
console.log(`Found ${intersections.length} intersections`)
const closest = getClosestDistance(intersections)
console.log('Closest intersection distance: ', closest)

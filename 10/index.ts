import { readFileSync } from 'fs'
import * as R from 'ramda'

type Coordinate = [number, number]

function lengthBetweenCoordinates(a: Coordinate, b: Coordinate) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
}

function isNearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.0000001
}

function isNotBehind(origin: Coordinate, asteroid: Coordinate) {
  const a = lengthBetweenCoordinates(origin, asteroid)
  return (otherAsteroid: Coordinate) =>
    asteroid === otherAsteroid ||
    !isNearlyEqual(
      a + lengthBetweenCoordinates(asteroid, otherAsteroid),
      lengthBetweenCoordinates(origin, otherAsteroid),
    )
}

function findVisibleAsteroids(allAsteroids: Coordinate[]) {
  return (origin: Coordinate) => {
    const otherAsteroids = allAsteroids.filter(a => a !== origin)
    return otherAsteroids.reduce(
      (visibleAsteroids, a) => visibleAsteroids.filter(isNotBehind(origin, a)),
      otherAsteroids,
    )
  }
}

const parseInput = R.pipe(R.split('\n'), R.map(R.split('')))

const asteroidMap = parseInput(readFileSync('10/input.txt').toString())
const mapHeight = asteroidMap.length
const mapWidth = mapHeight && asteroidMap[0].length // Assumes all rows are same size
const asteroidCoordinates = R.chain(
  y =>
    R.range(0, mapWidth)
      .filter(x => asteroidMap[y][x] === '#')
      .map<Coordinate>(x => [x, y]),
  R.range(0, mapHeight),
)
const mostVisibleAsteroids = R.pipe(
  R.map(findVisibleAsteroids(asteroidCoordinates)),
  R.map(R.length),
  R.reduce(R.max, Number.NEGATIVE_INFINITY),
)
console.log(
  'Most visible asteroids:',
  mostVisibleAsteroids(asteroidCoordinates),
)

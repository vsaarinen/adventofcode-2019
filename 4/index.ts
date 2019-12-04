import * as R from 'ramda'

const checkHasExactlyTwoAdjacentNumbers = R.pipe(
  // Split on character change. A bit buggy, generates extra 1-length arrays,
  // but doesn't matter in this case
  R.split(/(?<=([1-9]))(?=[1-9])(?!\1)/),
  R.any(R.propEq('length', 2)),
)
const checkAscendingNumbers = R.pipe(
  R.split(''),
  R.aperture(2),
  R.all(R.apply(R.lte as any)),
)
const countOfNumbers = R.pipe(
  R.map(R.toString),
  R.filter(
    R.allPass([checkHasExactlyTwoAdjacentNumbers, checkAscendingNumbers]),
  ),
  R.length,
)
const range = R.range(172930, 683082 + 1)
console.log('Count of matching numbers:', countOfNumbers(range))

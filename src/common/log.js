// @ts-check

const _noop = () => {}

/**
 * Return console instance based on the environment.
 *
 * @type {Console | {log: () => void, error: () => void}}
 */
const logger = console

export { logger }
export default logger

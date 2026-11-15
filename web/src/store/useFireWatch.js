import { useContext } from 'react'
import { FireWatchContext } from './FireWatchContext.js'

export function useFireWatch() {
  const context = useContext(FireWatchContext)

  if (!context) {
    throw new Error(
      'useFireWatch must be used inside a FireWatchProvider',
    )
  }

  return context
}

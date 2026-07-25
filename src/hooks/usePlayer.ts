import { useContext } from 'react'
import { PlayerContext, type PlayerState } from '../context/player-context'

export function usePlayer(): PlayerState {
  const player = useContext(PlayerContext)
  if (!player) throw new Error('usePlayer must be used inside PlayerProvider')
  return player
}

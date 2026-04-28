import { useEffect, useState } from 'react'
import { createGame } from '../game/core/createGame'

export function GameCanvas() {
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mountNode) {
      return
    }

    const game = createGame(mountNode)
    const resizeObserver = new ResizeObserver(() => {
      game.scale.resize(mountNode.clientWidth, mountNode.clientHeight)
      game.scale.updateBounds()
    })

    resizeObserver.observe(mountNode)

    return () => {
      resizeObserver.disconnect()
      game.destroy(true)
    }
  }, [mountNode])

  return <div className="game-canvas" ref={setMountNode} aria-label="Adrian's Carwash" />
}

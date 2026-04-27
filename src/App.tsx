import { useEffect, useMemo, useState } from 'react'
import Phaser from 'phaser'

type VehicleId = 'excavator' | 'tractor' | 'bulldozer'
type Screen = 'select' | 'wash' | 'complete'

type VehicleOption = {
  id: VehicleId
  label: string
  tagline: string
  accent: string
  silhouette: string
}

const vehicles: VehicleOption[] = [
  {
    id: 'excavator',
    label: 'Excavator',
    tagline: 'Long arm, big muddy jobs.',
    accent: '#ff9d2e',
    silhouette: 'EX',
  },
  {
    id: 'tractor',
    label: 'Tractor',
    tagline: 'Farm grit with chunky wheels.',
    accent: '#5ebc61',
    silhouette: 'TR',
  },
  {
    id: 'bulldozer',
    label: 'Bulldozer',
    tagline: 'Heavy blade, heavy dirt.',
    accent: '#f2c94c',
    silhouette: 'BD',
  },
]

type PreviewCallbacks = {
  onSprayStateChange: (value: boolean) => void
}

type PreviewSceneData = {
  vehicle: VehicleOption
  callbacks: PreviewCallbacks
}

class WashPreviewScene extends Phaser.Scene {
  private vehicle!: VehicleOption
  private callbacks!: PreviewCallbacks
  private sprayActive = false
  private sprayEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private vehicleGroup?: Phaser.GameObjects.Container
  private hintText?: Phaser.GameObjects.Text

  constructor() {
    super('wash-preview')
  }

  init(data: PreviewSceneData) {
    this.vehicle = data.vehicle
    this.callbacks = data.callbacks
  }

  create() {
    this.cameras.main.setBackgroundColor('#c5efff')

    this.buildTextures()
    this.drawBackdrop()
    this.drawVehicle()
    this.createWaterSpray()
    this.bindInput()
    this.layout(this.scale.width, this.scale.height)

    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this)
      this.callbacks.onSprayStateChange(false)
    })
  }

  private buildTextures() {
    if (!this.textures.exists('water-drop')) {
      const dot = this.add.graphics()
      dot.setVisible(false)
      dot.fillStyle(0x8bd3ff, 1)
      dot.fillCircle(10, 10, 10)
      dot.generateTexture('water-drop', 20, 20)
      dot.destroy()
    }
  }

  private drawBackdrop() {
    const sky = this.add.rectangle(0, 0, 10, 10, 0xc5efff).setOrigin(0)
    sky.setDepth(-20)
    sky.setName('sky')

    const ground = this.add.rectangle(0, 0, 10, 10, 0x4f9a63).setOrigin(0)
    ground.setDepth(-10)
    ground.setAlpha(0.9)
    ground.setName('ground')

    const sun = this.add.circle(0, 0, 56, 0xfff0ab)
    sun.setAlpha(0.8)
    sun.setName('sun')

    const cloudA = this.add.ellipse(0, 0, 160, 52, 0xffffff, 0.8)
    cloudA.setName('cloud-a')

    const cloudB = this.add.ellipse(0, 0, 120, 42, 0xffffff, 0.75)
    cloudB.setName('cloud-b')
  }

  private drawVehicle() {
    const body = this.add.rectangle(0, 0, 340, 140, Phaser.Display.Color.HexStringToColor(this.vehicle.accent).color)
    body.setStrokeStyle(6, 0x24313f, 0.6)
    body.setRounded(28)

    const cabin = this.add.rectangle(58, -54, 110, 78, 0xf6fbff)
    cabin.setStrokeStyle(5, 0x24313f, 0.3)
    cabin.setRounded(18)

    const wheelLeft = this.add.circle(-106, 84, 40, 0x263644)
    const wheelRight = this.add.circle(106, 84, 40, 0x263644)
    const hubLeft = this.add.circle(-106, 84, 18, 0xcfe6f0)
    const hubRight = this.add.circle(106, 84, 18, 0xcfe6f0)

    const badge = this.add.circle(-118, -34, 28, 0x24313f, 0.18)
    const badgeText = this.add
      .text(-118, -34, this.vehicle.silhouette, {
        fontFamily: '"Baloo 2", "Trebuchet MS", sans-serif',
        fontSize: '24px',
        fontStyle: '700',
        color: '#153449',
      })
      .setOrigin(0.5)

    const arm = this.add.rectangle(156, -10, 116, 20, 0x24313f)
    arm.setRotation(-0.45)
    arm.setRounded(10)

    const scoop = this.add.rectangle(206, -68, 54, 48, 0x24313f)
    scoop.setRotation(0.22)
    scoop.setRounded(12)

    const label = this.add
      .text(0, -154, `${this.vehicle.label} Preview`, {
        fontFamily: '"Bricolage Grotesque", "Segoe UI", sans-serif',
        fontSize: '34px',
        fontStyle: '700',
        color: '#17374d',
        align: 'center',
      })
      .setOrigin(0.5)

    this.hintText = this.add
      .text(0, 156, 'Press and hold anywhere on the scene to spray water.', {
        fontFamily: '"Bricolage Grotesque", "Segoe UI", sans-serif',
        fontSize: '20px',
        color: '#20445b',
        align: 'center',
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5)

    this.vehicleGroup = this.add.container(0, 0, [
      label,
      body,
      cabin,
      wheelLeft,
      wheelRight,
      hubLeft,
      hubRight,
      badge,
      badgeText,
      arm,
      scoop,
      this.hintText,
    ])
  }

  private createWaterSpray() {
    this.sprayEmitter = this.add.particles(0, 0, 'water-drop', {
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.5, end: 0.08 },
      speed: { min: 260, max: 470 },
      angle: { min: -110, max: -70 },
      lifespan: { min: 180, max: 380 },
      gravityY: 580,
      frequency: 22,
      quantity: 4,
      blendMode: 'ADD',
      emitting: false,
    })
  }

  private bindInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.sprayActive = true
      this.callbacks.onSprayStateChange(true)
      this.updateSpray(pointer)
      this.sprayEmitter?.start()
      this.hintText?.setText('Nice. Keep spraying to drain the Dirt Meter placeholder.')
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.sprayActive) {
        this.updateSpray(pointer)
      }
    })

    const stopSpray = () => {
      if (!this.sprayActive) {
        return
      }

      this.sprayActive = false
      this.callbacks.onSprayStateChange(false)
      this.sprayEmitter?.stop()
    }

    this.input.on('pointerup', stopSpray)
    this.input.on('gameout', stopSpray)
  }

  private updateSpray(pointer: Phaser.Input.Pointer) {
    this.sprayEmitter?.setPosition(pointer.x, pointer.y)
  }

  private layout(width: number, height: number) {
    const sky = this.children.getByName('sky') as Phaser.GameObjects.Rectangle | null
    const ground = this.children.getByName('ground') as Phaser.GameObjects.Rectangle | null
    const sun = this.children.getByName('sun') as Phaser.GameObjects.Arc | null
    const cloudA = this.children.getByName('cloud-a') as Phaser.GameObjects.Ellipse | null
    const cloudB = this.children.getByName('cloud-b') as Phaser.GameObjects.Ellipse | null

    sky?.setSize(width, height)
    ground?.setPosition(0, height * 0.74).setSize(width, height * 0.26)
    sun?.setPosition(width - 92, 88)
    cloudA?.setPosition(width * 0.26, 92)
    cloudB?.setPosition(width * 0.72, 128)

    const scale = Phaser.Math.Clamp(Math.min(width / 880, height / 620), 0.62, 1.1)
    this.vehicleGroup?.setPosition(width * 0.5, height * 0.5 + 18).setScale(scale)

    if (this.hintText) {
      this.hintText.setWordWrapWidth(Math.min(width - 80, 420))
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height)
  }
}

function createPreviewGame(
  parent: HTMLDivElement,
  vehicle: VehicleOption,
  callbacks: PreviewCallbacks,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    backgroundColor: '#00000000',
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 640,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [WashPreviewScene],
    physics: {
      default: 'arcade',
    },
    audio: {
      noAudio: true,
    },
    callbacks: {
      postBoot: (game) => {
        game.scene.start('wash-preview', { vehicle, callbacks } satisfies PreviewSceneData)
      },
    },
  })
}

type GamePreviewProps = {
  vehicle: VehicleOption
  onSprayStateChange: (value: boolean) => void
}

function GamePreview({ vehicle, onSprayStateChange }: GamePreviewProps) {
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mountNode) {
      return
    }

    const game = createPreviewGame(mountNode, vehicle, { onSprayStateChange })
    const resizeObserver = new ResizeObserver(() => {
      game.scale.resize(mountNode.clientWidth, mountNode.clientHeight)
    })

    resizeObserver.observe(mountNode)

    return () => {
      resizeObserver.disconnect()
      game.destroy(true)
      onSprayStateChange(false)
    }
  }, [mountNode, onSprayStateChange, vehicle])

  return <div className="game-preview" ref={setMountNode} aria-label={`${vehicle.label} game preview`} />
}

function App() {
  const [screen, setScreen] = useState<Screen>('select')
  const [selectedVehicleId, setSelectedVehicleId] = useState<VehicleId>('excavator')
  const [dirtRemaining, setDirtRemaining] = useState(100)
  const [isSpraying, setIsSpraying] = useState(false)

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0],
    [selectedVehicleId],
  )

  useEffect(() => {
    if (screen !== 'wash' || !isSpraying) {
      return
    }

    const timer = window.setInterval(() => {
      setDirtRemaining((current) => Math.max(0, current - 2))
    }, 90)

    return () => window.clearInterval(timer)
  }, [isSpraying, screen])

  useEffect(() => {
    if (screen === 'wash' && dirtRemaining === 0) {
      setIsSpraying(false)
      setScreen('complete')
    }
  }, [dirtRemaining, screen])

  const handleVehicleSelect = (vehicleId: VehicleId) => {
    setSelectedVehicleId(vehicleId)
    setDirtRemaining(100)
    setIsSpraying(false)
    setScreen('wash')
  }

  const restartCurrentVehicle = () => {
    setDirtRemaining(100)
    setIsSpraying(false)
    setScreen('wash')
  }

  const chooseAnotherVehicle = () => {
    setDirtRemaining(100)
    setIsSpraying(false)
    setScreen('select')
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Phase 1 Preview</p>
          <h1>Adrian&apos;s Carwash</h1>
          <p className="hero-copy">
            We now have the project scaffold, a responsive game shell, Phaser rendering, and a
            placeholder vehicle-cleaning loop that works with mouse and touch hold input.
          </p>
        </div>
        <div className="status-chip-row" aria-label="build status">
          <span className="status-chip">Desktop + mobile ready</span>
          <span className="status-chip">Phaser mounted</span>
          <span className="status-chip">Select / Wash / Complete flow</span>
        </div>
      </section>

      {screen === 'select' && (
        <section className="screen-card">
          <div className="section-heading">
            <p className="section-kicker">Choose What To Clean</p>
            <h2>Pick a muddy machine</h2>
            <p>
              The real transparent-background vehicle art will slot into these choices in the next
              phases.
            </p>
          </div>

          <div className="vehicle-grid">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                className="vehicle-card"
                type="button"
                onClick={() => handleVehicleSelect(vehicle.id)}
                style={{ ['--vehicle-accent' as string]: vehicle.accent }}
              >
                <span className="vehicle-badge">{vehicle.silhouette}</span>
                <strong>{vehicle.label}</strong>
                <span>{vehicle.tagline}</span>
                <span className="vehicle-action">Start Washing</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === 'wash' && (
        <section className="screen-card wash-layout">
          <div className="wash-sidebar">
            <div className="section-heading">
              <p className="section-kicker">Wash Scene</p>
              <h2>{selectedVehicle.label}</h2>
              <p>
                Press and hold inside the game area to spray. For Phase 1, the Dirt Meter is a
                stand-in for the future dirt-mask system.
              </p>
            </div>

            <div className="meter-panel">
              <div className="meter-copy">
                <span className="meter-label">Dirt Meter</span>
                <strong>{dirtRemaining}%</strong>
              </div>
              <div className="meter-track" aria-hidden="true">
                <div className="meter-fill" style={{ height: `${dirtRemaining}%` }} />
              </div>
            </div>

            <div className="wash-actions">
              <span className={`spray-indicator ${isSpraying ? 'is-active' : ''}`}>
                {isSpraying ? 'Spraying' : 'Ready'}
              </span>
              <button type="button" className="secondary-button" onClick={chooseAnotherVehicle}>
                Back To Vehicles
              </button>
            </div>
          </div>

          <div className="wash-stage">
            <GamePreview vehicle={selectedVehicle} onSprayStateChange={setIsSpraying} />
          </div>
        </section>
      )}

      {screen === 'complete' && (
        <section className="screen-card completion-card">
          <div className="section-heading">
            <p className="section-kicker">Round Complete</p>
            <h2>{selectedVehicle.label} is sparkling</h2>
            <p>
              This placeholder celebration marks the end of the loop. Dirt masking, true cleaning
              logic, and final FX land in the next phases.
            </p>
          </div>

          <div className="celebration-burst" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="completion-actions">
            <button type="button" className="primary-button" onClick={restartCurrentVehicle}>
              Clean Again
            </button>
            <button type="button" className="secondary-button" onClick={chooseAnotherVehicle}>
              Choose Another Vehicle
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App

import Phaser from 'phaser'
import { getVehicleById } from '../config/vehicleCatalog'
import { DirtOverlay } from '../systems/DirtOverlay'
import type { WashSceneData, VehicleId } from '../types/gameTypes'

const TITLE_FONT = '"Trebuchet MS", "Verdana", sans-serif'
const HOSE_BASE_ANGLE = -Math.PI / 2
const HOSE_MIN_ANGLE = Phaser.Math.DegToRad(-176)
const HOSE_MAX_ANGLE = Phaser.Math.DegToRad(-4)

export class WashScene extends Phaser.Scene {
  private vehicleId: VehicleId = 'excavator'
  private root?: Phaser.GameObjects.Container
  private overlayGraphics?: Phaser.GameObjects.Graphics
  private overlayBlocker?: Phaser.GameObjects.Zone
  private hoseGraphics?: Phaser.GameObjects.Graphics
  private impactGraphics?: Phaser.GameObjects.Graphics
  private dirtMeterGraphics?: Phaser.GameObjects.Graphics
  private dirtMeterText?: Phaser.GameObjects.Text
  private sprayEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private splashEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private celebrationModal?: Phaser.GameObjects.Container
  private fireworkTimer?: Phaser.Time.TimerEvent
  private activeFireworks: Phaser.GameObjects.Particles.ParticleEmitter[] = []
  private dirtOverlay?: DirtOverlay
  private currentHoseAngle = HOSE_BASE_ANGLE
  private targetHoseAngle = HOSE_BASE_ANGLE
  private hoseBase = new Phaser.Math.Vector2()
  private nozzleTip = new Phaser.Math.Vector2()
  private sprayTarget = new Phaser.Math.Vector2()
  private spraying = false
  private isComplete = false
  private bigBrushCheatEnabled = false

  constructor() {
    super('wash')
  }

  init(data: Partial<WashSceneData>) {
    this.vehicleId = data.vehicleId ?? 'excavator'
  }

  create() {
    this.buildParticleTextures()
    this.isComplete = false

    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this)
      this.clearRoot()
    })

    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.on('pointermove', this.handlePointerMove, this)
    this.input.on('pointerup', this.handlePointerUp, this)
    this.input.on('gameout', this.handleGameOut, this)
    this.input.keyboard?.on('keydown', this.handleKeyDown, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointerDown, this)
      this.input.off('pointermove', this.handlePointerMove, this)
      this.input.off('pointerup', this.handlePointerUp, this)
      this.input.off('gameout', this.handleGameOut, this)
      this.input.keyboard?.off('keydown', this.handleKeyDown, this)
    })

    this.renderScene()
  }

  update(_: number, delta: number) {
    const angleDelta = Phaser.Math.Angle.Wrap(this.targetHoseAngle - this.currentHoseAngle)
    this.currentHoseAngle += angleDelta * Math.min(1, delta * 0.012)
    this.drawHose()

    if (this.spraying && this.input.activePointer.isDown) {
      this.updateSprayTarget(this.input.activePointer)
    }

    this.syncSprayVisuals()
    this.checkCompletion()
  }

  private renderScene() {
    this.stopSpray()
    this.stopCelebration()
    this.clearRoot()

    const vehicle = getVehicleById(this.vehicleId)
    const width = this.scale.width
    const height = this.scale.height
    const isMobileLayout = width < 768

    this.cameras.main.setBackgroundColor('#82d8ff')
    this.root = this.add.container(0, 0)
    this.hoseBase.set(width * 0.5, height - 8)

    const skyGlow = this.add.circle(width * 0.85, height * 0.16, 180, 0xffffff, 0.16)
    const cloudA = this.add.ellipse(width * 0.22, height * 0.17, 158, 46, 0xffffff, 0.74)
    const cloudB = this.add.ellipse(width * 0.72, height * 0.24, 126, 38, 0xffffff, 0.68)
    const hillFar = this.add.ellipse(
      width * 0.34,
      height + (isMobileLayout ? 26 : 10),
      width * 0.92,
      height * (isMobileLayout ? 0.48 : 0.34),
      0x86d16c,
      1,
    )
    const hillNear = this.add.ellipse(
      width * 0.72,
      height + (isMobileLayout ? 54 : 32),
      width * 1.18,
      height * (isMobileLayout ? 0.58 : 0.42),
      0x5db761,
      1,
    )
    const dirtPatch = this.add.ellipse(
      width * 0.5,
      height * (isMobileLayout ? 0.935 : 0.9),
      width * 0.7,
      height * (isMobileLayout ? 0.17 : 0.13),
      0x86633c,
      0.55,
    )

    const sprite = this.add.image(width * 0.5, height * (isMobileLayout ? 0.63 : 0.53), vehicle.assetKey)
    const maxSpriteWidth = width * (isMobileLayout ? 0.92 : 0.72)
    const maxSpriteHeight = height * (isMobileLayout ? 0.6 : 0.54)
    const spriteScale = Math.min(maxSpriteWidth / sprite.width, maxSpriteHeight / sprite.height)
    sprite.setScale(spriteScale)
    this.dirtOverlay = DirtOverlay.create(this, {
      sourceTextureKey: vehicle.assetKey,
      textureKey: `dirt-overlay-${vehicle.id}`,
      worldX: sprite.x,
      worldY: sprite.y,
      worldWidth: sprite.displayWidth,
      worldHeight: sprite.displayHeight,
    })
    this.overlayGraphics = this.add.graphics()

    this.sprayEmitter = this.add.particles(0, 0, 'water-drop', {
      alpha: { start: 0.92, end: 0.2 },
      scale: { start: 0.3, end: 0.08 },
      lifespan: { min: 90, max: 140 },
      quantity: 3,
      frequency: 16,
      radial: false,
      speedX: 0,
      speedY: -800,
      gravityY: 0,
      emitting: false,
      blendMode: 'NORMAL',
    })

    this.splashEmitter = this.add.particles(0, 0, 'water-drop', {
      alpha: { start: 0.7, end: 0 },
      scale: { start: 0.22, end: 0.04 },
      speed: { min: 24, max: 78 },
      angle: { min: 205, max: 335 },
      gravityY: 260,
      lifespan: { min: 120, max: 220 },
      quantity: 2,
      frequency: 36,
      emitting: false,
      blendMode: 'NORMAL',
    })

    this.impactGraphics = this.add.graphics()
    this.hoseGraphics = this.add.graphics()
    this.dirtMeterGraphics = this.add.graphics()
    this.dirtMeterText = this.add
      .text(48, 298, '100%', {
        fontFamily: TITLE_FONT,
        fontSize: '18px',
        color: '#fff6d2',
        fontStyle: '700',
        stroke: '#5c3818',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0.5)

    const backButton = this.add.graphics()
    backButton.fillStyle(0x2d95b7, 1)
    backButton.fillRoundedRect(24, 22, 140, 48, 18)
    backButton.lineStyle(3, 0x114154, 1)
    backButton.strokeRoundedRect(24, 22, 140, 48, 18)

    const backLabel = this.add
      .text(94, 46, 'Garage', {
        fontFamily: TITLE_FONT,
        fontSize: '22px',
        color: '#f2fffc',
        fontStyle: '700',
        stroke: '#0f4256',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    const backHitArea = this.add.zone(24, 22, 140, 48).setOrigin(0)
    backHitArea.setInteractive({ useHandCursor: true })
    backHitArea.on('pointerdown', () => {
      this.scene.start('menu')
    })

    this.root.add([
      skyGlow,
      cloudA,
      cloudB,
      hillFar,
      hillNear,
      dirtPatch,
      sprite,
      this.dirtOverlay.gameObject,
      this.sprayEmitter,
      this.impactGraphics,
      this.splashEmitter,
      this.hoseGraphics,
      this.dirtMeterGraphics,
      this.dirtMeterText,
      this.overlayGraphics,
      backButton,
      backLabel,
      backHitArea,
    ])

    this.drawHose()
    this.drawDirtMeter()
    this.drawCompletionOverlay()
  }

  private handleResize() {
    this.renderScene()
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.isComplete) {
      return
    }

    this.spraying = true
    this.updateSprayTarget(pointer)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.isComplete) {
      return
    }

    if (pointer.isDown || this.spraying) {
      this.updateSprayTarget(pointer)
      return
    }

    if (!this.spraying) {
      this.updateAimAngle(pointer)
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (!pointer.isDown) {
      this.stopSpray()
    }
  }

  private handleGameOut() {
    this.stopSpray()
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      this.bigBrushCheatEnabled = true
    }
  }

  private updateSprayTarget(pointer: Phaser.Input.Pointer) {
    this.sprayTarget.set(pointer.x, pointer.y)
    this.updateAimAngle(pointer)
  }

  private updateAimAngle(pointer: Phaser.Input.Pointer) {
    const angle = Phaser.Math.Angle.Between(this.hoseBase.x, this.hoseBase.y, pointer.x, pointer.y)
    this.targetHoseAngle = Phaser.Math.Clamp(angle, HOSE_MIN_ANGLE, HOSE_MAX_ANGLE)
  }

  private drawHose() {
    if (!this.hoseGraphics) {
      return
    }

    const graphics = this.hoseGraphics
    const width = this.scale.width
    const height = this.scale.height
    const isMobileLayout = width < 768
    const hoseLength = isMobileLayout ? Math.min(width * 0.24, 180) : Math.min(width * 0.13, 128)
    const nozzleLength = Math.min(width * 0.038, 34)
    const nozzleWidth = Math.min(width * 0.018, 16)
    const base = this.hoseBase

    const nozzleX = base.x + Math.cos(this.currentHoseAngle) * hoseLength
    const nozzleY = base.y + Math.sin(this.currentHoseAngle) * hoseLength
    const midX = (base.x + nozzleX) * 0.5
    const midY = (base.y + nozzleY) * 0.5
    const bend = Phaser.Math.Clamp((base.x - nozzleX) * 0.12, -28, 28)
    const controlX = midX + bend
    const controlY = midY + height * 0.05
    const nozzleAngle = this.currentHoseAngle
    const nozzleDx = Math.cos(nozzleAngle)
    const nozzleDy = Math.sin(nozzleAngle)
    const nozzlePx = -nozzleDy
    const nozzlePy = nozzleDx
    const nozzleBaseX = nozzleX - nozzleDx * nozzleLength * 0.7
    const nozzleBaseY = nozzleY - nozzleDy * nozzleLength * 0.7
    const nozzleTipX = nozzleX + nozzleDx * nozzleLength * 0.3
    const nozzleTipY = nozzleY + nozzleDy * nozzleLength * 0.3
    this.nozzleTip.set(nozzleTipX, nozzleTipY)
    const hoseCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(base.x, base.y),
      new Phaser.Math.Vector2(controlX, controlY),
      new Phaser.Math.Vector2(nozzleBaseX, nozzleBaseY),
    )
    const hoseHighlightCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(base.x - 5, base.y - 8),
      new Phaser.Math.Vector2(controlX - bend * 0.18, controlY - 8),
      new Phaser.Math.Vector2(nozzleBaseX - 4, nozzleBaseY - 6),
    )
    const hosePoints = hoseCurve.getPoints(18)
    const hoseHighlightPoints = hoseHighlightCurve.getPoints(18)

    graphics.clear()

    graphics.lineStyle(24, 0x10171d, 0.5)
    graphics.strokePoints(hosePoints, false, false)

    graphics.lineStyle(16, 0x6a737b, 1)
    graphics.strokePoints(hosePoints, false, false)

    graphics.lineStyle(6, 0x232c31, 0.45)
    graphics.strokePoints(hoseHighlightPoints, false, false)

    graphics.fillStyle(0x161e24, 1)
    graphics.fillCircle(base.x, base.y, 32)
    graphics.fillStyle(0x5f676e, 1)
    graphics.fillCircle(base.x, base.y, 21)
    graphics.fillStyle(0x1b2328, 1)
    graphics.fillRoundedRect(base.x - 42, height - 28, 84, 18, 9)

    graphics.fillStyle(0x171d22, 1)
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(nozzleBaseX + nozzlePx * nozzleWidth, nozzleBaseY + nozzlePy * nozzleWidth),
        new Phaser.Math.Vector2(nozzleBaseX - nozzlePx * nozzleWidth, nozzleBaseY - nozzlePy * nozzleWidth),
        new Phaser.Math.Vector2(nozzleTipX - nozzlePx * (nozzleWidth * 0.54), nozzleTipY - nozzlePy * (nozzleWidth * 0.54)),
        new Phaser.Math.Vector2(nozzleTipX + nozzlePx * (nozzleWidth * 0.54), nozzleTipY + nozzlePy * (nozzleWidth * 0.54)),
      ],
      true,
    )

    graphics.lineStyle(4, 0x8f979d, 1)
    graphics.beginPath()
    graphics.moveTo(nozzleBaseX + nozzlePx * (nozzleWidth * 0.36), nozzleBaseY + nozzlePy * (nozzleWidth * 0.36))
    graphics.lineTo(nozzleTipX + nozzlePx * (nozzleWidth * 0.2), nozzleTipY + nozzlePy * (nozzleWidth * 0.2))
    graphics.moveTo(nozzleBaseX - nozzlePx * (nozzleWidth * 0.36), nozzleBaseY - nozzlePy * (nozzleWidth * 0.36))
    graphics.lineTo(nozzleTipX - nozzlePx * (nozzleWidth * 0.2), nozzleTipY - nozzlePy * (nozzleWidth * 0.2))
    graphics.strokePath()
  }

  private syncSprayVisuals() {
    if (!this.spraying) {
      this.impactGraphics?.clear()
      this.drawDirtMeter()
      return
    }

    const distance = Phaser.Math.Distance.Between(
      this.nozzleTip.x,
      this.nozzleTip.y,
      this.sprayTarget.x,
      this.sprayTarget.y,
    )
    const spraySpeed = Phaser.Math.Clamp(distance * 6.2, 540, 980)
    const sprayLifespan = Phaser.Math.Clamp(distance * 0.42, 90, 180)
    const impactRadius = this.bigBrushCheatEnabled
      ? this.scale.width < 768
        ? 72
        : 64
      : this.scale.width < 768
        ? 20
        : 16
    const pulse = 1 + Math.sin(this.time.now * 0.02) * 0.08
    const directionX = distance > 0 ? (this.sprayTarget.x - this.nozzleTip.x) / distance : 0
    const directionY = distance > 0 ? (this.sprayTarget.y - this.nozzleTip.y) / distance : -1

    if (this.sprayEmitter) {
      this.sprayEmitter.setPosition(this.nozzleTip.x, this.nozzleTip.y)
      this.sprayEmitter.speedX = directionX * spraySpeed
      this.sprayEmitter.speedY = directionY * spraySpeed
      this.sprayEmitter.lifespan = { min: sprayLifespan * 0.82, max: sprayLifespan }

      if (!this.sprayEmitter.emitting) {
        this.sprayEmitter.start()
      }
    }

    if (this.splashEmitter) {
      this.splashEmitter.setPosition(this.sprayTarget.x, this.sprayTarget.y)

      if (!this.splashEmitter.emitting) {
        this.splashEmitter.start()
      }
    }

    if (this.impactGraphics) {
      this.impactGraphics.clear()
      this.impactGraphics.fillStyle(0xb8ecff, 0.22)
      this.impactGraphics.fillCircle(this.sprayTarget.x, this.sprayTarget.y, impactRadius * 1.35 * pulse)
      this.impactGraphics.fillStyle(0xe8fbff, 0.3)
      this.impactGraphics.fillCircle(this.sprayTarget.x, this.sprayTarget.y, impactRadius * 0.82 * pulse)
      this.impactGraphics.lineStyle(2, 0xe7fbff, 0.55)
      this.impactGraphics.strokeCircle(this.sprayTarget.x, this.sprayTarget.y, impactRadius * pulse)
    }

    this.dirtOverlay?.clearAtWorldPoint(this.sprayTarget.x, this.sprayTarget.y, impactRadius * 0.9)
    this.drawDirtMeter()

  }

  private stopSpray() {
    this.spraying = false
    this.sprayEmitter?.stop()
    this.splashEmitter?.stop()
    this.impactGraphics?.clear()
  }

  private buildParticleTextures() {
    if (!this.textures.exists('water-drop')) {
      const dot = this.add.graphics()
      dot.setVisible(false)
      dot.fillStyle(0x4bb6ff, 1)
      dot.fillCircle(12, 12, 12)
      dot.fillStyle(0xbfe9ff, 0.55)
      dot.fillCircle(9, 9, 6)
      dot.generateTexture('water-drop', 24, 24)
      dot.destroy()
    }

    this.buildSparkTexture('spark-gold', 0xffcf5a)
    this.buildSparkTexture('spark-coral', 0xff7f6b)
    this.buildSparkTexture('spark-sky', 0x73d9ff)
    this.buildSparkTexture('spark-lime', 0x8fe36f)
    this.buildSparkTexture('spark-cream', 0xfff3b6)
  }

  private drawDirtMeter() {
    if (!this.dirtMeterGraphics || !this.dirtMeterText) {
      return
    }

    const ratio = this.dirtOverlay?.remainingRatio ?? 1
    const percent = this.dirtOverlay?.remainingPercent ?? 100
    const meterX = 34
    const meterY = 92
    const meterWidth = 28
    const meterHeight = 182
    const fillHeight = meterHeight * ratio

    this.dirtMeterGraphics.clear()

    this.dirtMeterGraphics.fillStyle(0xead9bb, 1)
    this.dirtMeterGraphics.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, 18)
    this.dirtMeterGraphics.lineStyle(3, 0x7a5b35, 1)
    this.dirtMeterGraphics.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, 18)

    if (fillHeight > 0) {
      this.dirtMeterGraphics.fillStyle(0x7f5730, 1)
      this.dirtMeterGraphics.fillRoundedRect(
        meterX + 5,
        meterY + meterHeight - fillHeight + 5,
        meterWidth - 10,
        Math.max(0, fillHeight - 10),
        12,
      )
      this.dirtMeterGraphics.fillStyle(0xb07a42, 0.55)
      this.dirtMeterGraphics.fillRoundedRect(
        meterX + 8,
        meterY + meterHeight - fillHeight + 10,
        meterWidth - 19,
        Math.max(0, fillHeight * 0.34),
        8,
      )
    }

    this.dirtMeterText.setPosition(meterX + meterWidth * 0.5, meterY + meterHeight + 24)
    this.dirtMeterText.setText(`${percent}%`)
  }

  private handleCompletion() {
    this.isComplete = true
    this.stopSpray()
    this.drawDirtMeter()
    this.startCelebration()
    this.drawCompletionOverlay()
  }

  private checkCompletion() {
    if (this.isComplete || !this.dirtOverlay?.isClean) {
      return
    }

    this.handleCompletion()
  }

  private startCelebration() {
    this.fireworkTimer?.remove(false)
    this.fireworkTimer = this.time.addEvent({
      delay: 620,
      loop: true,
      callback: () => {
        this.launchFireworkBurst()
      },
    })

    this.launchFireworkBurst()
    this.launchFireworkBurst()
  }

  private stopCelebration() {
    this.fireworkTimer?.remove(false)
    this.fireworkTimer = undefined

    for (const firework of this.activeFireworks) {
      firework.destroy()
    }

    this.activeFireworks = []
  }

  private launchFireworkBurst() {
    if (!this.root) {
      return
    }

    const width = this.scale.width
    const height = this.scale.height
    const burstX = Phaser.Math.Between(Math.round(width * 0.14), Math.round(width * 0.86))
    const burstY = Phaser.Math.Between(Math.round(height * 0.12), Math.round(height * 0.42))
    const textureKey = Phaser.Utils.Array.GetRandom([
      'spark-gold',
      'spark-coral',
      'spark-sky',
      'spark-lime',
      'spark-cream',
    ])
    const firework = this.add.particles(burstX, burstY, textureKey, {
      alpha: { start: 1, end: 0 },
      scale: { start: 0.5, end: 0.1 },
      speed: { min: 120, max: 230 },
      angle: { min: 0, max: 360 },
      gravityY: 140,
      lifespan: { min: 950, max: 1350 },
      quantity: 1,
      emitting: false,
      blendMode: 'NORMAL',
    })

    this.root.add(firework)
    this.root.sendToBack(firework)
    this.activeFireworks.push(firework)
    firework.explode(26)

    this.time.delayedCall(1500, () => {
      firework.destroy()
      this.activeFireworks = this.activeFireworks.filter((activeFirework) => activeFirework !== firework)
    })
  }

  private drawCompletionOverlay() {
    this.overlayGraphics?.clear()
    this.overlayBlocker?.destroy()
    this.overlayBlocker = undefined
    this.celebrationModal?.destroy(true)
    this.celebrationModal = undefined

    if (!this.isComplete || !this.overlayGraphics || !this.root) {
      return
    }

    const width = this.scale.width
    const height = this.scale.height
    const isMobileLayout = width < 768
    const modalWidth = Math.min(width - 40, isMobileLayout ? 360 : 460)
    const modalHeight = isMobileLayout ? 238 : 224
    const modalX = width * 0.5
    const modalY = height * 0.5

    this.overlayBlocker = this.add.zone(0, 0, width, height).setOrigin(0)
    this.overlayBlocker.setInteractive()
    this.overlayBlocker.on('pointerdown', () => {})

    this.overlayGraphics.fillStyle(0x163041, 0.34)
    this.overlayGraphics.fillRect(0, 0, width, height)

    const modal = this.add.container(modalX, modalY)
    const board = this.add.graphics()
    board.fillStyle(0x6f4b30, 1)
    board.fillRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 24)
    board.lineStyle(6, 0x352114, 1)
    board.strokeRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 24)
    board.fillStyle(0xf8efc8, 1)
    board.fillRoundedRect(-modalWidth / 2 + 12, -modalHeight / 2 + 12, modalWidth - 24, modalHeight - 24, 20)
    board.lineStyle(3, 0xaf8751, 1)
    board.strokeRoundedRect(-modalWidth / 2 + 12, -modalHeight / 2 + 12, modalWidth - 24, modalHeight - 24, 20)

    const title = this.add
      .text(0, -50, 'Cleaning completed!', {
        fontFamily: TITLE_FONT,
        fontSize: isMobileLayout ? '28px' : '34px',
        color: '#fff6d2',
        fontStyle: '700',
        stroke: '#6a451f',
        strokeThickness: 7,
        align: 'center',
      })
      .setOrigin(0.5)

    const cleanAgainButton = this.createModalButton(
      0,
      28,
      Math.min(modalWidth - 70, 250),
      48,
      0x2fae73,
      0x176047,
      'Clean Again',
      () => {
        this.scene.restart({ vehicleId: this.vehicleId })
      },
    )

    const garageButton = this.createModalButton(
      0,
      88,
      Math.min(modalWidth - 70, 250),
      48,
      0x2d95b7,
      0x114154,
      'Garage',
      () => {
        this.scene.start('menu')
      },
    )

    modal.add([board, title, cleanAgainButton, garageButton])
    this.celebrationModal = modal
    this.root.add([this.overlayBlocker, modal])
    this.root.bringToTop(this.overlayBlocker)
    this.root.bringToTop(this.overlayGraphics)
    this.root.bringToTop(modal)
  }

  private createModalButton(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    strokeColor: number,
    label: string,
    onClick: () => void,
  ) {
    const button = this.add.container(x, y)
    const graphics = this.add.graphics()
    graphics.fillStyle(fillColor, 1)
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 18)
    graphics.lineStyle(3, strokeColor, 1)
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 18)

    const text = this.add
      .text(0, 0, label, {
        fontFamily: TITLE_FONT,
        fontSize: '22px',
        color: '#f2fffc',
        fontStyle: '700',
        stroke: `#${strokeColor.toString(16).padStart(6, '0')}`,
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    const hitArea = this.add.zone(0, 0, width, height).setOrigin(0.5)
    hitArea.setInteractive({ useHandCursor: true })
    hitArea.on('pointerover', () => {
      this.tweens.killTweensOf(button)
      this.tweens.add({
        targets: button,
        scale: 1.03,
        duration: 120,
        ease: 'Quad.Out',
      })
    })
    hitArea.on('pointerout', () => {
      this.tweens.killTweensOf(button)
      this.tweens.add({
        targets: button,
        scale: 1,
        duration: 120,
        ease: 'Quad.Out',
      })
    })
    hitArea.on('pointerdown', () => {
      this.tweens.killTweensOf(button)
      this.tweens.add({
        targets: button,
        scale: 0.98,
        duration: 70,
        yoyo: true,
        ease: 'Quad.Out',
      })
      onClick()
    })

    button.add([graphics, text, hitArea])
    return button
  }

  private clearRoot() {
    if (this.root) {
      this.root.destroy(true)
      this.root = undefined
    }

    this.overlayGraphics = undefined
    this.overlayBlocker = undefined
    this.celebrationModal = undefined
    this.activeFireworks = []
    this.impactGraphics = undefined
    this.dirtMeterGraphics = undefined
    this.dirtMeterText = undefined
    this.hoseGraphics = undefined
    this.sprayEmitter = undefined
    this.splashEmitter = undefined
    this.dirtOverlay?.destroy()
    this.dirtOverlay = undefined
  }

  private buildSparkTexture(textureKey: string, color: number) {
    if (this.textures.exists(textureKey)) {
      return
    }

    const spark = this.add.graphics()
    spark.setVisible(false)
    spark.fillStyle(color, 1)
    spark.fillCircle(8, 8, 8)
    spark.fillStyle(0xffffff, 0.4)
    spark.fillCircle(6, 6, 3)
    spark.generateTexture(textureKey, 16, 16)
    spark.destroy()
  }
}

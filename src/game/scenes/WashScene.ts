import Phaser from 'phaser'
import { getVehicleById } from '../config/vehicleCatalog'
import type { WashSceneData, VehicleId } from '../types/gameTypes'

const TITLE_FONT = '"Trebuchet MS", "Verdana", sans-serif'
const HOSE_BASE_ANGLE = -Math.PI / 2
const HOSE_MIN_ANGLE = Phaser.Math.DegToRad(-176)
const HOSE_MAX_ANGLE = Phaser.Math.DegToRad(-4)

export class WashScene extends Phaser.Scene {
  private vehicleId: VehicleId = 'excavator'
  private root?: Phaser.GameObjects.Container
  private hoseGraphics?: Phaser.GameObjects.Graphics
  private currentHoseAngle = HOSE_BASE_ANGLE
  private targetHoseAngle = HOSE_BASE_ANGLE
  private hoseBase = new Phaser.Math.Vector2()

  constructor() {
    super('wash')
  }

  init(data: Partial<WashSceneData>) {
    this.vehicleId = data.vehicleId ?? 'excavator'
  }

  create() {
    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this)
      this.clearRoot()
    })

    this.input.on('pointerdown', this.handlePointerAim, this)
    this.input.on('pointermove', this.handlePointerAim, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointerAim, this)
      this.input.off('pointermove', this.handlePointerAim, this)
    })

    this.renderScene()
  }

  update(_: number, delta: number) {
    const angleDelta = Phaser.Math.Angle.Wrap(this.targetHoseAngle - this.currentHoseAngle)
    this.currentHoseAngle += angleDelta * Math.min(1, delta * 0.012)
    this.drawHose()
  }

  private renderScene() {
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
    const maxSpriteWidth = width * 0.72
    const maxSpriteHeight = height * 0.54
    const spriteScale = Math.min(maxSpriteWidth / sprite.width, maxSpriteHeight / sprite.height)
    sprite.setScale(spriteScale)

    this.hoseGraphics = this.add.graphics()

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
      this.hoseGraphics,
      backButton,
      backLabel,
      backHitArea,
    ])

    this.drawHose()
  }

  private handleResize() {
    this.renderScene()
  }

  private handlePointerAim(pointer: Phaser.Input.Pointer) {
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

  private clearRoot() {
    if (this.root) {
      this.root.destroy(true)
      this.root = undefined
    }

    this.hoseGraphics = undefined
  }
}

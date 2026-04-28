import Phaser from 'phaser'
import { getVehicleById } from '../config/vehicleCatalog'
import type { WashSceneData, VehicleId } from '../types/gameTypes'

const TITLE_FONT = '"Trebuchet MS", "Verdana", sans-serif'

export class WashScene extends Phaser.Scene {
  private vehicleId: VehicleId = 'excavator'
  private root?: Phaser.GameObjects.Container

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

    this.renderScene()
  }

  private renderScene() {
    this.clearRoot()

    const vehicle = getVehicleById(this.vehicleId)
    const width = this.scale.width
    const height = this.scale.height

    this.cameras.main.setBackgroundColor('#82d8ff')
    this.root = this.add.container(0, 0)

    const skyGlow = this.add.circle(width * 0.85, height * 0.16, 180, 0xffffff, 0.16)
    const ground = this.add.ellipse(width * 0.5, height + 24, width * 1.3, height * 0.5, 0x69be69, 1)
    const deck = this.add.graphics()
    deck.fillStyle(0x5f3b25, 1)
    deck.fillRoundedRect(width * 0.1, height * 0.18, width * 0.8, height * 0.62, 36)
    deck.lineStyle(6, 0x301b0f, 1)
    deck.strokeRoundedRect(width * 0.1, height * 0.18, width * 0.8, height * 0.62, 36)
    deck.fillStyle(0xf8efc8, 1)
    deck.fillRoundedRect(width * 0.1 + 14, height * 0.18 + 14, width * 0.8 - 28, height * 0.62 - 28, 30)

    const title = this.add
      .text(width * 0.5, height * 0.25, vehicle.name, {
        fontFamily: TITLE_FONT,
        fontSize: width < 640 ? '36px' : '48px',
        color: '#fff8d5',
        fontStyle: '700',
        stroke: '#6a451f',
        strokeThickness: 8,
      })
      .setOrigin(0.5)

    const sprite = this.add.image(width * 0.5, height * 0.5, vehicle.assetKey)
    const maxSpriteWidth = width * 0.58
    const maxSpriteHeight = height * 0.42
    const spriteScale = Math.min(maxSpriteWidth / sprite.width, maxSpriteHeight / sprite.height)
    sprite.setScale(spriteScale)

    const bubbleTag = this.add.graphics()
    bubbleTag.fillStyle(vehicle.accentColor, 1)
    bubbleTag.fillRoundedRect(width * 0.5 - 120, height * 0.7, 240, 38, 16)

    const bubbleLabel = this.add
      .text(width * 0.5, height * 0.719, 'Wash bay coming next', {
        fontFamily: TITLE_FONT,
        fontSize: '20px',
        color: '#4d2d0f',
        fontStyle: '700',
      })
      .setOrigin(0.5)

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
      ground,
      deck,
      title,
      sprite,
      bubbleTag,
      bubbleLabel,
      backButton,
      backLabel,
      backHitArea,
    ])
  }

  private handleResize() {
    this.renderScene()
  }

  private clearRoot() {
    if (this.root) {
      this.root.destroy(true)
      this.root = undefined
    }
  }
}

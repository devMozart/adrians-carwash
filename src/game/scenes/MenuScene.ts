import Phaser from 'phaser'
import { vehicleCatalog } from '../config/vehicleCatalog'

const TITLE_FONT = '"Trebuchet MS", "Verdana", sans-serif'

export class MenuScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container

  constructor() {
    super('menu')
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

    const width = this.scale.width
    const height = this.scale.height
    const titleY = Math.max(112, height * 0.17)
    const cardsTop = Math.max(250, height * 0.44)

    this.cameras.main.setBackgroundColor('#7fd1fb')

    this.root = this.add.container(0, 0)

    this.drawBackdrop(width, height)
    this.drawTitle(width, titleY)
    this.drawVehicleCards(width, height, cardsTop)
  }

  private drawBackdrop(width: number, height: number) {
    const skyGlow = this.add.circle(width * 0.18, height * 0.14, 150, 0xffffff, 0.16)
    const sun = this.add.circle(width * 0.14, height * 0.16, 54, 0xffef9a, 0.92)
    const hillFar = this.add.ellipse(width * 0.3, height + 16, width * 0.95, height * 0.42, 0x8fd673, 1)
    const hillNear = this.add.ellipse(width * 0.7, height + 40, width * 1.15, height * 0.48, 0x58b85f, 1)

    this.root?.add([skyGlow, sun, hillFar, hillNear])

    this.addBubble(width * 0.82, height * 0.16, 28)
    this.addBubble(width * 0.9, height * 0.26, 16)
    this.addBubble(width * 0.12, height * 0.34, 20)
    this.addBubble(width * 0.22, height * 0.27, 12)
  }

  private addBubble(x: number, y: number, radius: number) {
    const bubble = this.add.circle(x, y, radius, 0xffffff, 0.22)
    bubble.setStrokeStyle(3, 0xffffff, 0.42)
    this.root?.add(bubble)
  }

  private drawTitle(width: number, y: number) {
    const bannerWidth = Math.min(width - 40, 560)
    const bannerHeight = 88
    const bannerX = width * 0.5 - bannerWidth * 0.5
    const bannerY = y - bannerHeight * 0.5

    const banner = this.add.graphics()
    banner.fillStyle(0x5f3b25, 1)
    banner.fillRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 24)
    banner.lineStyle(6, 0x2f1c10, 1)
    banner.strokeRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 24)
    banner.fillStyle(0xe0b060, 1)
    banner.fillRoundedRect(bannerX + 12, bannerY + 10, bannerWidth - 24, bannerHeight - 20, 18)
    banner.lineStyle(4, 0x8c622d, 1)
    banner.strokeRoundedRect(bannerX + 12, bannerY + 10, bannerWidth - 24, bannerHeight - 20, 18)

    const title = this.add
      .text(width * 0.5, y, "Adrian's Carwash", {
        fontFamily: TITLE_FONT,
        fontSize: width < 640 ? '34px' : '44px',
        color: '#fff8d5',
        fontStyle: '700',
        stroke: '#6a451f',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#513116', 0, true, true)

    this.root?.add([banner, title])
  }

  private drawVehicleCards(width: number, height: number, top: number) {
    const isStacked = width < 940
    const gap = isStacked ? 24 : 30
    const cardWidth = Math.min(isStacked ? width - 36 : (width - 84) / 2, 420)
    const cardHeight = Math.min(Math.max(height * 0.45, 280), 360)
    const startX = isStacked ? width * 0.5 : width * 0.5 - (cardWidth * 0.5 + gap * 0.5)
    const startY = isStacked ? top - cardHeight * 0.5 : top

    vehicleCatalog.forEach((vehicle, index) => {
      const x = isStacked ? startX : startX + index * (cardWidth + gap)
      const y = isStacked ? startY + index * (cardHeight + gap) : startY
      this.createVehicleCard(vehicle, x, y, cardWidth, cardHeight)
    })
  }

  private createVehicleCard(
    vehicle: (typeof vehicleCatalog)[number],
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const card = this.add.container(x, y)
    const hitArea = this.add.zone(x, y, width, height).setOrigin(0.5)

    const board = this.add.graphics()
    board.fillStyle(0x6f4b30, 1)
    board.fillRoundedRect(-width / 2, -height / 2, width, height, 24)
    board.lineStyle(6, 0x352114, 1)
    board.strokeRoundedRect(-width / 2, -height / 2, width, height, 24)
    board.fillStyle(0xf8efc8, 1)
    board.fillRoundedRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24, 20)
    board.lineStyle(3, 0xaf8751, 1)
    board.strokeRoundedRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24, 20)

    const header = this.add.graphics()
    header.fillStyle(vehicle.bannerColor, 1)
    header.fillRoundedRect(-width / 2 + 22, -height / 2 + 22, width - 44, 58, 16)

    const name = this.add
      .text(0, -height / 2 + 51, vehicle.name, {
        fontFamily: TITLE_FONT,
        fontSize: width < 360 ? '28px' : '32px',
        color: vehicle.accentText,
        fontStyle: '700',
        stroke: '#341d0d',
        strokeThickness: 6,
      })
      .setOrigin(0.5)

    const sprite = this.add.image(0, -8, vehicle.assetKey)
    const maxArtWidth = width - 90
    const maxArtHeight = height * 0.38
    const spriteScale = Math.min(maxArtWidth / sprite.width, maxArtHeight / sprite.height)
    sprite.setScale(spriteScale)

    const button = this.add.graphics()
    button.fillStyle(vehicle.buttonColor, 1)
    button.fillRoundedRect(-116, height / 2 - 42, 232, 48, 18)
    button.lineStyle(3, 0x114154, 1)
    button.strokeRoundedRect(-116, height / 2 - 42, 232, 48, 18)

    const buttonLabel = this.add
      .text(0, height / 2 - 18, 'Wash', {
        fontFamily: TITLE_FONT,
        fontSize: '22px',
        color: '#f2fffc',
        fontStyle: '700',
        stroke: '#0f4256',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    card.add([board, header, name, sprite, button, buttonLabel])

    hitArea.setInteractive({ useHandCursor: true })

    hitArea.on('pointerover', () => {
      this.tweens.killTweensOf(card)
      this.tweens.add({
        targets: card,
        y: y - 8,
        scale: 1.02,
        duration: 140,
        ease: 'Quad.Out',
      })
    })

    hitArea.on('pointerout', () => {
      this.tweens.killTweensOf(card)
      this.tweens.add({
        targets: card,
        y,
        scale: 1,
        duration: 140,
        ease: 'Quad.Out',
      })
    })

    hitArea.on('pointerdown', () => {
      this.tweens.killTweensOf(card)
      this.tweens.add({
        targets: card,
        scale: 0.98,
        duration: 70,
        yoyo: true,
        ease: 'Quad.Out',
      })
      this.scene.start('wash', { vehicleId: vehicle.id })
    })

    this.root?.add([card, hitArea])
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

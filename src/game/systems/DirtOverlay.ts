import Phaser from 'phaser'

type DirtOverlayConfig = {
  alphaThreshold?: number
  resolutionScale?: number
  sourceTextureKey: string
  textureKey: string
  worldX: number
  worldY: number
  worldWidth: number
  worldHeight: number
}

export class DirtOverlay {
  private readonly scene: Phaser.Scene
  private readonly textureKey: string
  private readonly canvasTexture: Phaser.Textures.CanvasTexture
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly image: Phaser.GameObjects.Image
  private readonly sourceWidth: number
  private readonly sourceHeight: number
  private totalAlpha = 0
  private remainingAlpha = 0

  private constructor(
    scene: Phaser.Scene,
    textureKey: string,
    canvasTexture: Phaser.Textures.CanvasTexture,
    image: Phaser.GameObjects.Image,
    sourceWidth: number,
    sourceHeight: number,
  ) {
    this.scene = scene
    this.textureKey = textureKey
    this.canvasTexture = canvasTexture
    this.canvas = canvasTexture.getSourceImage() as HTMLCanvasElement
    this.context = this.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    this.image = image
    this.sourceWidth = sourceWidth
    this.sourceHeight = sourceHeight
  }

  static create(scene: Phaser.Scene, config: DirtOverlayConfig) {
    const resolutionScale = config.resolutionScale ?? 0.5
    const alphaThreshold = config.alphaThreshold ?? 12
    const sourceTexture = scene.textures.get(config.sourceTextureKey)
    const sourceImage = sourceTexture.getSourceImage() as CanvasImageSource & {
      width: number
      height: number
    }

    const sourceWidth = sourceImage.width
    const sourceHeight = sourceImage.height
    const canvasWidth = Math.max(1, Math.round(sourceWidth * resolutionScale))
    const canvasHeight = Math.max(1, Math.round(sourceHeight * resolutionScale))

    if (scene.textures.exists(config.textureKey)) {
      scene.textures.remove(config.textureKey)
    }

    const canvasTexture = scene.textures.createCanvas(config.textureKey, canvasWidth, canvasHeight)

    if (!canvasTexture) {
      throw new Error(`Could not create dirt overlay texture: ${config.textureKey}`)
    }

    const image = scene.add
      .image(config.worldX, config.worldY, config.textureKey)
      .setDisplaySize(config.worldWidth, config.worldHeight)

    const overlay = new DirtOverlay(
      scene,
      config.textureKey,
      canvasTexture,
      image,
      canvasWidth,
      canvasHeight,
    )

    overlay.paintInitialDirt(sourceImage, alphaThreshold)

    return overlay
  }

  get gameObject() {
    return this.image
  }

  get remainingRatio() {
    if (this.totalAlpha <= 0) {
      return 0
    }

    return Phaser.Math.Clamp(this.remainingAlpha / this.totalAlpha, 0, 1)
  }

  get remainingPercent() {
    return Math.round(this.remainingRatio * 100)
  }

  get isClean() {
    return this.remainingPercent <= 0 || this.remainingRatio <= 0.004
  }

  clearAtWorldPoint(worldX: number, worldY: number, worldRadius: number) {
    const bounds = this.image.getBounds()

    if (
      worldX < bounds.left ||
      worldX > bounds.right ||
      worldY < bounds.top ||
      worldY > bounds.bottom
    ) {
      return
    }

    const localX = ((worldX - bounds.left) / bounds.width) * this.sourceWidth
    const localY = ((worldY - bounds.top) / bounds.height) * this.sourceHeight
    const localRadius = worldRadius * (this.sourceWidth / bounds.width)
    const sampleLeft = Phaser.Math.Clamp(Math.floor(localX - localRadius - 2), 0, this.sourceWidth - 1)
    const sampleTop = Phaser.Math.Clamp(Math.floor(localY - localRadius - 2), 0, this.sourceHeight - 1)
    const sampleRight = Phaser.Math.Clamp(Math.ceil(localX + localRadius + 2), 0, this.sourceWidth)
    const sampleBottom = Phaser.Math.Clamp(Math.ceil(localY + localRadius + 2), 0, this.sourceHeight)
    const sampleWidth = Math.max(1, sampleRight - sampleLeft)
    const sampleHeight = Math.max(1, sampleBottom - sampleTop)
    const beforeData = this.context.getImageData(sampleLeft, sampleTop, sampleWidth, sampleHeight)

    this.context.save()
    this.context.globalCompositeOperation = 'destination-out'

    const gradient = this.context.createRadialGradient(
      localX,
      localY,
      localRadius * 0.24,
      localX,
      localY,
      localRadius,
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(0.72, 'rgba(0, 0, 0, 0.72)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    this.context.fillStyle = gradient
    this.context.beginPath()
    this.context.arc(localX, localY, localRadius, 0, Math.PI * 2)
    this.context.fill()
    this.context.restore()

    const afterData = this.context.getImageData(sampleLeft, sampleTop, sampleWidth, sampleHeight)
    let clearedAlpha = 0

    for (let index = 3; index < beforeData.data.length; index += 4) {
      const delta = beforeData.data[index] - afterData.data[index]

      if (delta > 0) {
        clearedAlpha += delta
      }
    }

    if (clearedAlpha > 0) {
      this.remainingAlpha = Math.max(0, this.remainingAlpha - clearedAlpha)
    }

    this.canvasTexture.refresh()
  }

  destroy() {
    this.image.destroy()
    this.scene.textures.remove(this.textureKey)
  }

  private paintInitialDirt(sourceImage: CanvasImageSource, alphaThreshold: number) {
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = this.sourceWidth
    maskCanvas.height = this.sourceHeight

    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })

    if (!maskContext) {
      return
    }

    maskContext.drawImage(sourceImage, 0, 0, this.sourceWidth, this.sourceHeight)
    const maskData = maskContext.getImageData(0, 0, this.sourceWidth, this.sourceHeight)

    this.context.clearRect(0, 0, this.sourceWidth, this.sourceHeight)
    this.context.fillStyle = '#7b5330'
    this.context.fillRect(0, 0, this.sourceWidth, this.sourceHeight)

    this.paintMudBlobs()
    this.paintMudSpeckles()

    const dirtData = this.context.getImageData(0, 0, this.sourceWidth, this.sourceHeight)
    const dirtPixels = dirtData.data
    const maskPixels = maskData.data

    for (let index = 0; index < dirtPixels.length; index += 4) {
      const sourceAlpha = maskPixels[index + 3]

      if (sourceAlpha < alphaThreshold) {
        dirtPixels[index + 3] = 0
        continue
      }

      const opacityJitter = 0.62 + Math.random() * 0.28
      dirtPixels[index + 3] = Math.round(sourceAlpha * opacityJitter)
    }

    let totalAlpha = 0

    for (let index = 3; index < dirtPixels.length; index += 4) {
      totalAlpha += dirtPixels[index]
    }

    this.totalAlpha = totalAlpha
    this.remainingAlpha = totalAlpha
    this.context.putImageData(dirtData, 0, 0)
    this.canvasTexture.refresh()
  }

  private paintMudBlobs() {
    const blobCount = Math.max(90, Math.round((this.sourceWidth * this.sourceHeight) / 3500))

    for (let index = 0; index < blobCount; index += 1) {
      const x = Math.random() * this.sourceWidth
      const y = Math.random() * this.sourceHeight
      const radius = Phaser.Math.FloatBetween(12, 54)
      const alpha = Phaser.Math.FloatBetween(0.16, 0.3)
      const color = Phaser.Math.Between(0, 1) === 0 ? '92, 60, 33' : '126, 89, 47'

      this.context.fillStyle = `rgba(${color}, ${alpha})`
      this.context.beginPath()
      this.context.ellipse(
        x,
        y,
        radius,
        radius * Phaser.Math.FloatBetween(0.6, 1.25),
        Phaser.Math.FloatBetween(0, Math.PI),
        0,
        Math.PI * 2,
      )
      this.context.fill()
    }
  }

  private paintMudSpeckles() {
    const speckleCount = Math.max(260, Math.round((this.sourceWidth * this.sourceHeight) / 700))

    for (let index = 0; index < speckleCount; index += 1) {
      const x = Math.random() * this.sourceWidth
      const y = Math.random() * this.sourceHeight
      const radius = Phaser.Math.FloatBetween(2, 10)
      const alpha = Phaser.Math.FloatBetween(0.12, 0.25)

      this.context.fillStyle = `rgba(62, 38, 18, ${alpha})`
      this.context.beginPath()
      this.context.arc(x, y, radius, 0, Math.PI * 2)
      this.context.fill()
    }
  }
}

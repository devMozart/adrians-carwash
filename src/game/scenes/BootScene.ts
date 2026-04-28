import Phaser from 'phaser'
import { vehicleCatalog } from '../config/vehicleCatalog'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    for (const vehicle of vehicleCatalog) {
      this.load.image(vehicle.assetKey, vehicle.imageUrl)
    }
  }

  create() {
    this.scene.start('menu')
  }
}

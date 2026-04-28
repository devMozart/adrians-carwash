import Phaser from 'phaser'
import adrianImageUrl from '../../assets/adrian.png'
import celebrationAudioUrl from '../../assets/audio/celebration.ogg'
import clickAudioUrl from '../../assets/audio/click.ogg'
import waterAudioUrl from '../../assets/audio/water.mp3'
import { vehicleCatalog } from '../config/vehicleCatalog'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    this.load.image('mascot-adrian', adrianImageUrl)
    this.load.audio('ui-click', clickAudioUrl)
    this.load.audio('celebration-fanfare', celebrationAudioUrl)
    this.load.audio('water-loop', waterAudioUrl)

    for (const vehicle of vehicleCatalog) {
      this.load.image(vehicle.assetKey, vehicle.imageUrl)
    }
  }

  create() {
    this.scene.start('menu')
  }
}

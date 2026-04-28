import bulldozerImageUrl from '../../assets/vehicles/bulldozer.png'
import excavatorImageUrl from '../../assets/vehicles/excavator.png'
import mobileCraneImageUrl from '../../assets/vehicles/mobilecrane.png'
import type { VehicleDefinition, VehicleId } from '../types/gameTypes'

export const vehicleCatalog: VehicleDefinition[] = [
  {
    id: 'excavator',
    name: 'Excavator',
    assetKey: 'vehicle-excavator',
    imageUrl: excavatorImageUrl,
    accentColor: 0xf5b933,
    accentText: '#ffdc7d',
    bannerColor: 0x855e1f,
    buttonColor: 0x2fae73,
  },
  {
    id: 'bulldozer',
    name: 'Bulldozer',
    assetKey: 'vehicle-bulldozer',
    imageUrl: bulldozerImageUrl,
    accentColor: 0xf0c743,
    accentText: '#ffe7a0',
    bannerColor: 0x73501a,
    buttonColor: 0x2e98bb,
  },
  {
    id: 'mobile-crane',
    name: 'Mobile Crane',
    assetKey: 'vehicle-mobile-crane',
    imageUrl: mobileCraneImageUrl,
    accentColor: 0xf6bc55,
    accentText: '#ffe7a7',
    bannerColor: 0x7b5318,
    buttonColor: 0x3a9fcb,
  },
]

export function getVehicleById(vehicleId: VehicleId) {
  return vehicleCatalog.find((vehicle) => vehicle.id === vehicleId) ?? vehicleCatalog[0]
}

import bulldozerImageUrl from '../../assets/vehicles/bulldozer.png'
import dumpTruckImageUrl from '../../assets/vehicles/dumptruck.png'
import excavatorImageUrl from '../../assets/vehicles/excavator.png'
import garbageTruckImageUrl from '../../assets/vehicles/garbagetruck.png'
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
  {
    id: 'dump-truck',
    name: 'Dump Truck',
    assetKey: 'vehicle-dump-truck',
    imageUrl: dumpTruckImageUrl,
    accentColor: 0xf0b64d,
    accentText: '#ffe8aa',
    bannerColor: 0x744d15,
    buttonColor: 0x2d95b7,
  },
  {
    id: 'garbage-truck',
    name: 'Garbage Truck',
    assetKey: 'vehicle-garbage-truck',
    imageUrl: garbageTruckImageUrl,
    accentColor: 0xf0c35f,
    accentText: '#ffe8a7',
    bannerColor: 0x7a5318,
    buttonColor: 0x2d95b7,
  },
]

export function getVehicleById(vehicleId: VehicleId) {
  return vehicleCatalog.find((vehicle) => vehicle.id === vehicleId) ?? vehicleCatalog[0]
}

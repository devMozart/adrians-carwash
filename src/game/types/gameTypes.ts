export type VehicleId = 'excavator' | 'bulldozer'

export type VehicleDefinition = {
  id: VehicleId
  name: string
  assetKey: string
  imageUrl: string
  accentColor: number
  accentText: string
  bannerColor: number
  buttonColor: number
}

export type WashSceneData = {
  vehicleId: VehicleId
}

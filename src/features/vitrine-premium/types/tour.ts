export type TourStep = {
  id: string
  title: string
  description: string
  path: string
  selector: string
  navSelectors?: string[]
  requiredCapabilities?: string[]
}
export type TourRect = {top:number;left:number;width:number;height:number}

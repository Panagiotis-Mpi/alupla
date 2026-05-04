// Δηλώνει τύπους για αρχεία assets που εισάγονται στο frontend.
declare module "*.geojson" {
  const value: any;
  export default value;
}

declare module "*.geojson?raw" {
  const value: string;
  export default value;
}

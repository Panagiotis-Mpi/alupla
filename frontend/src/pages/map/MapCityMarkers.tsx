import React from "react";
import { Marker } from "react-leaflet";
import type { MapCityPoint } from "../../lib/api";
import { cityLabelIcon, mapCityKey, mapCityLabel, mapCityLatitude, mapCityLongitude } from "./shared";

export function MapCityMarkers(props: { cities: MapCityPoint[] }) {
  return (
    <>
      {props.cities.map((city) => {
        const lat = mapCityLatitude(city);
        const lng = mapCityLongitude(city);
        if (lat === null || lng === null) {
          return null;
        }
        return (
          <Marker
            key={mapCityKey(city)}
            position={[lat, lng]}
            icon={cityLabelIcon(mapCityLabel(city))}
            interactive={false}
          />
        );
      })}
    </>
  );
}

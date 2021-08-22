import haversine from "haversine";
import cities from "../config/city";

export function distFromKnownCities(userLat, userLong) {
  let resArr = [];
  for (const city in cities) {
    let cityCoords = {
      latitude: cities[city].lat,
      longitude: cities[city].long,
    };
    let distance = haversine(
      cityCoords,
      {
        latitude: userLat,
        longitude: userLong,
      },
      { unit: "meter" }
    );
    if (distance <= 50000 && cities[city].enabled === true) {
      resArr.push({ city, distance });
    }
  }
  if (resArr.length >= 2) {
    resArr.sort((x, y) => x.distance - y.distance);
  }
  return resArr;
}
export function isWithinEnabledRegion(latitude, longitude) {
  let resArr = [];
  for (const city in cities) {
    const cityCoords = {
      latitude: cities[city].lat,
      longitude: cities[city].long,
    };
    const distance = haversine(
      cityCoords,
      { latitude, longitude },
      { unit: "meter" }
    );
    if (
      distance / 1000 <= cities[city].radius &&
      cities[city].enabled === true
    ) {
      resArr.push({ city, distance });
    }
  }
  if (resArr.length) {
    return true;
  } else {
    return false;
  }
}

export function getCurrentRegionAliases(latitude, longitude) {
  let regions = distFromKnownCities(latitude, longitude);
  let currentRegion = regions[0];
  let region = currentRegion["city"].split("-")[0];
  return [region, "Ontario", "Canada", ...cities[region].aliases];
}

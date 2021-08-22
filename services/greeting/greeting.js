import DialogActions from "../../libs/dialog-actions";
import { distFromKnownCities } from "../../libs/distance";
import cityConfig from "../../config/city";

async function fulfiller(event, context) {
  let sessionAttributes = event.sessionAttributes;
  // have fine-grained location
  if (sessionAttributes.userPosition) {
    const userPosition = JSON.parse(sessionAttributes.userPosition);

    let distanceArr = distFromKnownCities(
      userPosition.latitude,
      userPosition.longitude
    );

    if (distanceArr.length) {
      let city = distanceArr[0].city;
      return DialogActions.displayOptions(
        sessionAttributes,
        cityConfig[city].greeting
      );
    }
  }
  // do not have fine-grained location
  if (sessionAttributes.ipLocation) {
    const ipLocation = JSON.parse(sessionAttributes.ipLocation);
    for (let city in cityConfig) {
      if (cityConfig[city].aliases.includes(ipLocation.city)) {
        return DialogActions.displayOptions(
          sessionAttributes,
          cityConfig[city].greeting
        );
      }
    }
    let ipLat = ipLocation.loc.split(",")[0];
    let ipLong = ipLocation.loc.split(",")[1];
    let distanceArr = distFromKnownCities(ipLat, ipLong);

    if (distanceArr.length) {
      let city = distanceArr[0].city;
      return DialogActions.displayOptions(
        sessionAttributes,
        cityConfig[city].greeting
      );
    }
  }
  // have neither fine grained or ip location
  // using Toronto location as default
  return DialogActions.displayOptions(
    sessionAttributes,
    cityConfig["Toronto"].greeting
  );
}

exports.fulfill = async (event, context) => {
  try {
    let response = await fulfiller(event, context);
    return response;
  } catch (e) {
    console.log(e);
  }
};

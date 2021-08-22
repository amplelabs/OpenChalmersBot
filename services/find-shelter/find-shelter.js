import Validator from "../../libs/validator";
import Fulfiller from "../../libs/fulfiller";
import { distFromKnownCities } from "../../libs/distance";
import cityConfig from "../../config/city";
import appConfig from "../../config/appConfig";
import DialogActions from "../../libs/dialog-actions";

function alternateShelter(event) {
  let sessionAttributes = event.sessionAttributes;
  let city = "Toronto";
  if (sessionAttributes.userPosition) {
    const userPosition = JSON.parse(sessionAttributes.userPosition);
    let distanceArr = distFromKnownCities(
      userPosition.latitude,
      userPosition.longitude
    );
    if (distanceArr.length) {
      city = distanceArr[0].city;
    }
  } // do not have fine-grained location
  else if (sessionAttributes.latitude && sessionAttributes.longitude) {
    let distanceArr = distFromKnownCities(
      sessionAttributes.latitude,
      sessionAttributes.longitude
    );
    if (distanceArr.length) {
      city = distanceArr[0].city;
    }
  }

  if (cityConfig[city].altShelter === true) {
    return DialogActions.buttonElicitSlot(
      sessionAttributes,
      "ExtraHelp",
      event.currentIntent.name,
      event.currentIntent.slots,
      cityConfig[city].altShelterMsg,
      null,
      appConfig.button.serviceOptions.textArray,
      appConfig.button.serviceOptions.valueArray
    );
  } else {
    return false;
  }
}

export async function validations(event, context, callback) {
  try {
    const validator = new Validator(event);
    let response = await validator.validate();
    callback(null, response);
  } catch (err) {
    console.log("err: " + JSON.stringify(err));
    callback(err);
  }
}

export async function fulfillment(event, context) {
  let fulfiller = new Fulfiller(event, context);
  let response = alternateShelter(event)
    ? alternateShelter(event)
    : await fulfiller.fulfill();
  return response;
}

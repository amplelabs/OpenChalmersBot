import moment from "moment-timezone";
import DialogActions from "./dialog-actions";
import LocationFinder from "./location-finder";
import appConfig from "../config/appConfig";
import { distFromKnownCities } from "./distance";
import cityConfig from "../config/city";

let userSession = {};

class TimeParser {
  constructor(event) {
    this.event = event;
    this.slots = event.currentIntent.slots;
    this.now = appConfig.text.now;
  }

  getTime() {
    if (
      this.slots.mealNow &&
      this.now.includes(this.slots.mealNow.toLowerCase())
    ) {
      this.slots.Date = moment().tz("America/New_York").format("YYYY-MM-DD");
      this.slots.Time = moment().tz("America/New_York").format("HH:mm");
    }
    if (this.slots.Time && !this.slots.Date) {
      this.slots.Date = moment().tz("America/New_York").format("YYYY-MM-DD");
    }
    return true;
  }
}

export default class Validator {
  constructor(event) {
    this.event = event;
    this.slots = event.currentIntent.slots;
    this.sessionAttributes = event.sessionAttributes;
    this.yes = appConfig.text.yes;
    this.no = appConfig.text.no;
    this.now = appConfig.text.now;
    this.sessionAttributes.Latitude = this.sessionAttributes.latitude;
    this.sessionAttributes.Longitude = this.sessionAttributes.longitude;
    this.slots.Intersection =
      this.sessionAttributes.intersection || this.slots.Intersection;
    this.slots.useGPS = this.sessionAttributes.useGPS || this.slots.useGPS;
    this.cityConfig = cityConfig;
    //!FIX ME: defaults to toronto if IP-API all fails
    this.region = "Ontario";
    this.country = "Canada";
    this.city = "Toronto";
    // have fine-grained location
    if (this.sessionAttributes.userPosition) {
      const userPosition = JSON.parse(this.sessionAttributes.userPosition);
      let distanceArr = distFromKnownCities(
        userPosition.latitude,
        userPosition.longitude
      );
      if (distanceArr.length) {
        this.city = distanceArr[0].city;
      }
    } // do not have fine-grained location
    else if (this.sessionAttributes.ipLocation) {
      const ipLocation = JSON.parse(this.sessionAttributes.ipLocation);
      let match = false;
      for (let city in this.cityConfig) {
        if (this.cityConfig[city].aliases.includes(ipLocation.city)) {
          this.city = city;
          match = true;
        }
      }
      if (!match) {
        let ipLat = ipLocation.loc.split(",")[0];
        let ipLong = ipLocation.loc.split(",")[1];
        let distanceArr = distFromKnownCities(ipLat, ipLong);
        if (distanceArr.length) {
          this.city = distanceArr[0].city;
        }
      }
    }
  }

  async validate() {
    // if location is set
    if (this.sessionAttributes.userPosition) {
      const positionObj = JSON.stringify(this.sessionAttributes.userPosition);
      this.slots.useGPS = "Yes";
      this.sessionAttributes.Latitude = positionObj.latitude;
      this.sessionAttributes.Longitude = positionObj.longitude;
    }
    // If location hasn't been set yet
    if (!this.slots.useGPS) {
      return DialogActions.buttonElicitSlot(
        this.sessionAttributes,
        "useGPS",
        this.event.currentIntent.name,
        this.slots,
        appConfig.text.useLocation,
        null,
        appConfig.button.yesNo.textArray,
        appConfig.button.yesNo.valueArray
      );
    }
    if (this.slots.Intersection) {
      this.slots.useGPS = "No";
    }
    // If user hasn't specified date, time and isn't asking for more results...
    if (!this.slots.ShowMore && !this.slots.Date && !this.slots.Time) {
      this.slots.mealNow = "now";
    }
    // If user decides not to use GPS but hasn't provided intersection yet...
    if (this.slots.useGPS === "No" && !this.slots.Intersection) {
      userSession.useGPS = "No";
      return DialogActions.elicitSlot(
        this.sessionAttributes,
        "Intersection",
        this.event.currentIntent.name,
        this.slots,
        `No problem! ## Could you please provide me with your nearest intersection, or landmark with the name of your city/town? E.g. ${
          this.cityConfig[this.city].intersection
        }`
      );
    }
    // instantiate location
    const location = await new LocationFinder(this.event).getLocation();
    // If user is using GPS, and location has been retrieved from above function call
    if (
      this.slots.useGPS === "Yes" &&
      this.event.currentIntent.confirmationStatus === "None" &&
      this.sessionAttributes.Confirmed !== "true" &&
      location
    ) {
      userSession.useGPS = "Yes";
      return DialogActions.confirmAddress(
        { ...this.slots },
        this.sessionAttributes,
        this.event.currentIntent.name,
        location.address
      );
      // if the GPS fails to retrieve location
    } else if (
      this.slots.useGPS === "Yes" &&
      this.event.currentIntent.confirmationStatus === "None" &&
      this.sessionAttributes.Confirmed !== "true" &&
      !location
    ) {
      this.slots.useGPS = "No";
      userSession.useGPS = "Yes, but failed to locate";
      return DialogActions.elicitSlot(
        this.sessionAttributes,
        "Intersection",
        this.event.currentIntent.name,
        this.slots,
        `Unfortunately, I could not access your location through your GPS. ## Could you please provide me with your address, closest intersection, or landmark with the name of your city/town? E.g. ${
          this.cityConfig[this.city].intersection
        }`
      );
    }
    const timeParser = new TimeParser(this.event);
    // sets this.slots.Date
    timeParser.getTime();
    // If it fails to get the current time
    if (!this.slots.Time) {
      return DialogActions.delegate(this.slots, this.sessionAttributes);
    }
    // If it succeeds in getting current time
    return this.validateLocation(location);
  }

  validateLocation(location) {
    if (location.latitude !== "invalid" && location.longitude !== "invalid") {
      this.sessionAttributes.latitude = location.latitude;
      this.sessionAttributes.longitude = location.longitude;
    }
    if (location.address === `${this.city}, ${this.region}, ${this.country}`) {
      //TODO: ON Canada should not be hard coded.
      userSession.Intersection = this.event.inputTranscript;
      return DialogActions.elicitSlot(
        this.sessionAttributes,
        "Intersection",
        this.event.currentIntent.name,
        { ...this.slots },
        `Hmm.. let's try again. Could you please provide me with your address, closest intersection, or landmark with the name of your city/town? E.g. ${
          this.cityConfig[this.city].intersection
        }`
      );
    }
    if (location.isUnknown()) {
      return DialogActions.fulfill(
        "Sorry, I'm not quite sure where that is. Is it perhaps located within Toronto or Barrie?"
      );
    }
    if (
      this.event.currentIntent.confirmationStatus === "None" &&
      this.sessionAttributes.Confirmed !== "true"
    ) {
      userSession.Intersection = !this.slots.Intersection
        ? `latitude: ${this.sessionAttributes.userPosition.latitude} longitude: ${this.sessionAttributes.userPosition.longitude}`
        : this.event.inputTranscript;
      return DialogActions.confirmAddress(
        { ...this.slots },
        this.sessionAttributes,
        this.event.currentIntent.name,
        location.address
      );
    } else if (
      this.event.currentIntent.confirmationStatus === "Denied" &&
      this.sessionAttributes.Confirmed !== "true"
    ) {
      delete this.sessionAttributes.userPosition;
      this.sessionAttributes.useGPS = "No";
      return DialogActions.elicitSlot(
        this.sessionAttributes,
        "Intersection",
        this.event.currentIntent.name,
        { ...this.slots },
        `Hmm.. let's try again. Could you please provide me with your address, closest intersection, or landmark with the name of your city/town? E.g. ${
          this.cityConfig[this.city].intersection
        }`
      );
    } else {
      this.sessionAttributes.Confirmed = "true";
      return DialogActions.delegate(
        this.event.currentIntent.slots,
        this.sessionAttributes
      );
    }
  }
}

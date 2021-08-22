import { MapAdapter } from "./map-adapter";

class Location {
  constructor({
    latitude = "invalid",
    longitude = "invalid",
    city = "unknown",
    address = "unknown"
  }) {
    this.latitude = parseFloat(latitude);
    this.longitude = parseFloat(longitude);
    this.city = city;
    this.address = address;
  }

  static async fromAddress(address, maps = MapAdapter) {
    try {
      const coords = await maps.lookupAddress(address);
      return new Location({ ...coords });
    } catch (_error) {
      console.error(_error);
      return new Location({});
    }
  }

  static async fromCoords(coords, maps = MapAdapter) {
    try {
      const data = await maps.lookupCoords(coords);
      return new Location({ ...data });
    } catch (_error) {
      console.error(_error);
      return new Location({ ...coords });
    }
  }

  coords() {
    return {
      latitude: this.latitude,
      longitude: this.longitude
    };
  }

  isUnknown() {
    return (
      Number.isNaN(this.latitude) ||
      Number.isNaN(this.longitude) ||
      Math.abs(this.latitude) > 90 ||
      Math.abs(this.longitude) > 180
    );
  }
  // isInsideBarrie() {
  //   return this.city === "Barrie";
  // }

  // isOutsideBarrie() {
  //   return !this.isInsideBarrie();
  // }

  // isInsideToronto() {
  //   return this.city === "Toronto";
  // }

  // isOutsideToronto() {
  //   return !this.isInsideToronto();
  // }
}


export default class LocationFinder {
  constructor(event) {
    this.event = event;
    this.slots = event.currentIntent.slots;
    this.sessionAttributes = event.sessionAttributes;
    // defaults to toronto if IP-API fails - only used when GPS is not given
    this.city = 'Toronto';
    this.region = 'Ontario';
    this.country = 'Canada';
    // do not have fine-grained location
    if (this.sessionAttributes.ipLocation) {
      const ipLocation = JSON.parse(this.sessionAttributes.ipLocation);
      if (ipLocation.city) {
        this.city = ipLocation.city;
      }
      if (ipLocation.region) {
        this.city = ipLocation.region;
      }
      if (ipLocation.country) {
        switch (ipLocation.country) {
          case 'CA':
            this.country = 'Canada';
            break;
          case 'US':
            this.country = 'USA';
            break;
          default:
            break;
        }
      }
    }
  }

  async getLocation() {
    const location =
      (await this.getKnownLocation()) ||
      (await this.getLocationFromGps()) ||
      (await this.getLocationFromSlots());

    return location;
  }

  async getKnownLocation() {
    if (!this.sessionAttributes.Latitude || !this.sessionAttributes.Longitude) {
      return null;
    }

    if (this.sessionAttributes.Confirmed !== "true" && this.slots.Intersection) {
      return null;
    }

    try {
      return await Location.fromCoords({
        latitude: this.sessionAttributes.Latitude,
        longitude: this.sessionAttributes.Longitude
      });
    } catch (error) {
      return null;
    }
  }

  async getLocationFromGps() {
    if (this.slots.useGPS === "No") {
      return;
    }

    if (this.sessionAttributes.Confirmed !== "true" && this.slots.Intersection) {
      return;
    } else if (this.slots.Intersection) {
      return;
    } else {
      try {
        if (!this.event.sessionAttributes.userPosition) {
          return;
        }
      } catch (error) {
        // !HANDLE ERROR
        console.log(error);
      }

      try {
        const parsedLocation = JSON.parse(
          this.event.sessionAttributes.userPosition
        );
        return await Location.fromCoords(parsedLocation);
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  }

  async getLocationFromSlots() {
    if (this.slots.useGPS === "Yes") {
      return;
    }
    if (!this.slots.Intersection) {
      return;
    }
    try {
      return await Location.fromAddress(
        this.slots.Intersection + ` ${this.city}, ${this.region}, ${this.country}`
      );
    } catch (error) {
      console.log(JSON.stringify(error));
      return null;
    }
  }
}

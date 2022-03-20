import request from "request";
import { isWithinEnabledRegion } from "../libs/distance";

const API_URL = process.env.GOOGLE_API_URL;
const MAPS_KEY = process.env.GOOGLE_MAPS_DIRECTIONS_KEY;

export default class ServiceFinder {
  constructor(
    service,
    location,
    date,
    time,
    age,
    gender,
    LGBTQ,
    language = null,
    cityConfig
  ) {
    this.services = service;
    this.language = language;
    this.location = location;
    this.date = date;
    this.time = time;
    this.gender = gender;
    this.age = age;
    this.servicesInTime = [];
    this.servicesLaterTime = [];
    this.mapInfo = [];
    this.LGBTQ = LGBTQ || false;
    this.snackTime = [];
    this.youthServices = [];
    this.youthServicesLater = [];
    this.cityConfig = cityConfig;

    if (gender === "Female" || gender === "female") {
      this.gender = "female";
    } else if (gender === "Skip" || gender === "skip") {
      this.gender = "mix";
    } else if (gender === "Non-binary" || gender === "non-binary") {
      this.gender = "nb";
      this.LGBTQ = true;
    } else if (gender === "Male" || gender === "male") {
      this.gender = "male";
    } else if (!gender) {
      this.gender = "general";
    }
  }

  confirmAge(userAge, ageRange) {
    if (!userAge) {
      return true;
    }
    return ageRange[0] != null && ageRange[1] != null
      ? userAge >= ageRange[0] && userAge <= ageRange[1]
      : false;
  }

  isNb(isLGBTQ) {
    return (this.gender === "nb" || this.LGBTQ) && isLGBTQ;
  }

  isYouth(userAge) {
    if (userAge) {
      if (userAge >= 1 && userAge <= 25) {
        return true;
      }
    }
    return false;
  }

  isYouthService(ageRange) {
    if (!ageRange) {
      console.log("no age range provided");
      return false;
    } else {
      if (ageRange[1] <= 25) {
        return true;
      } else {
        return false;
      }
    }
  }

  isSnack(service) {
    return service.type === "Snack";
  }

  getTravelInfo(origin, dest) {
    return new Promise((resolve, reject) => {
      request(
        `${API_URL}?origin=${origin.address}&destination=${dest}&mode=walking&key=${MAPS_KEY}`,
        { json: true },
        (err, res, body) => {
          if (err) {
            console.log("error:", err);
            reject(err);
          }
          if (body.error_message) {
            reject(body.error_message);
          }
          if (body.routes.length > 0) {
            if (body.routes[0].legs.length > 0) {
              console.log("resolving");
              resolve(body.routes[0].legs[0].duration.value / 60);
            } else {
              // TODO: better handling
              console.log("No legs");
              resolve(31);
            }
          } else {
            // TODO: better handling
            console.log("No Routes");
            resolve(31);
          }
        }
      );
    });
  }
  isLanguageSet(service) {
    return !!(
      (this.language &&
        service.language.length &&
        service.language.includes(this.language)) ||
      !this.language
    );
  }
  isWithinDistance(service) {
    // return true if service is within 30km
    return !!(service.distance <= 30000);
  }
  async find() {
    if (this.location.isUnknown()) {
      return [];
    }
    this.services.forEach(service => {
      service.addTimeDiff(this.time);
      service.addDistanceFrom(this.location);
      // If no language is set, or language is set, and exists in service
      if (
        this.isLanguageSet(service) === true &&
        this.isWithinDistance(service) == true &&
        isWithinEnabledRegion(service.latitude, service.longitude) === true
      ) {
        if (service.age[0] != null && service.age[1] != null) {
          if (
            service.startTime <= this.time &&
            this.time < service.endTime &&
            (service.gender === this.gender || this.gender === "general") &&
            service.dayOfWeek.includes(this.date) &&
            this.confirmAge(this.age, service.age)
          ) {
            if (this.isYouth(this.age) && this.isYouthService(service.age)) {
              this.youthServices.push(service);
            } else if (this.isSnack(service)) {
              this.snackTime.push(service);
            } else {
              this.servicesInTime.push(service);
            }
          } else if (
            service.startTime > this.time &&
            (service.gender === this.gender || this.gender === "general") &&
            service.dayOfWeek.includes(this.date) &&
            this.confirmAge(this.age, service.age)
          ) {
            if (this.isYouth(this.age) && this.isYouthService(service.age)) {
              this.youthServicesLater.push(service);
            } else {
              this.servicesLaterTime.push(service);
            }
          }
        } else {
          if (
            service.startTime <= this.time &&
            this.time < service.endTime &&
            (service.gender == this.gender ||
              service.gender.includes(`,${this.gender}`) ||
              this.gender === "general") &&
            service.lgbtq == this.LGBTQ &&
            service.dayOfWeek.includes(this.date)
          ) {
            if (this.isYouth(this.age) && this.isYouthService(service.age)) {
              this.youthServices.push(service);
            } else if (this.isSnack(service)) {
              this.snackTime.push(service);
            } else {
              this.servicesInTime.push(service);
            }
          } else if (
            service.startTime > this.time &&
            (service.gender == this.gender ||
              service.gender.includes(`,${this.gender}`) ||
              this.gender === "general") &&
            service.lgbtq == this.LGBTQ &&
            service.dayOfWeek.includes(this.date)
          ) {
            if (this.isYouth(this.age) && this.isYouthService(service.age)) {
              this.youthServicesLater.push(service);
            } else {
              this.servicesLaterTime.push(service);
            }
          }
        }
      }
    });

    // If atleast one service in time
    if (this.servicesInTime.length >= 1) {
      let removeIndex = [];
      let adjustCounter = 0;
      // loop over all services in time
      for (let i = 0; i < this.servicesInTime.length; i++) {
        let service = this.servicesInTime[i];
        // If this service ends in less than or equal to 30 minutes
        // !This number should not be hardcoded
        if (service.endTimeDiff <= 30) {
          let travelTime = await this.getTravelInfo(
            this.location,
            service.address
          ).catch(err => {
            console.log("error: " + err); //! NEED TO HANDLE THIS ERROR
          });
          // If travel time is greater than time until service ends, add index to removeIndex array
          if (travelTime > service.endTimeDiff) {
            removeIndex.push(i);
          }
        }
      }
      // Loop over all services in time, and remove those indexed in removeIndex
      for (let i = 0; i < removeIndex.length; i++) {
        this.servicesInTime.splice(removeIndex[i] - adjustCounter, 1);
        adjustCounter++;
      }
    }
    // sort services in time
    this.servicesInTime.sort((x, y) => x.distance - y.distance);
    // If youth services later - sort and add before prepending youth servicesInTime
    if (this.youthServicesLater.length > 1) {
      this.youthServicesLater.sort((x, y) => Number(x.startTime.split(":").join("")) - Number(y.startTime.split(":").join("")));
    }
    this.servicesInTime.unshift(...this.youthServicesLater);
    // If youth services - sort and add to beginning of servicesInTime array
    if (this.youthServices.length > 1) {
      this.youthServices.sort((x, y) => x.distance - y.distance);
    }
    this.servicesInTime.unshift(...this.youthServices);

    // If is snack, return before later services
    if (this.snackTime.length > 1) {
      this.snackTime.sort((x, y) => x.distance - y.distance);
    }
    this.servicesInTime.push(...this.snackTime);
    // Add later services to the end of the array
    // if more than 1 service at a later time, sort by closest start time
    if (this.servicesLaterTime.length > 1) {
      this.servicesLaterTime.sort((x, y) => Number(x.startTime.split(":").join("")) - Number(y.startTime.split(":").join("")));
    }
    this.servicesInTime.push(...this.servicesLaterTime);

    // Loop over servicesInTime and push the resourceId and the
    for (let i = 0; i < this.servicesInTime.length; i++) {
      this.mapInfo.push({
        id: this.servicesInTime[i].resourceId,
        time: this.servicesInTime[i].startTime
      });
    }
    this.mapInfo = JSON.stringify(this.mapInfo);
    // TODO: Remove all records that are > 35km away or specify the distace in notes.
    return this.servicesInTime;
  }
}
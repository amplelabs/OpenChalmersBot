import haversine from "haversine";
import moment from "moment";

export default class ImportFormatter {
  constructor(m) {
    this.address = m.address;
    this.organizationName = m.organizationName;
    this.program = m.program;
    this.startTime = m.startTime;
    this.endTime = m.endTime;
    this.dayOfWeek = m.dayOfWeek;
    this.type = m.type ? m.type : null;
    this.notes = m.notes;
    this.lgbtq = m.LGBTQ;
    this.latitude = m.latitude;
    this.longitude = m.longitude;
    this.gender = m.gender;
    this.age = m.age;
    this.race = m.race;
    this.distance = m.distance;
    this.phonenumber = m.phonenumber;
    this.website = m.website;
    this.resourceId = m.resourceId;
    this.language = m.language ? m.language : [];
    this.youth = !!(m.age && m.age[0] > 0 && m.age[1] <= 25);
    this.operatingHours = m.operatingHours; // .weeklyOperatingHours;
    this.specialHours = m.specialHours ? m.specialHours : false;
    if (m.dataSourceMeta.sourceResourceId) {
      this.sourceResourceId = m.dataSourceMeta.sourceResourceId;
    } else if (m.dataSourceMeta.sourceLegacyId) {
      this.sourceResourceId = m.sourceLegacyId;
    } else {
      this.sourceResourceId = "N/A";
    }
  }
  // Sets the text returned for a service
  // Any information stored in the notes field of a resource will be appended to the below logic.
  addNotes() {
    let notes = "";
    // If gender doesn't include mix.
    if (!this.gender.includes("mix")) {
      notes = `${this.youth ? "Youth" : this.gender.includes("female") ? "Women " : "Men"
        } only${this.lgbtq ? ", LGBTQ friendly" : ""}${this.age[0] === 0 ? "" : `; must be ${this.age[0]} or older`
        }${this.age[1] >= 99 ? "." : ` and ${this.age[1]} or younger.`}`;
      // if gender includes mix, will say everyone.
    } else {
      notes = `${this.youth ? "Youth" : "Everyone 👨‍👩‍👦"}${this.lgbtq ? ", LGBTQ friendly" : ""
        }${this.age[0] === 0 ? "" : `; must be ${this.age[0]} or older`}${this.age[1] >= 99 ? "." : ` and ${this.age[1]} or younger.`
        }`;
    }
    return notes;
  }
  // sets this.location and this.distance - both are undefined before this is called.
  addDistanceFrom(location) {
    this.location = location;
    this.distance = haversine(location, this, { unit: "meter" });
  }
  // Caluclates difference between now and the start/end time of a resource.
  addTimeDiff(time) {
    const msecToMin = 1.0 / 1000.0 / 60.0;
    this.startTimeDiff =
      moment(this.startTime, "HH:mm").diff(moment(time, "HH:mm")) * msecToMin;
    this.endTimeDiff =
      moment(this.endTime, "HH:mm").diff(moment(time, "HH:mm")) * msecToMin;
  }

  timeInfo(mealNow) {
    let info = "";
    // If service is not now
    if (mealNow !== "now") return info;
    if (this.startTimeDiff > 240) {
      info = "Sorry, that is the closest one to now I can find!";
    } else if (this.endTimeDiff <= 240 && this.endTimeDiff >= 120) {
      info = "You have plenty of time to get there!";
    } else if (this.endTimeDiff <= 120 && this.endTimeDiff >= 60) {
      info =
        "Looks like a reasonable amount of time to get there, I would check directions just to be safe!";
    } else if (this.endTimeDiff <= 60) {
      info = "You may want to check how far this is before you make your trip!";
    }
    return info;
  }
  formatTime(time) {
    let str = moment(time, "HH:mm").format("LT");
    let newArr = str.split("");
    newArr.splice(-3, 1); // remove space
    newArr[newArr.length - 1] = newArr[newArr.length - 1].toLowerCase(); // M -> m
    newArr[newArr.length - 2] = newArr[newArr.length - 2].toLowerCase(); // A || P -> a || p
    return newArr.join("");
  }
  hoursOfOperation() {
    let result = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    this.operatingHours.forEach(avail => {
      let day;
      let availObj = {};
      switch (avail.dayOfWeek) {
        case "Mon":
          day = "Monday";
          break;
        case "Tue":
          day = "Tuesday";
          break;
        case "Wed":
          day = "Wednesday";
          break;
        case "Thu":
          day = "Thursday";
          break;
        case "Fri":
          day = "Friday";
          break;
        case "Sat":
          day = "Saturday";
          break;
        case "Sun":
          day = "Sunday";
          break;
        default:
          break;
      }
      availObj.startTime = `${this.formatTime(avail.startTime)}`;
      availObj.endTime = `${this.formatTime(avail.endTime)}`;
      result[day].push(availObj);
    });
    for (let key in result) {
      if (result[key].length === 0) {
        delete result[key];
      } else {
        result[key].sort((x, y) => x.startTime - y.startTime);
      }
    }
    return result;
  }

  startsInText(isNow) {
    const start = moment(this.startTime, "HH:mm").format("HH:mm");
    const end = moment(this.endTime, "HH:mm").format("HH:mm");
    const startText = moment(this.startTime, "HH:mm").format("h:mm");
    const endText = moment(this.endTime, "HH:mm").format("h:mm");
    if (isNow) {
      if (this.startTimeDiff >= 0) {
        return `<b>⏳ Open Soon</b></br> the ${process.env.SERVICE_NAME} will open ${this.startTimeDiff == 0
          ? "now"
          : `in<b>
            ${this.startTimeDiff > 60
            ? `${Math.round(this.startTimeDiff / 60)} hours${this.startTimeDiff % 60 === 0
              ? ``
              : ` and ${this.startTimeDiff % 60} minutes`
            }`
            : `${this.startTimeDiff} minutes`
          }.</b>`
          }`;
      } else if (this.endTimeDiff >= 0) {
        return `<b>✅ Open Now</b><br> the ${process.env.SERVICE_NAME} will finish in<b> ${this.endTimeDiff > 60
          ? `${Math.round(this.endTimeDiff / 60)} hours${this.endTimeDiff % 60 === 0
            ? ``
            : ` and ${this.endTimeDiff % 60} minutes`
          }`
          : `${this.endTimeDiff} minutes`
          }.</b>`;
      }
    } else {
      return `will be served between <b>${start >= "12:00" ? startText + "pm" : startText + "am"
        } and ${end >= "12:00" ? endText + "pm" : endText + "am"}.</b>`;
    }
  }
}

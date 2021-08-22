import moment from "moment-timezone";
import DialogActions from "./dialog-actions";
import LocationFinder from "./location-finder";
import ServiceFinder from "./service-finder";
import * as parseTime from "./get-time";
import ImportFormatter from "./import-formatter";
import { findServices as MongooseConnect } from "./mongoose-connect";
import appConfig from "../config/appConfig";
import cityConfig from "../config/city";

export default class Fulfiller {
  constructor(event, context) {
    this.event = event;
    this.context = context;
    this.userSession = {};
    this.location;
    this.services = [];
    this.service = {};
    this.serviceName = process.env.SERVICE_NAME;
    this.serviceFinder;
    this.closestServices = [];
    this.serviceString = "";
    this.more = appConfig.text.more;
    this.now = appConfig.text.now;
    // default session attributes
    this.event.sessionAttributes.serviceName = null;
    this.event.sessionAttributes.serviceType = null;
    this.event.sessionAttributes.resourceId = null;
    this.event.sessionAttributes.servicePhone = null;
    // city config
    this.cityConfig = cityConfig;

    if (this.event.currentIntent.slots.serviceCounter == null) {
      this.event.currentIntent.slots.serviceCounter = 0;
    }
  }
  setServiceString() {
    // first msg
    if (
      this.event.currentIntent.slots.Eligibility === "Yes" &&
      this.event.currentIntent.slots.Gender === "mix" &&
      this.event.currentIntent.slots.serviceCounter == 0
    ) {
      this.serviceString += appConfig.text.sorryNoSpec;
    } else if (
      this.event.currentIntent.slots.serviceCounter == 0 &&
      this.service.type === "Snack"
    ) {
      this.serviceString += `There are no meals available right now, but there are snacks available.<div class="response-card-spacer"></div> ## `;
    }
    // set serviceName
    let serviceNameString = this.serviceName;
    if (this.serviceName === "meal" && this.service.type) {
      serviceNameString = `meal (${this.service.type.toLowerCase()})`;
    }
    this.serviceString += `<div class="response-card-max">The closest <b>${serviceNameString}</b> to you is at:<br><br>`;
    this.serviceString += `<b>🏁 Service Name</b><br>`;
    this.serviceString += `${this.service.organizationName}<br><br>`;
    this.serviceString += `<b>📍 Location (${(
      this.service.distance / 1000
    ).toFixed(2)}km away)</b><br>`;
    this.serviceString += `${this.service.address}.`;
    this.serviceString += `<div class="response-card-spacer"></div></div> ## `;
    // COVID second msg
    this.serviceString += `<div id="covid-message"><img src="https://chalmers-assets.s3.amazonaws.com/alert-triangle.svg" width="18px" height="19px" id="covid-banner">COVID-19 Alert</div><br><div class='covid-alert'>`;
    this.serviceString += `Due to COVID-19, operational hours and services might have changed or closed down.`;
    if (this.service.phonenumber) {
      this.serviceString += `<br><br>`;
      this.serviceString += `📞 Please call ${this.service.organizationName} at <a href="tel:${this.service.phonenumber}" style="text-decoration:none;color:#FF0000">${this.service.phonenumber}</a> before visiting in person.</div>`;
    } else {
      this.serviceString += `</div>`;
    }
    if (this.service.specialHours === true) {
      this.serviceString += `<br>`;
      this.serviceString += `⏰ <b>Special Operating Hours${
        !!(this.serviceName === "meal" && this.service.type)
          ? ` for ${this.service.type}`
          : ""
      }`;
      this.serviceString += `</b><br>`;
      this.serviceString += `${this.service.formatTime(
        this.service.startTime
      )}-${this.service.formatTime(this.service.endTime)}`;
    }
    if (this.service.operatingHours.length) {
      this.serviceString += `<br>`;
      this.serviceString += `⏰ <b>Typical Operating Hours${
        !!(this.serviceName === "meal" && this.service.type)
          ? ` for ${this.service.type}`
          : ""
      }`;
      this.serviceString += `</b><br>`;
      const hoursOfOperation = this.service.hoursOfOperation();
      for (let dayOfWeek in hoursOfOperation) {
        this.serviceString += `${dayOfWeek}: `;
        let hoursArr = hoursOfOperation[dayOfWeek];
        for (let i = 0; i < hoursArr.length; i++) {
          this.serviceString += `${hoursArr[i].startTime}-${hoursArr[i].endTime}`;
          if (i !== hoursArr.length - 1) {
            this.serviceString += ", ";
          }
        }
        let days = Object.keys(dayOfWeek);
        if (dayOfWeek !== days[days.length - 1]) {
          this.serviceString += "<br>";
        }
      }
    }

    // end of temp COVID second msg
    this.serviceString += `<div class="response-card-spacer"></div>  ## `;
    // third msg
    this.serviceString += `<b>⚙️ Eligibility</b><br>`;
    this.serviceString += `Serves <b>${this.service.addNotes()}</b>`;
    if (this.service.notes) {
      this.serviceString += `<br><div class="response-card-max">${this.service.notes}</div>`;
    }
    this.serviceString += `<div class="response-card-spacer"></div>  ## `;
    // fourth msg
    if (this.service.phonenumber === "na" || !this.service.phonenumber) {
      this.serviceString += "";
    } else {
      this.serviceString += "<b>More Information</b><br>";
      this.serviceString += `Please visit: 📞 <a href="tel:${this.service.phonenumber}" style="text-decoration:none;">${this.service.phonenumber}</a> to get access to the service.`;
      if (this.service.website) {
        this.serviceString += `<br><br>`;
        this.serviceString += `You can visit their <a href="${this.service.website}" target="_blank">website</a> 🌐 for more information.`;
      }
      this.serviceString += `<div class="response-card-spacer"></div> ## `;
    }
  }
  async fulfill() {
    // Clear at the start of each execution
    if (!this.event.currentIntent.slots.Time) {
      this.userSession.AnotherTime = "Yes";
      this.userSession.TimeInput = this.event.inputTranscript;
      try {
        this.event.currentIntent.slots.Time = parseTime.getTime(
          this.event.inputTranscript
        ).miliTime;
      } catch (e) {
        this.event.currentIntent.slots.Time = null;
      }
      // What time do you want to eat?
      if (!this.event.currentIntent.slots.Time) {
        return DialogActions.elicitSlot(
          this.event.sessionAttributes,
          "Time",
          this.event.currentIntent.name,
          this.event.currentIntent.slots,
          appConfig.text.sorryWhatTime
        );
      }
    }
    // If Age and Gender Options is selected set Elgibility to yes
    if (
      this.event.currentIntent.slots.ShowMore === "Age & gender options" ||
      this.event.currentIntent.slots.ShowMore === "Options" ||
      this.event.currentIntent.slots.ShowMore === "options"
    ) {
      this.event.currentIntent.slots.Age = null;
      this.event.currentIntent.slots.Gender = null;
      this.event.currentIntent.slots.ShowMore = null;
      this.event.currentIntent.slots.AltResult =
        this.event.currentIntent.slots.AltResult === "yes" ? "yes" : null;
      this.event.currentIntent.slots.Eligibility = "Yes";
    }
    // No age has yet been provided. Prompt for Age and reset service counter
    if (
      this.event.currentIntent.slots.Eligibility === "Yes" &&
      this.event.currentIntent.slots.Age == null &&
      this.event.currentIntent.slots.Gender !== "mix"
    ) {
      this.userSession.Eligibility = "Yes";
      this.event.currentIntent.slots.ShowMore = null;
      this.event.currentIntent.slots.serviceCounter = 0;
      return DialogActions.elicitSlot(
        this.event.sessionAttributes,
        "Age",
        this.event.currentIntent.name,
        this.event.currentIntent.slots,
        appConfig.text.howOldAreYou
      );
      // Age has been provided but gender has not been specified - prompt for gender
    } else if (
      this.event.currentIntent.slots.Eligibility === "Yes" &&
      !this.event.currentIntent.slots.Gender
    ) {
      this.userSession.Age = this.event.inputTranscript;
      return DialogActions.buttonElicitSlot(
        this.event.sessionAttributes,
        "Gender",
        this.event.currentIntent.name,
        this.event.currentIntent.slots,
        appConfig.text.whatGenderDoYou,
        null,
        appConfig.button.genderOptions.textArray,
        appConfig.button.genderOptions.valueArray
      );
      // This case does not appear to exist... More investigation required.
    } else if (this.event.currentIntent.slots.Eligibility === "No") {
      this.event.currentIntent.slots.ShowMore = null;
    }
    //Disabling LGBTQ question
    this.event.currentIntent.slots.LGBTQ = false;

    // set location
    this.location = await new LocationFinder(this.event).getLocation();
    // get Services
    let mongooseResults = await MongooseConnect(
      this.event,
      this.context,
      process.env.SERVICE_TYPE
    );
    this.services = mongooseResults.map(
      (service) => new ImportFormatter(service)
    );
    // return Closest Services
    if (this.event.currentIntent.slots.serviceCounter >= 0) {
      this.userSession.Gender = this.event.currentIntent.slots.Gender;
      this.serviceFinder = new ServiceFinder(
        this.services,
        this.location,
        moment(this.event.currentIntent.slots.Date).format("ddd"),
        this.event.currentIntent.slots.Time,
        this.event.currentIntent.slots.Age,
        this.event.currentIntent.slots.Gender,
        this.event.currentIntent.slots.LGBTQ,
        this.event.currentIntent.slots.LanguageOption
          ? this.event.currentIntent.slots.LanguageOption
          : null,
        this.cityConfig
      );
      this.closestServices = await this.serviceFinder.find();
      //this.event.sessionAttributes.mealInfo = ServiceFinder.mapInfo;
    }
    // If no services, and gender is selected - clear age gender and counter - and return results
    if (
      this.closestServices.length === 0 &&
      this.event.currentIntent.slots.Eligibility === "Yes" &&
      this.event.currentIntent.slots.Gender !== "mix"
    ) {
      this.userSession.GenderAlternativeOptions = "Yes";
      this.event.currentIntent.slots.Gender = "mix";
      this.event.currentIntent.slots.Age = null;
      this.event.currentIntent.slots.serviceCounter = 0;
      this.serviceFinder = new ServiceFinder(
        this.services,
        this.location,
        moment(this.event.currentIntent.slots.Date).format("ddd"),
        this.event.currentIntent.slots.Time,
        this.event.currentIntent.slots.Age,
        this.event.currentIntent.slots.Gender,
        this.event.currentIntent.slots.LGBTQ,
        this.event.currentIntent.slots.LanguageOption
          ? this.event.currentIntent.slots.LanguageOption
          : null,
        this.cityConfig
      );
      //this.event.sessionAttributes.mealInfo = ServiceFinder.mapInfo;
      this.closestServices = await this.serviceFinder.find();
      this.service = this.closestServices[
        this.event.currentIntent.slots.serviceCounter
      ];
    }
    // If no meals nearby get tomorrow's results
    if (this.closestServices.length === 0) {
      this.event.currentIntent.slots.mealNow = "no";
      this.event.currentIntent.slots.Time = "00:00";
      this.event.currentIntent.slots.AltResult = "yes";
      this.event.currentIntent.slots.Date = moment(
        this.event.currentIntent.slots.Date
      )
        .add(1, "day")
        .format("YYYY-MM-DD");
      this.serviceFinder = new ServiceFinder(
        this.services,
        this.location,
        moment(this.event.currentIntent.slots.Date).format("ddd"),
        this.event.currentIntent.slots.Time,
        this.event.currentIntent.slots.Age,
        this.event.currentIntent.slots.Gender,
        this.event.currentIntent.slots.LGBTQ,
        this.event.currentIntent.slots.LanguageOption
          ? this.event.currentIntent.slots.LanguageOption
          : null,
        this.cityConfig
      );
      //this.event.sessionAttributes.mealInfo = ServiceFinder.mapInfo;
      this.closestServices = await this.serviceFinder.find();
    }
    // if more services requested
    if (
      this.event.currentIntent.slots.ShowMore &&
      (this.event.currentIntent.slots.ShowMore === "Another option" ||
        this.event.currentIntent.slots.ShowMore === "option")
    ) {
      // increment counter
      this.event.currentIntent.slots.serviceCounter++;
    }
    // updated current service returned
    this.service = this.closestServices[
      this.event.currentIntent.slots.serviceCounter
    ];
    // If no services returned, show available service types
    if (!this.service) {
      return DialogActions.buttonElicitSlot(
        this.event.sessionAttributes,
        "ShowMore",
        this.event.currentIntent.name,
        this.event.currentIntent.slots,
        appConfig.text.thoseWereAll,
        null,
        appConfig.button.serviceOptions.textArray,
        appConfig.button.serviceOptions.valueArray
      );
    }
    // Set Service String
    this.setServiceString();
    // If show more time, elicit Date slot.
    if (
      this.event.currentIntent.slots.ShowMore === "Time" ||
      this.event.currentIntent.slots.ShowMore === "time"
    ) {
      this.event.currentIntent.slots.serviceCounter = 0;
      this.event.currentIntent.slots.Time = null;
      this.event.currentIntent.slots.ShowMore = null;
      this.event.currentIntent.slots.AltResult = null;
      this.event.currentIntent.slots.mealNow = "no";
      return DialogActions.elicitSlot(
        this.event.sessionAttributes,
        "Date",
        this.event.currentIntent.name,
        this.event.currentIntent.slots,
        appConfig.text.differentTime
      );
    }
    // If showMore is selected and no if's above get returned it is assumed the this is fine was pressed.
    //!FIXME
    if (
      this.event.currentIntent.slots.ShowMore &&
      !this.more.includes(this.event.currentIntent.slots.ShowMore.toLowerCase())
    ) {
      this.event.currentIntent.slots.ShowMore = "fine";
    }
    // if we get all the way here and none of the above if statements with returns get called, and
    // the above if statement does not resolve, return the next result, else return the feedback dialogue.
    // record phone number, org name and serviceType in session attributes to use in SMS follow-up
    this.event.sessionAttributes.serviceName = this.service.organizationName;
    this.event.sessionAttributes.resourceId = this.service.sourceResourceId;
    this.event.sessionAttributes.serviceType = process.env.SERVICE_TYPE;
    this.event.sessionAttributes.servicePhone = this.service.phonenumber;
    if (this.event.currentIntent.slots.ShowMore !== "fine") {
      return DialogActions.displayResultBtn(
        this.event.currentIntent.slots,
        this.event.sessionAttributes,
        this.event.currentIntent.name,
        "ShowMore",
        this.serviceString,
        this.service.address,
        this.location.address
      );
    } else {
      return DialogActions.elicitSlot(
        this.event.sessionAttributes,
        "Feedback",
        "Feedback_NPS",
        { Feedback: "null" },
        appConfig.text.feedback
      ); //init final flow
    }
  }
}

import moment from "moment-timezone";
import nlp from "compromise";

export function getTime(timeIn) {
  var timeLowercase = timeIn.toLowerCase();
  const isMorning = !!(
    timeLowercase.includes("morning") ||
    timeLowercase.includes("morn") ||
    timeLowercase.includes("breakfast") ||
    timeLowercase.includes(" am")
  );

  var hour;
  var minute;
  var temp;
  var userTime;
  var time;

  try {
    temp = nlp(timeIn)
      .dates()
      .data()[0].date.time.hour;
  } catch (e) {} //TODO: ERROR HANDLING
  if (
    temp == null ||
    timeLowercase.includes(" pm") ||
    timeLowercase.includes(" am")
  ) {
    timeLowercase = timeLowercase.replace(":", " ");
    try {
      //handling hour
      var matches = timeIn.match(/\d+/g);
      hour = parseInt(matches[0]);
      //assuming it's morning when time input is greater or equal to 9
      hour =
        isMorning || hour === 12
          ? moment(hour, "HH").format("HH")
          : moment(hour + 12, "HH").format("HH");
      try {
        minute = parseInt(matches[1]);
        minute =
          minute >= 0 && minute <= 59
            ? moment(minute, "mm").format("mm")
            : "00";
      } catch (e) {
        minute = moment.tz("America/Toronto").format("mm");
      }
    } catch (e) {
      hour = null;
    }
    if (hour != null && minute != null) {
      time = hour + ":" + minute;
      userTime =
        parseInt(hour) % 12 !== 0
          ? (parseInt(hour) % 12) + ":" + minute
          : 12 + ":" + minute;
    }
  } else {
    try {
      var datesData = nlp(timeIn)
        .dates()
        .data()[0].date.time;
      time =
        parseInt(datesData.hour) === 24
          ? moment(12, "HH").format("HH") +
            ":" +
            (datesData.minute == null
              ? "00"
              : moment(datesData.minute, "mm").format("mm"))
          : moment(datesData.hour, "HH").format("HH") +
            ":" +
            (datesData.minute == null
              ? "00"
              : moment(datesData.minute, "mm").format("mm"));
      userTime =
        parseInt(time.substring(0, 2)) % 12 !== 0
          ? (parseInt(time.substring(0, 2)) % 12) + ":" + time.substring(3, 5)
          : 12 + ":" + time.substring(3, 5);
    } catch (e) {
      time = null;
      userTime = null;
    }
  }
  if (time != null && userTime != null) {
    return {
      miliTime: time,
      userTime: userTime
    };
  } else {
    return {
      miliTime: null,
      userTime: null
    };
  }
}

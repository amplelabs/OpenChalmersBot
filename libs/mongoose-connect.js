import moment from "moment";
import "moment-timezone";
import mongoose from "mongoose";
import "../models/serviceModel";
import { getCurrentRegionAliases } from "../libs/distance";

let conn = null;
const uri = process.env.MONGO_URI;

export async function findServices(event, context, serviceType) {
  // Make sure to add this so you can re-use `conn` between function calls.
  // See https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
  context.callbackWaitsForEmptyEventLoop = false;
  // Because `conn` is in the global scope, Lambda may retain it between
  // function calls thanks to `callbackWaitsForEmptyEventLoop`.
  // This means your Lambda function doesn't have to go through the
  // potentially expensive process of connecting to MongoDB every time.
  if (conn == null) {
    conn = await mongoose.createConnection(uri, {
      // Buffering means mongoose will queue up operations if it gets
      // disconnected from MongoDB and send them when it reconnects.
      // With serverless, better to fail fast if not connected.
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // and MongoDB driver buffering
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    conn.model("Services");
  }
  const Services = conn.model("Services");
  const documents = await Services.find({
    serviceType: serviceType,
    status: "Enabled",
  });
  // Ugly transformation to make it work with existing logic
  const results = [];
  const date = moment.tz(event.currentIntent.slots.Date, "America/Toronto");
  documents.forEach((record) => {
    const specialCloseHours = [];
    const specialHoursArray = [];
    const doc = record._doc;
    // Special Close Hours
    if (doc.operatingHours.specialCloseHours) {
      const reducedCloseResults = doc.operatingHours.specialCloseHours.reduce(
        (acc, val) => {
          if (
            moment(val.startDate)
              .tz("America/Toronto")
              .isSameOrBefore(date, "day") &&
            moment(val.endDate).tz("America/Toronto").isSameOrAfter(date, "day")
          ) {
            acc.push(val);
          }
          return acc;
        },
        []
      );
      // If there are special close hours on this day
      specialCloseHours.push(...reducedCloseResults);
      specialHoursArray.push(...specialCloseHours);
    }
    // Special Open Hours
    if (doc.operatingHours.specialOpenHours) {
      const specialOpenHours = doc.operatingHours.specialOpenHours;
      const reducedOpenResults = doc.operatingHours.specialOpenHours.reduce(
        (acc, val) => {
          if (
            moment(val.startDate)
              .tz("America/Toronto")
              .isSameOrBefore(date, "day") &&
            moment(val.endDate).tz("America/Toronto").isSameOrAfter(date, "day")
          ) {
            acc.push(val);
          }
          return acc;
        },
        []
      );
      if (reducedOpenResults.length) {
        for (let openAvailability of reducedOpenResults) {
          if (specialCloseHours.length) {
            for (let closeAvailability of specialCloseHours) {
              if (
                moment(openAvailability.startDate).isSameOrAfter(
                  closeAvailability.startDate
                ) &&
                moment(openAvailability.startDate).isBefore(
                  closeAvailability.endDate
                )
              ) {
                if (
                  moment(openAvailability.endDate).isAfter(
                    closeAvailability.endDate
                  )
                ) {
                  openAvailability.startDate = closeAvailability.endDate;
                } else {
                  openAvailability.startDate = null;
                  openAvailability.endDate = null;
                }
              } else if (
                moment(openAvailability.startDate).isBefore(
                  closeAvailability.startDate
                )
              ) {
                if (
                  moment(openAvailability.endDate).isAfter(
                    closeAvailability.startDate
                  )
                ) {
                  if (
                    moment(openAvailability.endDate).isAfter(
                      closeAvailability.endDate
                    )
                  ) {
                    // add new record to specialOpenHours, starting at closeAvailability.endDate
                    specialOpenHours.push({
                      startDate: closeAvailability.endDate,
                      endDate: openAvailability.endDate,
                    });
                  }
                  openAvailability.endDate = closeAvailability.startDate;
                }
              }
            }
          }
          if (openAvailability.startDate && openAvailability.endDate) {
            specialHoursArray.push(openAvailability);
            let res = Object.assign(
              {
                startTime: moment(openAvailability.startDate)
                  .tz("America/Toronto")
                  .format("HH:mm"),
                endTime: moment(openAvailability.endDate)
                  .tz("America/Toronto")
                  .format("HH:mm"),
                dayOfWeek: [
                  moment(openAvailability.startDate)
                    .tz("America/Toronto")
                    .format("ddd"),
                ],
                specialHours: true,
              },
              doc
            );
            results.push(res);
          }
        }
      }
    }
    // Regular Operating Hours
    let opHours = doc.operatingHours.weeklyOperatingHours;
    for (let weeklyAvail of opHours) {
      if (
        specialHoursArray.length &&
        weeklyAvail.startTime &&
        weeklyAvail.endTime
      ) {
        let startSplit = weeklyAvail.startTime.split(":");
        let endSplit = weeklyAvail.endTime.split(":");
        let openAvailability = {
          startDate: moment.tz(
            [
              date.year(),
              date.month(),
              date.date(),
              Number(startSplit[0]),
              Number(startSplit[1]),
            ],
            "America/Toronto"
          ),
          endDate: moment.tz(
            [
              date.year(),
              date.month(),
              date.date(),
              Number(endSplit[0]),
              Number(endSplit[1]),
            ],
            "America/Toronto"
          ),
        };
        for (let specialAvailability of specialHoursArray) {
          if (
            moment(openAvailability.startDate).isSameOrAfter(
              specialAvailability.startDate
            ) &&
            moment(openAvailability.startDate).isBefore(
              specialAvailability.endDate
            )
          ) {
            if (
              moment(openAvailability.endDate).isAfter(
                specialAvailability.endDate
              )
            ) {
              openAvailability.startDate = moment(specialAvailability.endDate);
              weeklyAvail.startTime = moment(openAvailability.startDate)
                .tz("America/Toronto")
                .format("HH:mm");
            } else {
              weeklyAvail.startTime = null;
              weeklyAvail.endTime = null;
            }
          } else if (
            moment(openAvailability.startDate).isBefore(
              specialAvailability.startDate
            )
          ) {
            if (
              moment(openAvailability.endDate).isAfter(
                specialAvailability.startDate
              )
            ) {
              if (
                moment(openAvailability.endDate).isAfter(
                  specialAvailability.endDate
                )
              ) {
                // add new record to opHours, starting at specialAvailability.endDate
                opHours.push({
                  startTime: moment(specialAvailability.endDate)
                    .tz("America/Toronto")
                    .format("HH:mm"),
                  endTime: moment(openAvailability.endDate)
                    .tz("America/Toronto")
                    .format("HH:mm"),
                  dayOfWeek: [
                    moment(specialAvailability.endDate)
                      .tz("America/Toronto")
                      .format("ddd"),
                  ],
                });
              }
              openAvailability.endDate = moment(specialAvailability.startDate);
              weeklyAvail.endTime = moment(openAvailability.endDate)
                .tz("America/Toronto")
                .format("HH:mm");
            }
          }
        }
      }
      if (weeklyAvail.startTime && weeklyAvail.endTime) {
        let new_record = Object.assign(
          {
            startTime: weeklyAvail.startTime,
            endTime: weeklyAvail.endTime,
            dayOfWeek: [weeklyAvail.dayOfWeek],
          },
          doc
        );
        results.push(new_record);
      }
    }
  });
  return results;
}

export async function findWebsite(event, context, serviceType, subType) {
  context.callbackWaitsForEmptyEventLoop = false;
  if (conn == null) {
    conn = await mongoose.createConnection(uri, {
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // and MongoDB driver buffering
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    conn.model("Services");
  }
  const Services = conn.model("Services");
  const doc = await Services.findOne({
    serviceType: serviceType,
    type: subType,
  });

  return doc;
}

export async function findPhone(event, context, serviceType, subType) {
  context.callbackWaitsForEmptyEventLoop = false;
  if (conn == null) {
    conn = await mongoose.createConnection(uri, {
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // and MongoDB driver buffering
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    conn.model("Services");
  }
  const currentAliases = getCurrentRegionAliases(
    event.sessionAttributes.latitude || event.sessionAttributes.Latitude,
    event.sessionAttributes.longitude || event.sessionAttributes.Longitude
  );
  const Services = conn.model("Services");
  const doc = await Services.find({
    serviceType: serviceType,
    type: { $regex: subType },
    status: "Enabled",
    notes: { $exists: true, $ne: null },
    serviceArea: { $in: currentAliases },
  });

  return doc;
}

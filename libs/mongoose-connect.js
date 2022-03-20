import moment from "moment";
import "moment-timezone";
import mongoose from "mongoose";
import "../models/serviceModel";
import { getCurrentRegionAliases } from "../libs/distance";

let conn = null;
const uri = process.env.MONGO_URI;

const timeStrToTime = (str, reqDate) => {
  const tmp = str.split(":");
  const hr = Number(tmp[0]);
  const min = Number(tmp[1]);
  return moment.tz(
    [
      reqDate.year(),
      reqDate.month(),
      reqDate.date(),
      hr,
      min
    ],
    "America/Toronto"
  )
}

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
  
  for (const m of documents) {
    let item = {
      address: m.address,
      organizationName : m.organizationName,
      program : m.program,
      startTime : m.startTime,
      endTime : m.endTime,
      dayOfWeek : m.dayOfWeek,
      type : m.type,
      notes : m.notes,
      lgbtq : m.LGBTQ,
      latitude : m.latitude,
      longitude : m.longitude,
      gender : m.gender,
      age : m.age,
      race : m.race,
      distance : m.distance,
      phonenumber : m.phonenumber,
      website : m.website,
      resourceId : m.resourceId,
      language: m.language,
      operatingHours: m.operatingHours,
      dataSourceMeta: {},
    }

    // confirm do i need to check time -- open or close etc.
    for (let hr of m.operatingHours) {
      let o = Object.assign({}, item);
      o.operatingHours = {
        startTime: timeStrToTime(hr.startTime, date),
        endTime: timeStrToTime(hr.endTime, date),
        dayOfWeek: hr.dayOfWeek
      }
      results.push(o)
    }    
  }

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

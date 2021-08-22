import { findPhone } from "../../libs/mongoose-connect";
import DialogActions from "../../libs/dialog-actions";
import Validator from "../../libs/validator";
import haversine from "haversine";
// import haversine from 'haversine';

async function fulfiller(event, context) {
  let slots = event.currentIntent.slots;
  let result;
  let sessionAttributes = event.sessionAttributes;

  switch (slots.CrisisType) {
    case "General":
      result = await findPhone(event, context, "crisis", "issues");
      break;
    case "Youth":
      result = await findPhone(event, context, "crisis", "youth");
      break;
    case "Women":
      result = await findPhone(event, context, "crisis", "women");
      break;
    case "LGBTQ2S":
      result = await findPhone(event, context, "crisis", "LGBTQ");
      break;
    case "Mental Health + Addictions":
      result = await findPhone(event, context, "crisis", "addiction");
      break;
    default:
      break;
  }
  if (!result) {
    // handle no website
    throw new Error("No results");
  }
  const docResult = result.map((record) => record._doc);
  const resultWithDistance = docResult.map((record) => {
    record.distance = haversine(sessionAttributes, record, { unit: "meter" });
    return record;
  });
  let sortedResult = resultWithDistance.sort((a, b) => a.distance - b.distance);
  let resStr = "";
  resStr += ` ## <div id="covid-message"><img src="https://chalmers-assets.s3.amazonaws.com/alert-triangle.svg" width="18px" height="19px" id="covid-banner">COVID-19 Alert</div><br><span class='covid-alert'>Due to COVID-19, wait times may be longer than usual. We're still here for you, it might just take a bit longer.</span>`;
  for (let record of sortedResult) {
    resStr += ` ## <b>${record.organizationName}.</b><br><a href="tel:${record.phonenumber}">${record.phonenumber}</a> ${record.notes}`;
  }
  return DialogActions.displayPhoneResult(sessionAttributes, resStr);
}

export async function validations(event) {
  try {
    const validator = new Validator(event);
    let response = await validator.validate();
    return response;
  } catch (err) {
    console.log("err: " + JSON.stringify(err));
  }
}

export async function fulfill(event, context) {
  try {
    let response = await fulfiller(event, context);
    return response;
  } catch (e) {
    console.log(e);
  }
}

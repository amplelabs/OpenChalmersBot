import Validator from "../../libs/validator";
import Fulfiller from "../../libs/fulfiller";

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

export async function fulfillment(event, context, callback) {
  let fulfiller = new Fulfiller(event, context);
  let response = await fulfiller.fulfill();
  return response;
}

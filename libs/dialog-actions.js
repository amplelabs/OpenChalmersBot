// API Documentation: https://docs.aws.amazon.com/lex/latest/dg/lambda-input-response-format.html#using-lambda-response-format
import { MapAdapter } from "./map-adapter";

function plainMessage(content, contentType = "PlainText") {
  return { contentType, content };
}

export default class DialogActions {
  static fail(content) {
    return this.close(plainMessage(content), "Failed");
  }

  static fulfill(content) {
    return this.close(plainMessage(content), "Fulfilled");
  }

  static elicitSlot(sessionAttributes, slotName, intentName, slots, message) {
    return {
      sessionAttributes: sessionAttributes,
      dialogAction: {
        type: "ElicitSlot",
        slotToElicit: slotName,
        intentName: intentName,
        message: {
          contentType: "PlainText",
          content: message
        },
        slots
      }
    };
  }

  static close(message, fulfillmentState) {
    return {
      dialogAction: {
        type: "Close",
        fulfillmentState,
        message
      }
    };
  }
  static displayLinkResult(sessionAttributes, imageUrl, attachmentUrl) {
    return {
      sessionAttributes,
      dialogAction: {
        type: "Close",
        fulfillmentState: "Fulfilled",
        message: {
          contentType: "PlainText",
          content: `<a href=${attachmentUrl} target='_blank'><img src=${imageUrl} style='width:100%;height:100%;'></a>`
        }
      }
    };
  }
  static displayPhoneResult(sessionAttributes, content) {
    return {
      sessionAttributes,
      dialogAction: {
        type: "Close",
        fulfillmentState: "Fulfilled",
        message: {
          contentType: "PlainText",
          content:
            `Here's what I have:` +
            content +
            ` ## Is there anything else that I can help you with today?`
        },
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              buttons: [
                { text: "🚨 Other Crisis Numbers", value: "Crisis" },
                { text: "🍔 Food", value: "Food" },
                { text: "🎨 Things To Do", value: "Things To Do" },
                { text: "👔 Clothing", value: "Clothing" },
                { text: "🛏 Shelter", value: "Overnight Shelter" }
              ]
            }
          ]
        }
      }
    };
  }
  static displayOptions(sessionAttributes, content) {
    return {
      sessionAttributes,
      dialogAction: {
        type: "Close",
        fulfillmentState: "Fulfilled",
        message: {
          contentType: "PlainText",
          content: content
        },
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              buttons: [
                { text: "🚨 Crisis", value: "Crisis" },
                { text: "🍔 Food", value: "Food" },
                { text: "🎨 Things To Do", value: "Things To Do" },
                { text: "👔 Clothing", value: "Clothing" },
                { text: "🛏 Shelter", value: "Overnight Shelter" }
              ]
            }
          ]
        }
      }
    };
  }
  static displayResultBtn(
    slots,
    sessionAttributes,
    intentName,
    slotName,
    content,
    mealAddress,
    location
  ) {
    let intersection = location;
    let directionsMap = `https://www.google.com/maps/dir/?api=1&origin=${
      slots.useGPS === "Yes" &&
      sessionAttributes.Latitude != null &&
      sessionAttributes.Longitude != null
        ? `${sessionAttributes.Latitude},${sessionAttributes.Longitude}`
        : `${intersection}`
    }&destination=${mealAddress}&travelmode=walking`;

    return {
      sessionAttributes,
      dialogAction: {
        type: "ElicitSlot",
        slotToElicit: slotName,
        message: {
          contentType: "PlainText",
          content: content
        },
        intentName: intentName,
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              buttons: [
                { text: "Another option", value: "Another option" },
                { text: "Another time", value: "time" },
                { text: "Age & gender options", value: "Age & gender options" },
                { text: "Done", value: "fine" }
              ],
              title: "Directions",
              subTitle: "Directions",
              imageUrl: MapAdapter.mapsUrl(mealAddress),
              attachmentLinkUrl: directionsMap
            }
          ]
        },
        slots
      }
    };
  }

  static displayResultBtnWithoutAge(
    slots,
    sessionAttributes,
    intentName,
    slotName,
    content,
    mealAddress,
    location
  ) {
    let intersection = location;
    let directionsMap = `https://www.google.com/maps/dir/?api=1&origin=${
      slots.useGPS === "Yes" &&
      sessionAttributes.Latitude != null &&
      sessionAttributes.Longitude != null
        ? `${sessionAttributes.Latitude},${sessionAttributes.Longitude}`
        : `${intersection}`
    }&destination=${mealAddress}&travelmode=walking`;

    return {
      sessionAttributes,
      dialogAction: {
        type: "ElicitSlot",
        slotToElicit: slotName,
        message: {
          contentType: "PlainText",
          content: content
        },
        intentName: intentName,
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              buttons: [
                { text: "Another option", value: "Another option" },
                { text: "Another time", value: "time" },
                { text: "Done", value: "fine" }
              ],
              title: "Directions",
              subTitle: "Directions",
              imageUrl: MapAdapter.mapsUrl(mealAddress),
              attachmentLinkUrl: directionsMap
            }
          ]
        },
        slots
      }
    };
  }

  static buttonElicitSlot(
    sessionAttributes,
    slotName,
    intentName,
    slots,
    message,
    cardTitle,
    btnTexts,
    btnValues
  ) {
    let textValuePair = [];
    try {
      for (let i = 0; i < btnTexts.length; i++) {
        textValuePair.push({ text: btnTexts[i], value: btnValues[i] });
      }
    } catch (e) {}

    return {
      sessionAttributes: sessionAttributes,
      dialogAction: {
        type: "ElicitSlot",
        slotToElicit: slotName,
        intentName: intentName,
        message: {
          contentType: "PlainText",
          content: message
        },
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              title: cardTitle,
              subTitle: null,
              buttons: textValuePair
            }
          ]
        },
        slots
      }
    };
  }
  static confirmAddress(slots, sessionAttributes, intentName, address) {
    const mapsUrl = MapAdapter.mapsUrl(address);
    return {
      sessionAttributes,
      dialogAction: {
        type: "ConfirmIntent",
        message: {
          contentType: "PlainText",
          content: `Just to confirm, you are at ${address}. Did I get that right?`
        },
        intentName: intentName,
        responseCard: {
          contentType: "application/vnd.amazonaws.card.generic",
          genericAttachments: [
            {
              title: null,
              subTitle: null,
              imageUrl: mapsUrl,
              attachmentLinkUrl: mapsUrl,
              buttons: [
                {
                  text: "Yes",
                  value: "Yes"
                },
                {
                  text: "No",
                  value: "No"
                }
              ]
            }
          ]
        },
        slots
      }
    };
  }

  static delegate(slots, sessionAttributes) {
    return {
      sessionAttributes: sessionAttributes,
      dialogAction: {
        type: "Delegate",
        slots
      }
    };
  }
}

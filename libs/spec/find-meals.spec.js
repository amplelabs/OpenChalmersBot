const moment = require("moment");
const findMeals = require("../../services/find-meals/find-meals");
const DialogActions = require("./dialog-actions");
const mocha = require("mocha");
const chai = require("chai");
const should = chai.should();

let currentSlots = {
  mealNow: null,
  useGPS: null,
  Date: null,
  Time: null,
  Intersection: null,
  Eligibility: null,
  Latitude: null,
  Longitude: null,
  ShowMore: null,
  Confirmed: null,
  Age: null,
  Gender: null,
  AltResult: null,
  InitFeedback: null,
  MealCounter: null
};

function buildEvent(slots = currentSlots) {
  return {
    currentIntent: {
      slots: slots,
      name: "Meal",
      confirmationStatus: "None"
    },
    bot: {
      alias: "$LATEST",
      version: "$LATEST",
      name: "AmplelabsBot"
    },
    userId: "Daniel",
    invocationSource: "DialogCodeHook",
    outputDialogMode: "Text",
    messageVersion: "1.0",
    sessionAttributes: {}
  };
}

describe("Validate meal skill", () => {
  it("At the beginning, the chatbot should ask users to access their GPS location by eliciting useGPS slot", async () => {
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slotToElicit.should.be.equal("useGPS");
    });
  });

  it("Slot value for mealNow should be initially set to 'now'", async () => {
    currentSlots.useGPS = "No";
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slots.mealNow.should.be.equal("now");
    });
  });

  it("If users select 'No' to accessing their location, the chatbot should ask for their location input by eliciting Intersection slot", async () => {
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slotToElicit.should.be.equal("Intersection");
    });
  });

  it("If users select 'Yes' to accessing their location and successfully grab users' GPS location", async () => {
    currentSlots.useGPS = "Yes";
    let event = buildEvent();
    event.sessionAttributes = {
      userPosition: JSON.stringify({ latitude: 43.64553, longitude: -79.38035 })
    };
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.type.should.be.equal("ConfirmIntent");
    });
  });

  it("If users select 'Yes' to accessing their location but fail to grab their GPS location, ask users to enter their location again", async () => {
    currentSlots.Confirmed = null;
    let event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slotToElicit.should.be.equal("Intersection");
    });
  });

  it("When users enter non-existing intersection, ask users to enter their location again", async () => {
    currentSlots.Intersection = "skejisdjfkjels";
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slotToElicit.should.be.equal("Intersection");
    });
  });

  it("When users enter existing intersection, ask users to confirm the address", async () => {
    currentSlots.Intersection = "King Station";
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.type.should.be.equal("ConfirmIntent");
    });
  });

  it("When user press 'No' to confirm their location, ask users to enter their location again", async () => {
    let event = buildEvent();
    event.currentIntent.confirmationStatus = "Denied";
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.slotToElicit.should.be.equal("Intersection");
    });
  });

  it("When user press 'Yes' to confirm their location, all the inputs are good to fulfill", async () => {
    currentSlots.Confirmed = "true";
    const event = buildEvent();
    await findMeals.validations(event, {}, (nullVal, result) => {
      result.dialogAction.type.should.be.equal("Delegate");
    });
  });
});

describe("Fulfill meal skill", () => {
  it("When inputs are validated, the chatbot gives meal options by eliciting 'ShowMore' slot", async () => {
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("ShowMore");
  });

  it("When users choose Another option, the chatbot should show next option by incrementing MealCounter slot value", async () => {
    currentSlots.ShowMore = "Option";
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slots.MealCounter.should.be.equal(1);
  });

  it("When there's no meals available but snacks, the chatbot should promt snack options", async () => {
    currentSlots.ShowMore = null;
    currentSlots.Time = "19:38";
    currentSlots.Date = "2019-04-21";
    currentSlots.MealCounter = 0;
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
  });

  it("When users choose gender specific options, the chatbot should ask for their age by eliciting 'Age' slot", async () => {
    currentSlots.ShowMore = "Options";
    currentSlots.Time = "13:00";
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("Age");
  });

  it("After asking age, the chatbot should ask for their gender by eliciting 'Gender' slot", async () => {
    currentSlots.ShowMore = null;
    currentSlots.Age = 24;
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("Gender");
  });

  it("When users choose gender options, display meal options with specific age and gender eligibility", async () => {
    let gender = "female";
    currentSlots.Gender = gender;
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("ShowMore");
    response.dialogAction.slots.Gender.should.be.equal(gender);
  });

  // it("When users choose gender options and there's no meals available with specific eligibility, show general options", async () => {
  //   currentSlots.Time = "01:30";
  //   const event = buildEvent();
  //   const response = await findMeals.fulfillment(
  //     event,
  //     {},
  //     (nullVal, result) => {}
  //   );
  //   console.log(`gender options ${JSON.stringify(response)}`);
  //   response.dialogAction.slotToElicit.should.be.equal("ShowMore");
  //   response.dialogAction.slots.Gender.should.be.equal("mix");
  // });

  it("When users choose Another time, the chatbot should ask for another time", async () => {
    currentSlots.ShowMore = "Time";
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("Date");
  });

  it("When there's no more meals available for the day, end the meal flow", async () => {
    currentSlots.ShowMore = "Option";
    currentSlots.Time = "00:00";
    currentSlots.MealCounter = 1000;
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("InitFeedback");
  });

  it("When users choose This is fine, the chatbot should ask for feedback", async () => {
    currentSlots.ShowMore = "fine";
    currentSlots.MealCounter = 0;
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {}
    );
    response.dialogAction.slotToElicit.should.be.equal("Feedback");
  });

  it("When users don't need anyhelp by replying 'no', meal skill flow is over", async () => {
    currentSlots.InitFeedback = "no";
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullVal, result) => {
        result.dialogAction.fulfillmentState.should.be.equal("Fulfilled");
      }
    );
  });

  it("Testing the issue", async () => {
    currentSlots.Gender = null;
    currentSlots.AltResult = null;
    currentSlots.Date = "2019-05-08";
    currentSlots.Time = "08:02";
    currentSlots.Eligibility = null;
    currentSlots.Age = null;
    currentSlots.InitFeedback = null;
    currentSlots.MealCounter = 0;
    currentSlots.ShowMore = null;
    currentSlots.mealNow = "now";
    const event = buildEvent();
    const response = await findMeals.fulfillment(
      event,
      {},
      (nullval, result) => {}
    );
  });
});

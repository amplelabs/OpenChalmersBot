export default {
  text: {
    feedback:
      "Do you have any feedback for me, or suggestions of things I should learn?",
    more: [
      "More",
      "more",
      "yes",
      "yeah",
      "okay",
      "sure",
      "ok",
      "ya",
      "please",
      "Option",
      "option"
    ],
    now: ["now", "yes", "yeah", "ya"],
    yes: ["yes", "yeah", "sure", "okay"],
    no: ["no", "nah"],
    useLocation: "May I use your current location?",
    sorryWhatTime:
      "Sorry, I couldn't understand. What time did you want to check for?",
    howOldAreYou:
      "If you would like to know the services that are available just for your age-range please enter your age below. Enter 0 below if you want to view services that do not have age restrictions.",
    whatGenderDoYou: "Thanks! What gender would you want to filter with?",
    additionalPref: "Do you have any additional preferences?",
    thoseWereAll: `Those were all of the ${process.env.SERVICE_NAME}s which I could find for today. ## Please contact <a href="tel:211">2-1-1</a> by phone, if you still require assistance in finding a ${process.env.SERVICE_NAME}, or chat at <a href="https://211ontario.ca/chat/">https://211ontario.ca/chat/</a>. ## Is there anything else that I can assist you with today?`,
    sorryNoSpec: `I'm sorry, there are no ${process.env.SERVICE_NAME}s right now based on what you told me. If you are open to going somewhere that is available for everyone, I do have something for you. ## `,
    differentTime:
      "Sure, I can help you look for something that's at a different time. What time are you looking for? E.g. Tomorrow at 1pm.",
    assitanceFeedback:
      "That's great! I'm so pleased that I could be of assistance to you today. ## Do you have any feedback for me, or suggestions of things that I should learn?"
  },
  button: {
    genderOptions: {
      textArray: ["Male", "Female", "No Preference"],
      valueArray: ["male", "female", "skip"]
    },
    lgbtqFriendly: {
      textArray: ["LGBTQ Friendly", "Skip"],
      valueArray: ["friendly", "skip"]
    },
    serviceOptions: {
      textArray: ["🚨 Crisis", "🍔 Food", "🎨 Things To Do", "👔 Clothing", "🛏 Shelter"],
      valueArray: ["Crisis", "Food", "Things To Do", "Clothing", "Overnight Shelter"]
    },
    yesNo: {
      textArray: ["Yes", "No"],
      valueArray: ["Yes", "No"]
    }
  }
};

import mongoose from "mongoose";
import uuidv4 from "uuid/v4.js";

const Schema = mongoose.Schema;

const serviceSchema = new Schema(
  {
    // Schema Version to track production changes
    recordId: {
      type: String,
      default: uuidv4,
      unique: true
    },
    schemaVersion: {
      type: Number,
      required: "Please include the Schema Version",
      default: 5
    },
    address: {
      type: String
    },
    organizationName: {
      type: String,
      required: "Please include an Organization Name"
    },
    program: {
      type: String
    },
    language: {
      type: []
    },
    website: {
      type: String
    },
    imageUrl: {
      type: String
    },
    operatingHours: {
        type: [
          {
            startTime: {
              type: String,
              required:
                "Please include an start time in the following format HH:MM"
            },
            endTime: {
              type: String,
              required: "Please include an end time in the following format HH:MM"
            },
            dayOfWeek: {
              type: String,
              enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              required:
                "Please include what day of the week this availability is for"
            }
          }
        ],
        required: false
    },
    type: {
      type: String
    },
    notes: {
      type: String
    },
    lgbtq: {
      type: Boolean,
      default: false
    },
    latitude: {
      type: String
    },
    longitude: {
      type: String
    },
    gender: {
      type: String,
      enum: ["male", "female", "mix"]
    },
    age: {
      type: [
        {
          type: Number
        }
      ]
    },
    race: {
      type: String,
      default: null
    },
    phonenumber: {
      type: String
    },
    serviceType: {
      type: String,
      enum: ["meal", "shelter", "clothing", "dropin", "crisis", "rights", "foodBanks", "freeArts"],
      required: "please include an accepted service type"
    },
    dataSourceMeta: {
      sourceName: {
        type: String,
        enum: ["Ample-GoogleSheets", "211-QueryApi"],
        required:
          "Please provide a source name. Accepted values include 'Ample-GoogleSheets', and '211-QueryApi'"
      },
      sourceResourceId: {
        type: String
      },
      sourceLegacyId: {
        type: String
      },
      sourceUpdatedAt: {
        type: Date
      },
      sourceTaxonomyCodes: {
        type: String
      },
      sourceTaxonomyTerm: {
        type: String
      },
      sourceTaxonomyTerms: {
        type: String
      }
    },
    serviceArea: {
      type: []
    },
    status: {
      type: String,
      enum: ["Enabled", "Disabled", "CBX Error"],
      default: "Enabled"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Services", serviceSchema);

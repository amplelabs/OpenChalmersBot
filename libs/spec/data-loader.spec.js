const DataLoader = require("../data-loader");
const mocha = require("mocha");
const chai = require("chai");
const should = chai.should();

describe("Loading data from Google Spread Sheet API", () => {
  it("Check if properties in data have proper type", async () => {
    let data = await DataLoader.meals();
    let genderOptions = ["mix", "female", "male"];
    let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (var i = 0, numMeals = data.length; i < numMeals; i++) {
      data[i].address.should.be.a("string");
      data[i].organizationName.should.be.a("string");
      data[i].latitude.should.be.a("Number");
      data[i].longitude.should.be.a("Number");
      data[i].lgbtq.should.be.a("boolean");
      data[i].age[0].should.be.a("Number");
      data[i].age[1].should.be.a("Number");
      data[i].startTime.should.have.lengthOf(5);
      data[i].endTime.should.have.lengthOf(5);
      (
        data[i].gender.includes("mix") ||
        data[i].gender.includes("female") ||
        data[i].gender.includes("male")
      ).should.be.true;
      data[i].dayOfWeek.should.be.an("array");
      for (
        var j = 0, numWeekdays = data[i].dayOfWeek.length;
        j < numWeekdays;
        j++
      ) {
        weekdays.includes(data[i].dayOfWeek[j]).should.be.true;
      }
    }
  });
});

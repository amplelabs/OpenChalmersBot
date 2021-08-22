const Location = require("./location");
const mocha = require("mocha");
const chai = require("chai");
const should = chai.should();

describe("Location", () => {
  it("returns a new location from an address with latitude and longitude", async () => {
    const address = "207 Queens Quay W #600, Toronto, ON M5J 1A7";
    const location = await Location.fromAddress(address);
    location.address.should.be.equal(
      "207 Queens Quay W #600, Toronto, ON M5J 1A7, Canada"
    );
    location.latitude.should.be.a("number");
    location.longitude.should.be.a("number");
  });

  it("returns a new location with gps coordinates", async () => {
    const coords = { longitude: -74.0059728, latitude: 40.7127753 };
    const location = await Location.fromCoords(coords);

    const newCorrds = await Location.fromAddress(location.address);
    chai.assert.closeTo(coords.latitude, newCorrds.latitude, 0.1);
    chai.assert.closeTo(coords.longitude, newCorrds.longitude, 0.1);
  });

  it("is converts latitude and longitude to floats", () => {
    const location = new Location({ latitude: "40", longitude: "50" });

    location.coords().latitude.should.be.equal(40);
    location.coords().longitude.should.be.equal(50);
  });

  describe("when checking if an address is in Toronto", () => {
    it("when city is Toronto", async () => {
      const location = new Location({ city: "Toronto" });

      location.isInsideToronto().should.be.true;
      location.isOutsideToronto().should.be.false;
    });

    it("when city is not Toronto", async () => {
      const location = new Location({ city: "Not Toronto" });

      location.isInsideToronto().should.be.false;
      location.isOutsideToronto().should.be.true;
    });
  });

  describe("unknown locations", () => {
    it("is false when the location is real", () => {
      const location = new Location({ latitude: 40, longitude: -74 });

      location.isUnknown().should.be.false;
    });

    it("is false when the coordinates are strings, but still valid", () => {
      const location = new Location({ latitude: "40", longitude: "50" });

      location.isUnknown().should.be.false;
    });

    it("is true when the coordinates are out of range", () => {
      let location;

      location = new Location({ latitude: 91, longitude: 45 });
      location.isUnknown().should.be.true;

      location = new Location({ latitude: -91, longitude: 45 });
      location.isUnknown().should.be.true;

      location = new Location({ latitude: 45, longitude: 181 });
      location.isUnknown().should.be.true;

      location = new Location({ latitude: 45, longitude: -181 });
      location.isUnknown().should.be.true;
    });

    it("is true when the coordinates are not defined", () => {
      const location = new Location({ latitude: null, longitude: null });

      location.isUnknown().should.be.true;
    });

    it("is true when the coordinates are some other type", () => {
      const location = new Location({ latitude: {}, longitude: {} });

      location.isUnknown().should.be.true;
    });

    it("is true when the location is completely made up", async () => {
      const address = "Invalid Location";
      const location = await Location.fromAddress(address);

      location.isUnknown().should.be.true;
    });
  });
});

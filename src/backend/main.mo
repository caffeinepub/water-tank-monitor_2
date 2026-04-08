import Order "mo:core/Order";
import Array "mo:core/Array";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Config = {
    deviceName : Text;
    location : Text;
    alertThreshold : Float; // 0-100
    apiEndpoint : Text;
    alertsEnabled : Bool;
  };

  type Reading = {
    timestamp : Int;
    level : Float; // 0-100
    status : Text;
  };

  func compareReadings(r1 : Reading, r2 : Reading) : Order.Order {
    Int.compare(r1.timestamp, r2.timestamp);
  };

  var config : Config = {
    deviceName = "Water Tank";
    location = "Unknown";
    alertThreshold = 85.0;
    apiEndpoint = "http://192.168.1.100/level";
    alertsEnabled = true;
  };

  let maxReadings = 24;
  let readings = List.empty<Reading>();

  // Config functions
  public shared func updateConfig(newConfig : Config) : async () {
    config := newConfig;
  };

  public query func getConfig() : async Config {
    config;
  };

  // Add a reading to history, keeping last 24 entries
  public shared func addReading(level : Float, status : Text) : async () {
    if (level < 0.0 or level > 100.0) {
      Runtime.trap("Invalid level. Must be 0-100");
    };
    let reading : Reading = {
      timestamp = Time.now();
      level;
      status;
    };
    readings.add(reading);
    // Trim to max readings by removing oldest (first) entries
    while (readings.size() > maxReadings) {
      ignore readings.removeLast();
    };
  };

  // Get all stored readings sorted by timestamp ascending
  public query func getReadings() : async [Reading] {
    let arr = readings.toArray();
    arr.sort(compareReadings);
  };

  // Note: HTTP outcalls from the canister are not available in this configuration.
  // The frontend fetches directly from the ESP32 endpoint and calls addReading() to store results.
  // This stub is retained for API compatibility; actual fetching is done client-side.
  public shared func fetchWaterLevel(endpoint : Text) : async Float {
    ignore endpoint;
    0.0;
  };
};

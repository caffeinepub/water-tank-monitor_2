import List "mo:core/List";

module {
  // Old types (from previous version)
  type OldConfig = {
    name : Text;
    location : Text;
    alertThreshold : Float;
    endpointURL : Text;
  };

  type OldReading = {
    timestamp : Int;
    level : Float;
  };

  // New types (matching main.mo)
  type NewConfig = {
    deviceName : Text;
    location : Text;
    alertThreshold : Float;
    apiEndpoint : Text;
    alertsEnabled : Bool;
  };

  type NewReading = {
    timestamp : Int;
    level : Float;
    status : Text;
  };

  type OldActor = {
    var config : OldConfig;
    readings : List.List<OldReading>;
  };

  type NewActor = {
    var config : NewConfig;
    readings : List.List<NewReading>;
  };

  public func run(old : OldActor) : NewActor {
    let newConfig : NewConfig = {
      deviceName = old.config.name;
      location = old.config.location;
      alertThreshold = old.config.alertThreshold;
      apiEndpoint = old.config.endpointURL;
      alertsEnabled = true;
    };

    let threshold = old.config.alertThreshold;
    let newReadings = old.readings.map<OldReading, NewReading>(
      func(r) {
        let status = if (r.level >= threshold) { "danger" } else if (r.level >= threshold - 10.0) { "warning" } else { "normal" };
        { timestamp = r.timestamp; level = r.level; status };
      }
    );

    {
      var config = newConfig;
      readings = newReadings;
    };
  };
};

S.log("[SLATE] Loading");

// Configs
S.cfga({
  "defaultToCurrentScreen": true,
  "secondsBetweenRepeat": 0.1,
  "checkDefaultsOnLoad": true,
  "focusCheckWidthMax": 3000,
  "orderScreensLeftToRight": true
});

// Monitors
var mons = {
  "laptop": "1280x800",
  "tbolt": "1920x1200"
};

var isMon = function(mon) {
  return function(screen) {
    var curMon = screen.rect().width + "x" + screen.rect().height;
    return mons[mon] == curMon;
  };
};
var isMonTbolt = isMon("tbolt");
var isMonLaptop = isMon("laptop");


// Utilities
var extend = function() {
  var args = _.toArray(arguments);
  args.unshift({});

  return _.extend.apply(_, args);
};

var moveWithScreen = function(config, mon) {
  return function(forceScreen, window) {
    var currentConfig = config;
    if(mon && forceScreen) {
      currentConfig = extend(currentConfig, {
        "screen": mons[mon]
      });
    }
    window.doop(S.op("move", currentConfig));
  };
}

var switchScreens = function(configs) {
  return function(forceScreen, window) {
    _.each(configs, function(config, mon) {
      if(isMon(mon)(window.screen()))
        config(forceScreen, window);
    });
  };
};

var switchApps = function(configs) {
  return function(forceScreen) {
    var screensWindows = {};

    S.eapp(function(app) {
      app.ewindow(function(window) {
        var screenId = window.screen().id();
        if(!screensWindows[screenId]) {
          screensWindows[screenId] = [];
        }

        screensWindows[screenId].push(window);
      });
    });

    _.each(screensWindows, function(windows, screenId) {
      _.each(windows, function(window) {
        var app = window.app();
        var config = configs[app.name() + "." + window.title()] || configs[app.name()];

        if(!config)
          return;

        config(forceScreen, window);
      });
    });
  };
};


// Operation Configs
var lapStretchConfig = {
  "x": "screenOriginX+64",
  "y": "screenOriginY",
  "width": "screenSizeX-64*2",
  "height": "screenSizeY"
};

var tboltStretchConfig = {
  "x": "screenOriginX+260",
  "y": "screenOriginY",
  "width": "screenSizeX-260*2",
  "height": "screenSizeY"
};

var iTunesMiniPlayerConfig = {
  "x": "screenOriginX+12",
  "y": "screenOriginY+screenSizeY/2-windowSizeY/2",
  "width": "windowSizeX",
  "height": "windowSizeY"
};

var allFullConfig = {
  "x": "screenOriginX",
  "y": "screenOriginY",
  "width": "screenSizeX",
  "height": "screenSizeY"
};

var getCenteredConfig = function(width, height) {
  width = width || "windowSizeX";
  height = height || "windowSizeY";

  return {
    "x": "screenOriginX+screenSizeX/2-"+width+"/2",
    "y": "screenOriginY+screenSizeY/2-"+height+"/2",
    "width": width,
    "height": height
  };  
};

var allCenteredConfig = getCenteredConfig(
  "min({windowSizeX,screenSizeX/10*8})",
  "min({windowSizeY,screenSizeY/12*10})"
);

// Base apps config
var baseAppsCongig = {
  "iTunes.MiniPlayer": moveWithScreen(iTunesMiniPlayerConfig, "tbolt"),
  "iTunes": moveWithScreen(allCenteredConfig, "tbolt"),

  "Skype": moveWithScreen(allCenteredConfig, "tbolt"),
  "Mail": moveWithScreen(allCenteredConfig, "tbolt"),
  "Messages": moveWithScreen(allCenteredConfig, "tbolt"),
  "Telegram": moveWithScreen(allCenteredConfig, "tbolt"),

  "Xcode": moveWithScreen(allFullConfig, "tbolt"),
  "IntelliJ IDEA": moveWithScreen(allFullConfig, "tbolt"),
  "RubyMine": moveWithScreen(allFullConfig, "tbolt"),
  "PyCharm": moveWithScreen(allFullConfig, "tbolt"),
  "Parallels Desktop": moveWithScreen(allFullConfig, "tbolt"),
  "SourceTree": moveWithScreen(allFullConfig, "tbolt")
};

// Laptop apps switch
var laptopAppsSwitch = switchApps(extend(baseAppsCongig, {
  "Safari": moveWithScreen(lapStretchConfig)
}));

// Tbolt apps switch
var tboltAppsSwitch = switchApps(extend(baseAppsCongig, {
  "Safari": moveWithScreen(tboltStretchConfig)
}));

// Laptop and tbolt apps switch
var laptopTboltAppsSwitch = switchApps(extend(baseAppsCongig, {
  "Safari": switchScreens({
    "laptop": moveWithScreen(allFullConfig, "tbolt"),
    "tbolt": moveWithScreen(tboltStretchConfig, "tbolt")
  })
}));

// Layout selector
var layoutSelector = function(forceScreen) {
  return function() {
    var laptopScreenPresent = false;
    var tboltScreenPresent = false;

    S.escreen(function(screen) {
      laptopScreenPresent = laptopScreenPresent || isMonLaptop(screen);
      tboltScreenPresent = tboltScreenPresent || isMonTbolt(screen);
    });

    S.log("[SLATE] Laptop: " + laptopScreenPresent + "; Tbolt: " + tboltScreenPresent);

    if(laptopScreenPresent && tboltScreenPresent) {
      laptopTboltAppsSwitch(forceScreen);
    } else if (tboltScreenPresent) {
      tboltAppsSwitch(forceScreen);
    } else {
      laptopAppsSwitch(forceScreen);
    }
  };
};


// Operations
var getPart = function(xOffset, yOffset, widthPart, heightPart) {
  xOffset = xOffset || 0;
  yOffset = yOffset || 0;
  widthPart = widthPart || "screenSizeX";
  heightPart = heightPart || "screenSizeY";

  return S.op("move", {
    "x": "screenOriginX+screenSizeX*"+xOffset,
    "y": "screenOriginY+screenSizeY*"+yOffset,
    "width": "screenSizeX*"+widthPart,
    "height": "screenSizeY*"+heightPart
  });
};

// Screen change listner
S.on("screenConfigurationChanged", layoutSelector(true));

// Binds
S.bnda({
  "space:space;cmd;alt": layoutSelector(false),
  "return:space;cmd;alt": layoutSelector(true),

  "c:space;cmd;alt": S.op("move", getCenteredConfig()),
  "x:space;cmd;alt": S.op("move", getCenteredConfig(null, "screenSizeY")),

  "f:space;cmd;alt": allFullConfig,

  "j:space;cmd;alt": getPart(0, 0, 0.5, 1),
  "l:space;cmd;alt": getPart(0.5, 0, 0.5, 1),
  "i:space;cmd;alt": getPart(0, 0, 1, 0.5),
  "k:space;cmd;alt": getPart(0, 0.5, 1, 0.5),

  "y:space;cmd;alt": getPart(0, 0, 0.62, 1),
  "p:space;cmd;alt": getPart(0.62, 0, 0.38, 1)

});

S.log("[SLATE] Loaded");
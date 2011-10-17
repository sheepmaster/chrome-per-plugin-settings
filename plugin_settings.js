function mockGetContentSettingRules(id) {
  if (id == "adobe-flash-player") {
    return [{
        'primaryPattern': '*.example.com/*',
        'secondaryPattern': '*',
        'setting': 'allow',
    }];
  } else {
    return [];
  }
}


function setContentSetting(id, primaryPattern, secondaryPattern, setting) {
  chrome.contentSettings.plugins.set({
      'primaryPattern': primaryPattern,
      'secondaryPattern': secondaryPattern,
      'resourceIdentifier': { 'id': id },
      'setting': setting,
  }, function() {
    if (chrome.extension.lastError) {
      console.error(chrome.extension.lastError.message);
    } else {
      window.localStorage.setItem(JSON.stringify([id, primaryPattern,
                                  secondaryPattern]), setting);
    }
  });
}

// function clearContentSetting(id, primaryPattern, secondaryPattern) {
//   window.localStorage.removeItem(JSON.stringify([id, primaryPattern, secondaryPattern]));
//   chrome.contentSettings.plugins.set({
//     'primaryPattern': primaryPattern,
//     'secondaryPattern': secondaryPattern,
//     'resourceIdentifier': { 'id': id },
//     'setting': setting,
//   }, checkError);
// }

function getContentSetting(id, primaryPattern, secondaryPattern) {
  return window.localStorage.getItem(JSON.stringify([id, primaryPattern,
                                                     secondaryPattern]));
}

function getContentSettingRules(id) {
  var length = window.localStorage.length;
  var rules = [];
  for (var i = 0; i < length; i++) {
    var key = window.localStorage.key(i);
    var keyArray = JSON.parse(key);
    if (key[0] == id) {
      rules.push({
        'primaryPattern': key[1],
        'secondaryPattern': key[2],
        'setting': window.localStorage.getItem(key),
      });
    }
  }
  return rules;
}

function updateSetting(el) {
  
}

function processPlugins(r) {
  if (r) {
    console.log(JSON.stringify(r));
    r.forEach(function(plugin) {
      plugin.rules = mockGetContentSettingRules(plugin.id);
      // getContentSettingRules(plugin.id, function(rules) {
      //   processContentSettingRules(plugin.id, rules);
      // });
    });
    var input = new JsEvalContext({
      'plugins': r,
    });
    var output = document.getElementsByTagName('body')[0];
    jstProcess(input, output);
  } else {
    console.log("Please update to a more recent version of Chrome.");
  }
}

function init() {
  chrome.contentSettings.plugins.getResourceIdentifiers(processPlugins);
}
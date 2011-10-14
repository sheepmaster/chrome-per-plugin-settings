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

function getContentSettingRules(id, callback) {
  window.setTimeout(callback, 0, mockGetContentSettingRules(id));
}

function processContentSettingRules(id, rules) {
  console.log(id + ":" + JSON.stringify(rules));
  var input = new JsEvalContext({
    'rules': rules
  });
  var output = document.getElementById('plugin-'+id);
  jstProcess(input, output);
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
  chrome.contentSettings.plugins.getResourceIdentifiers(
      processPlugins);
}
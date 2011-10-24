// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function processPlugins(r) {
  if (chrome.extension.lastError) {
    $('error').textContent =
        "Error: " + chrome.extension.lastError.message;
  } else {
    $('error').textContent = '';
    var pluginList = $('plugin-list');
    pluginSettings.ui.PluginList.decorate(pluginList);
    pluginList.dataModel = new cr.ui.ArrayDataModel(r);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // cr.enablePlatformSpecificCSSRules();
  chrome.contentSettings.plugins.getResourceIdentifiers(processPlugins);
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('pluginSettings', function() {
  const EventTarget = cr.EventTarget;
  const Event = cr.Event;

  function Settings(plugin) {
    this.plugin_ = plugin;
  }

  Settings.prototype = {
    __proto__: cr.EventTarget.prototype,

    transactionFinished_: function(error) {
      if (error)
        $('error').textContent = 'Error: ' + error;
      else
        $('error').textContent = '';
      cr.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Clears all content settings, and recreates them from local storage.
     */
    recreateRules_: function(callback) {
      chrome.contentSettings.plugins.clear({}, function() {
        if (chrome.extension.lastError) {
          console.error("Error clearing rules");
          callback();
          return;
        }
        var count = window.localStorage.length;
        if (count == 0) {
          callback();
          return;
        }
        var errors = [];
        for (var i = 0; i < length; i++) {
          var key = window.localStorage.key(i);
          var keyArray = JSON.parse(key);
          var plugin = keyArray[0];
          var pattern = keyArray[1];
          var setting = window.localStorage.getItem(key);
          chrome.contentSettings.plugins.set({
              'primaryPattern': pattern,
              'resourceIdentifier': { 'id': plugin },
              'setting': setting,
          }, function() {
            if (chrome.extension.lastError) {
              console.error('Error restoring [' + plugin_ + ', ' +
                            pattern + setting + ']: ' +
                            chrome.extension.lastError.message);
              window.localStorage.removeItem(key);
            }
            count--;
            if (count == 0)
              callback();
          });
        }
      });
    },

    setInternal_: function(primaryPattern, setting, callback) {
      var plugin = this.plugin_;
      chrome.contentSettings.plugins.set({
          'primaryPattern': primaryPattern,
          'resourceIdentifier': { 'id': plugin },
          'setting': setting,
      }, function() {
        if (chrome.extension.lastError) {
          callback(chrome.extension.lastError.message);
        } else {
          window.localStorage.setItem(JSON.stringify([plugin, primaryPattern]),
                                      setting);
          callback();
        }
      });
    },

    set: function(pattern, setting) {
      var settings = this;
      this.setInternal_(pattern, setting, this.transactionFinished_.bind(this));
    },

    clearInternal_: function(primaryPattern, callback) {
      window.localStorage.removeItem(
          JSON.stringify([this.plugin_, primaryPattern]));
      this.recreateRules_(callback);
      // chrome.contentSettings.plugins.set({
      //   'primaryPattern': primaryPattern,
      //   'secondaryPattern': secondaryPattern,
      //   'resourceIdentifier': { 'id': id },
      //   'setting': null,
      // }, checkError);
    },

    clear: function(pattern) {
      var settings = this;
      this.clearInternal_(pattern, this.transactionFinished_.bind(this));
    },

    update: function(oldPattern, newPattern, setting) {
      if (oldPattern == newPattern) {
        // Avoid recreating all rules if only the setting changed.
        this.set(newPattern, setting);
        return;
      }
      var oldSetting = this.get(oldPattern);
      var settings = this;
      // Remove the old rule.
      this.clearInternal_(oldPattern, function() {
        // Try to set the new rule.
        settings.setInternal_(newPattern, setting, function(error) {
          if (error) {
            // If setting the new rule failed, restore the old rule.
            settings.setInternal_(oldPattern, oldSetting,
                                  function(restoreError) {
              if (restoreError) {
                console.error('Error restoring [' + settings.plugin_ + ', ' +
                              oldPattern + oldSetting + ']: ' + restoreError);
              }
              settings.transactionFinished_(error);
            });
          } else {
            settings.transactionFinished_();
          }
        });
      });
    },

    get: function(primaryPattern) {
      return window.localStorage.getItem(
          JSON.stringify([this.plugin_, primaryPattern]));
    },

    getAll: function() {
      var length = window.localStorage.length;
      var rules = [];
      for (var i = 0; i < length; i++) {
        var key = window.localStorage.key(i);
        var keyArray = JSON.parse(key);
        if (keyArray[0] == this.plugin_) {
          rules.push({
            'primaryPattern': keyArray[1],
            'setting': window.localStorage.getItem(key),
          });
        }
      }
      return rules;
    }
  };

  return {
    Settings: Settings,
  }
});


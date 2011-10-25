// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('pluginSettings', function() {
  const EventTarget = cr.EventTarget;
  const Event = cr.Event;

  /**
   * Creates a new content settings model.
   * @param {string} plugin Identifies the plug-in for which this object stores
   *     settings.
   * @constructor
   * @extends {cr.EventTarget}
   */
  function Settings(plugin) {
    this.plugin_ = plugin;
  }

  Settings.prototype = {
    __proto__: cr.EventTarget.prototype,

    /**
     * Identifies the plug-in for which this object stores settings.
     * @type {string}
     * @private
     */
    plugin_: null,

    /**
     * Called when a transaction is finished.
     * @param {?string} error The error message, if an error occurred.
     *     Otherwise, this is null.
     * @private
     */
    transactionFinished_: function(error) {
      if (error)
        $('error').textContent = 'Error: ' + error;
      else
        $('error').textContent = '';
      cr.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Clears all content settings, and recreates them from local storage.
     * @param {function()} callback Called when the content settings have been
     *     recreated.
     * @private
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

    /**
     * Creates a content setting rule and calls the passed in callback with the
     *     result.
     * @param {string} pattern The content setting pattern for the rule.
     * @param {string} setting The setting for the rule.
     * @param {function(?string)} callback Called when the content settings have
     *     been updated.
     * @private
     */
    setInternal_: function(pattern, setting, callback) {
      var plugin = this.plugin_;
      chrome.contentSettings.plugins.set({
          'primaryPattern': pattern,
          'resourceIdentifier': { 'id': plugin },
          'setting': setting,
      }, function() {
        if (chrome.extension.lastError) {
          callback(chrome.extension.lastError.message);
        } else {
          window.localStorage.setItem(JSON.stringify([plugin, pattern]),
                                      setting);
          callback(null);
        }
      });
    },

    /**
     * Creates a content setting rule.
     * @param {string} pattern The content setting pattern for the rule.
     * @param {string} setting The setting for the rule.
     */
    set: function(pattern, setting) {
      var settings = this;
      this.setInternal_(pattern, setting, this.transactionFinished_.bind(this));
    },

    /**
     * Removes the content setting rule with a given pattern, and calls the
     *     passed in callback afterwards.
     * @param {string} pattern The content setting pattern for the rule.
     * @param {function(?string)} callback Called when the content settings have
     *     been updated.
     * @private
     */
    clearInternal_: function(pattern, callback) {
      window.localStorage.removeItem(
          JSON.stringify([this.plugin_, pattern]));
      this.recreateRules_(callback);
    },

    /**
     * Removes the content setting rule with a given pattern.
     * @param {string} pattern The content setting pattern for the rule.
     */
    clear: function(pattern) {
      var settings = this;
      this.clearInternal_(pattern, this.transactionFinished_.bind(this));
    },

    /**
     * Updates the content setting rule with a given pattern to a new pattern
     *     and setting.
     * @param {string} oldPattern The old content setting pattern for the rule.
     * @param {string} newPattern The new content setting pattern for the rule.
     * @param {string} setting The setting for the rule.
     */
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

    /**
     * Returns the content setting for a given pattern.
     * @param {string} pattern The content setting pattern for the rule.
     * @return {string} The setting for the rule.
     */
    get: function(primaryPattern) {
      return window.localStorage.getItem(
          JSON.stringify([this.plugin_, primaryPattern]));
    },

    /**
     * @return {array} A list of all content setting rules for this plug-in.
     */
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


var templateData = {
  'allowRule': 'Allow',
  'blockRule': 'Block'
}

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


function setContentSetting(id, primaryPattern, setting) {
  // chrome.contentSettings.plugins.set({
  //     'primaryPattern': primaryPattern,
  //     'secondaryPattern': secondaryPattern,
  //     'resourceIdentifier': { 'id': id },
  //     'setting': setting,
  // }, function() {
  //   if (chrome.extension.lastError) {
  //     console.error(chrome.extension.lastError.message);
  //   } else {
    window.localStorage.setItem(JSON.stringify([id, primaryPattern]), setting);
  //   }
  // });
}

function clearContentSetting(id, primaryPattern) {
  window.localStorage.removeItem(JSON.stringify([id, primaryPattern]));
  // chrome.contentSettings.plugins.set({
  //   'primaryPattern': primaryPattern,
  //   'secondaryPattern': secondaryPattern,
  //   'resourceIdentifier': { 'id': id },
  //   'setting': null,
  // }, checkError);
}

function getContentSetting(id, primaryPattern) {
  return window.localStorage.getItem(JSON.stringify([id, primaryPattern]));
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

cr.define('pluginSettings', function() {
  const InlineEditableItemList = options.InlineEditableItemList;
  const InlineEditableItem = options.InlineEditableItem;
  const ArrayDataModel = cr.ui.ArrayDataModel;

  function RuleListItem(plugin, rule) {
    var el = cr.doc.createElement('div');
    
    el.dataItem = rule;
    el.plugin = plugin;
    el.__proto__ = RuleListItem.prototype;
    el.decorate();

    return el;
  }
  
  RuleListItem.prototype = {
    __proto__: InlineEditableItem.prototype,
    
    /**
     * Called when an element is decorated as a list item.
     */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      this.isPlaceholder = !this.pattern;
      var patternCell = this.createEditableTextCell(this.pattern);
      patternCell.className = 'exception-pattern';
      patternCell.classList.add('weakrtl');
      this.contentElement.appendChild(patternCell);
      if (this.pattern)
        this.patternLabel = patternCell.querySelector('.static-text');
      var input = patternCell.querySelector('input');

      // TODO(stuartmorgan): Create an createEditableSelectCell abstracting
      // this code.
      // Setting label for display mode. |pattern| will be null for the 'add new
      // exception' row.
      if (this.pattern) {
        var settingLabel = cr.doc.createElement('span');
        settingLabel.textContent = this.settingForDisplay();
        settingLabel.className = 'exception-setting';
        settingLabel.setAttribute('displaymode', 'static');
        this.contentElement.appendChild(settingLabel);
        this.settingLabel = settingLabel;
      }

      // Setting select element for edit mode.
      var select = cr.doc.createElement('select');
      var optionAllow = cr.doc.createElement('option');
      optionAllow.textContent = templateData.allowRule;
      optionAllow.value = 'allow';
      select.appendChild(optionAllow);

      var optionBlock = cr.doc.createElement('option');
      optionBlock.textContent = templateData.blockRule;
      optionBlock.value = 'block';
      select.appendChild(optionBlock);

      this.contentElement.appendChild(select);
      select.className = 'exception-setting';
      if (this.pattern)
        select.setAttribute('displaymode', 'edit');

      this.input = input;
      this.select = select;

      this.updateEditables();

      // Listen for edit events.
      this.addEventListener('canceledit', this.onEditCancelled_);
      this.addEventListener('commitedit', this.onEditCommitted_);
    },
    
    /**
     * The pattern (e.g., a URL) for the exception.
     * @type {string}
     */
    get pattern() {
      return this.dataItem['primaryPattern'];
    },
    set pattern(pattern) {
      this.dataItem['primaryPattern'] = pattern;
    },

    /**
     * The setting (allow/block) for the exception.
     * @type {string}
     */
    get setting() {
      return this.dataItem['setting'];
    },
    set setting(setting) {
      this.dataItem['setting'] = setting;
    },

    /**
     * Gets a human-readable setting string.
     * @type {string}
     */
    settingForDisplay: function() {
      var setting = this.setting;
      if (setting == 'allow')
        return templateData.allowRule;
      else if (setting == 'block')
        return templateData.blockRule;
    },

    /**
     * Set the <input> to its original contents. Used when the user quits
     * editing.
     */
    resetInput: function() {
      this.input.value = this.pattern;
    },

    /**
     * Copy the data model values to the editable nodes.
     */
    updateEditables: function() {
      this.resetInput();

      var settingOption =
          this.select.querySelector('[value=\'' + this.setting + '\']');
      if (settingOption)
        settingOption.selected = true;
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      var livePattern = this.input.value;
      var liveSetting = this.select.value;
      return livePattern != this.pattern || liveSetting != this.setting;
    },

    /**
     * Called when committing an edit.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var newPattern = this.input.value;
      var newSetting = this.select.value;

      this.finishEdit(newPattern, newSetting);
    },

    /**
     * Called when cancelling an edit; resets the control states.
     * @param {Event} e The cancel event.
     * @private
     */
    onEditCancelled_: function() {
      this.updateEditables();
    },

    /**
     * Editing is complete; update the model.
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.patternLabel.textContent = newPattern;
      this.settingLabel.textContent = this.settingForDisplay();
      var oldPattern = this.pattern;
      this.pattern = newPattern;
      this.setting = newSetting;

      if (oldPattern != newPattern) {
        clearContentSetting(this.plugin, oldPattern);
      }

      setContentSetting(this.plugin, newPattern, newSetting);
    }
  };
  
  function AddRuleListItem(plugin) {
    var el = cr.doc.createElement('div');
    el.dataItem = [];
    el.plugin = plugin;
    el.__proto__ = RuleListItem.prototype;
    el.decorate();

    return el;
  }

  AddRuleListItem.prototype = {
    __proto__: RuleListItem.prototype,

    decorate: function() {
      AddRuleListItem.prototype.decorate.call(this);
      
      this.setting = 'allow';
    },
  
    /**
     * Clear the <input> and let the placeholder text show again.
     */
    resetInput: function() {
      this.input.value = '';
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      return this.input.value != '';
    },

    /**
     * Editing is complete; update the model. As long as the pattern isn't
     * empty, we'll just add it.
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.resetInput();
      setContentSetting(this.plugin, newPattern, newSetting);
    },
  };
  
  /**
   * Creates a new exceptions list.
   * @constructor
   * @extends {cr.ui.List}
   */
  var RuleList = cr.ui.define('list');

  RuleList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * Called when an element is decorated as a list.
     */
    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      this.classList.add('settings-list');

      this.plugin = this.getAttribute('plugin');

      this.autoExpands = true;
      this.reset();
    },

    /**
     * Creates an item to go in the list.
     * @param {Object} entry The element from the data model for this row.
     */
    createItem: function(entry) {
      if (entry) {
        return new RuleListItem(this.plugin, entry);
      } else {
        var addRuleItem = new AddRuleListItem(this.plugin);
        addRuleItem.deletable = false;
        return addRuleItem;
      }
    },

    /**
     * Sets the exceptions in the js model.
     * @param {Object} entries A list of dictionaries of values, each dictionary
     *     represents an exception.
     */
    setRules: function(entries) {
      var deleteCount = this.dataModel.length - 1;

      var args = [0, deleteCount];
      args.push.apply(args, entries);
      this.dataModel.splice.apply(this.dataModel, args);
    },

    /**
     * Removes all exceptions from the js model.
     */
    reset: function() {
      // The null creates the Add New Exception row.
      this.dataModel = new ArrayDataModel([null]);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      var listItem = this.getListItemByIndex(index);
      if (listItem.undeletable)
        return;

      var dataItem = listItem.dataItem;

      clearContentSetting(listItem.plugin, dataItem['primaryPattern']);
    },
  };
  
  return {
    RuleListItem: RuleListItem,
    AddRuleListItem: AddRuleListItem,
    RuleList: RuleList,
  }
});

function processPlugins(r) {
  if (r) {
    console.log(JSON.stringify(r));
    
  } else {
    console.log("Please update to a more recent version of Chrome.");
  }
}

function init() {
  chrome.contentSettings.plugins.getResourceIdentifiers(processPlugins);

  var ruleLists = document.querySelectorAll('list');
  for (var i = 0; i < ruleLists.length; i++) {
    var list = ruleLists[i];
    var plugin = list.getAttribute('plugin');
    pluginSettings.RuleList.decorate(list);
    list.setRules(mockGetContentSettingRules(plugin));
  }

}
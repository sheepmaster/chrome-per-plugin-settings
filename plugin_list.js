// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('pluginSettings.ui', function() {
  const List = cr.ui.List;
  const ListItem = cr.ui.ListItem;
  const ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Returns the item's height, like offsetHeight but such that it works better
   * when the page is zoomed. See the similar calculation in @{code cr.ui.List}.
   * This version also accounts for the animation done in this file.
   * @param {Element} item The item to get the height of.
   * @return {number} The height of the item, calculated with zooming in mind.
   */
  function getItemHeight(item) {
    var height = item.style.height;
    // Use the fixed animation target height if set, in case the element is
    // currently being animated and we'd get an intermediate height below.
    if (height && height.substr(-2) == 'px')
      return parseInt(height.substr(0, height.length - 2));
    return item.getBoundingClientRect().height;
  }

  /**
   *
   */
  function PluginListItem(info, list) {
    var el = cr.doc.createElement('li');
    el.list = list;
    el.info_ = info;
    PluginListItem.decorate(el);
    return el;
  }

  PluginListItem.decorate = function(el) {
    el.__proto__ = PluginListItem.prototype;
    el.decorate();
  };

  PluginListItem.prototype = {
    __proto__: ListItem.prototype,

    contentElement_: null,
    detailsElement_: null,

    decorate: function() {
      ListItem.prototype.decorate.call(this);

      var info = this.info_;

      this.contentElement_ = this.ownerDocument.createElement('div');
      this.appendChild(this.contentElement_);

      var nameEl = this.ownerDocument.createElement('div');
      nameEl.className = 'plugin-name';
      nameEl.textContent = info.name;
      nameEl.title = info.name;

      var descriptionEl = this.ownerDocument.createElement('div');
      descriptionEl.className = 'plugin-description';
      descriptionEl.innerHTML = info.description;
      descriptionEl.title = info.description;

      this.detailsElement_ = this.ownerDocument.createElement('div');
      this.detailsElement_.className = 'plugin-details hidden';

      for (var i = 0; i < info.plugin_files.length; i++) {
        this.addPluginFileDetails_(info.plugin_files[i]);
      }

      this.contentElement_.appendChild(nameEl);
      this.contentElement_.appendChild(descriptionEl);
      this.contentElement_.appendChild(this.detailsElement_);
    },

    addPluginFileDetails_: function(details) {
      var doc = this.ownerDocument;
      var selectEl = doc.createElement('select');
      this.addSelectOption_(selectEl, templateData.allowException, 'allow');
      this.addSelectOption_(selectEl, templateData.askException, 'ask');
      this.addSelectOption_(selectEl, templateData.blockException, 'block');

      var table = doc.createElement('table');
      table.className = 'plugin-details-table';
      var tbody = doc.createElement('tbody');
      this.addTableRow_(tbody, templateData.pluginName, details.name);
      if (this.shouldDisplayVersion_(details.version))
        this.addTableRow_(tbody, templateData.pluginVersion, details.version);
      if (this.shouldDisplayDescription_(details.description))
        this.addTableRow_(tbody, templateData.pluginDescription, details.description);

      var mimeTypes = this.addTableRow_(tbody, templateData.pluginMimeTypes, '');
      mimeTypes.className = 'plugin-mime-types';
      var mimeTable = doc.createElement('table');
      var mimeTBody = doc.createElement('tbody');
      var mimeHeader = this.addMimeTypeTableRow_(mimeTBody,
          templateData.pluginMimeTypesMimeType,
          templateData.pluginMimeTypesDescription,
          templateData.pluginMimeTypesFileExtensions);
      mimeHeader.className = 'header';
      for (var i = 0; i < details.mimeTypes.length; i++) {
        this.addMimeTypeTableRow_(mimeTBody,
            details.mimeTypes[i].mimeType,
            details.mimeTypes[i].description,
            details.mimeTypes[i].fileExtensions);
      }

      mimeTable.appendChild(mimeTBody);
      mimeTypes.appendChild(mimeTable);
      table.appendChild(tbody);
      this.detailsElement_.appendChild(selectEl);
      this.detailsElement_.appendChild(table);
    },

    addSelectOption_: function(select, name, value) {
      var option = this.ownerDocument.createElement('option');
      option.value = value;
      option.textContent = name;
      select.appendChild(option);
    },

    addTableRow_: function(tbody, labelText, valueText) {
      var doc = this.ownerDocument;
      var tr = doc.createElement('tr');
      var labelEl = doc.createElement('td');
      labelEl.className = 'plugin-details-table-label';
      labelEl.textContent = labelText;
      var valueEl = doc.createElement('td');
      valueEl.className = 'plugin-details-table-value';
      valueEl.textContent = valueText;

      tr.appendChild(labelEl);
      tr.appendChild(valueEl);
      tbody.appendChild(tr);
      return valueEl;
    },

    addMimeTypeTableRow_: function(tbody, mimeType, description, fileExtensions) {
      var doc = this.ownerDocument;
      var tr = doc.createElement('tr');
      var mimeTypeEl = doc.createElement('td');
      mimeTypeEl.textContent = mimeType;
      var descriptionEl = doc.createElement('td');
      descriptionEl.textContent = description;
      var fileExtensionsEl = doc.createElement('td');
      fileExtensionsEl.textContent = '.';

      tr.appendChild(mimeTypeEl);
      tr.appendChild(descriptionEl);
      tr.appendChild(fileExtensionsEl);
      tbody.appendChild(tr);
      return tr;
    },

    shouldDisplayVersion_: function(version) {
      return !!version && version !== '0';
    },

    shouldDisplayDescription_: function(description) {
      return !!description;
    },

    expanded_: false,
    get expanded() {
      return this.expanded_;
    },
    set expanded(expanded) {
      if (this.expanded_ == expanded)
        return;
      this.expanded_ = expanded;
      if (expanded) {
        var oldExpanded = this.list.expandItem;
        this.list.expandItem = this;
        this.detailsElement_.classList.remove('hidden');
        this.updateItems_();
        if (oldExpanded)
          oldExpanded.expanded = false;
        this.classList.add('plugin-show-details');
      } else {
        if (this.list.expandItem == this) {
          this.list.expandItem = null;
        }
        this.style.height = '';
        this.detailsElement_.classList.add('hidden');
        this.classList.remove('plugin-show-details');
      }
    },

    updateItems_: function() {
      /*this.disableAnimation_();*/
      /*this.enableAnimation_();*/
    },

    /**
     * Disable animation within this cookie list item, in preparation for making
     * changes that will need to be animated. Makes it possible to measure the
     * contents without displaying them, to set animation targets.
     * @private
     */
    disableAnimation_: function() {
      this.itemsHeight_ = getItemHeight(this.detailsElement_);
      this.classList.add('plugin-measure-details');
    },

    /**
     * Enable animation after changing the contents of this cookie list item.
     * See @{code disableAnimation_}.
     * @private
     */
    enableAnimation_: function() {
      if (!this.classList.contains('plugin-measure-details'))
        this.disableAnimation_();
      this.detailsElement_.style.height = '';
      // This will force relayout in order to calculate the new heights.
      var itemsHeight = getItemHeight(this.detailsElement_);
      var fixedHeight = getItemHeight(this) + itemsHeight - this.itemsHeight_;
      this.detailsElement_.style.height = this.itemsHeight_ + 'px';
      // Force relayout before enabling animation, so that if we have
      // changed things since the last layout, they will not be animated
      // during subsequent layouts.
      this.detailsElement_.offsetHeight;
      this.classList.remove('plugin-measure-details');
      this.detailsElement_.style.height = itemsHeight + 'px';
      this.style.height = fixedHeight + 'px';
      if (this.expanded)
        this.list.leadItemHeight = fixedHeight;
    },
  };

  var PluginList = cr.ui.define('list');

  PluginList.prototype = {
    __proto__: List.prototype,

    decorate: function() {
      List.prototype.decorate.call(this);
      this.classList.add('settings-list');
      var sm = new ListSingleSelectionModel();
      sm.addEventListener('change', this.handleSelectionChange_.bind(this));
      this.selectionModel = sm;
      this.infoNodes = {};
      this.autoExpands = true;
      var doc = this.ownerDocument;
    },

    createItem: function(info) {
      return new PluginListItem(info, this);
    },

    handleSelectionChange_: function(ce) {
      ce.changes.forEach(function(change) {
        var listItem = this.getListItemByIndex(change.index);
        if (listItem) {
          if (!change.selected) {
            // TODO(bsmith) explain window timeout (from cookies_list.js)
            window.setTimeout(function() {
              if (!listItem.selected || !listItem.lead)
                listItem.expanded = false;
            }, 0);
          } else if (listItem.lead) {
            listItem.expanded = true;
          }
        }
      }, this);
    },
  };

  return {
    PluginList: PluginList,
    PluginListItem: PluginListItem,
  };
});

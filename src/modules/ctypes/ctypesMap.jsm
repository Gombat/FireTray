/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "ctypesMap", "FIRETRAY_WINDOW_COUNT_MAX" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/logging.jsm");
Cu.import("resource://firetray/commons.js");

const FIRETRAY_WINDOW_COUNT_MAX = 64;

/**
 * basic Hash mapping a key (of any type) to a cell in a ctypes array
 */
function ctypesMap(t) {
  this.array = ctypes.ArrayType(t)(FIRETRAY_WINDOW_COUNT_MAX);
  this.indexLast = -1;
  this.freedCells = [];         // indices of freed cells
  this.count = 0;               // count of actually stored things
  this.map = {};                // map key -> index
};

ctypesMap.prototype.get = function(key) {
  if (!this.map.hasOwnProperty(key))
      throw new RangeError('Unknown key: '+key);

  return this.array[this.map[key]];
};

ctypesMap.prototype.insert = function(key, item) {
  if (this.map.hasOwnProperty(key)) {
    LOG("REPLACE");
    this.array[this.map[key]] = item;

  } else if (this.freedCells.length) {
    LOG("USE FREE CELL");
    let idx = this.freedCells.shift();
    this.array[idx] = item;
    this.map[key] = idx;
    this.count += 1;

  } else {
    let indexNext = this.indexLast + 1;
    if (indexNext >= FIRETRAY_WINDOW_COUNT_MAX)
      throw new RangeError('Array overflow');

    this.indexLast = indexNext;
    this.array[this.indexLast] = item;
    this.map[key] = this.indexLast;
    this.count += 1;
  }
};

ctypesMap.prototype.remove = function(key) {
  if (!this.map.hasOwnProperty(key))
      throw new RangeError('Unknown key: '+key);
  LOG("FREE CELL");

  let idx = this.map[key];
  if (!delete this.map[key])
    throw new DeleteError();
  this.freedCells.unshift(idx);
  this.count -= 1;
};

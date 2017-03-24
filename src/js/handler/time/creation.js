/**
 * @fileoverview Handling creation events from drag handler and time grid view
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';

var util = global.tui.util;
var config = require('../../config');
var array = require('../../common/array');
var datetime = require('../../common/datetime');
var domutil = require('../../common/domutil');
var TimeCreationGuide = require('./creationGuide');
var TZDate = require('../../common/timezone').Date;
var timeCore = require('./core');

/**
 * @constructor
 * @implements {Handler}
 * @mixes timeCore
 * @mixes CustomEvents
 * @param {Drag} [dragHandler] - Drag handler instance.
 * @param {TimeGrid} [timeGridView] - TimeGrid view instance.
 * @param {Base} [baseController] - Base controller instance.
 */
function TimeCreation(dragHandler, timeGridView, baseController) {
    /**
     * Drag handler instance.
     * @type {Drag}
     */
    this.dragHandler = dragHandler;

    /**
     * TimeGrid view instance.
     * @type {TimeGrid}
     */
    this.timeGridView = timeGridView;

    /**
     * Base controller instance.
     * @type {Base}
     */
    this.baseController = baseController;

    /**
     * @type {TimeCreationGuide}
     */
    this.guide = new TimeCreationGuide(this);

    /**
     * Temporary function for single drag session's calc.
     * @type {function}
     */
    this._getEventDataFunc = null;

    /**
     * Temporary function for drag start data cache.
     * @type {object}
     */
    this._dragStart = null;

    dragHandler.on('dragStart', this._onDragStart, this);
}

/**
 * Destroy method
 */
TimeCreation.prototype.destroy = function() {
    this.guide.destroy();
    this.dragHandler.off(this);
    this.dragHandler = this.timeGridView = this.baseController =
        this._getEventDataFunc = this._dragStart = this.guide = null;
};

/**
 * Check target element is expected condition for activate this plugins.
 * @param {HTMLElement} target - The element to check
 * @returns {(boolean|Time)} - return Time view instance when satiate condition.
 */
TimeCreation.prototype.checkExpectedCondition = function(target) {
    var cssClass = domutil.getClass(target),
        matches;

    if (cssClass === config.classname('time-date-event-block-wrap')) {
        target = target.parentNode;
        cssClass = domutil.getClass(target);
    }

    matches = cssClass.match(config.time.getViewIDRegExp);

    if (!matches || matches.length < 2) {
        return false;
    }

    return util.pick(this.timeGridView.children.items, matches[1]);
};

/**
 * Drag#dragStart event handler.
 * @emits TimeCreation#timeCreationDragstart
 * @param {object} dragStartEventData - Drag#dragStart event data.
 * @param {string} [overrideEventName] - override emitted event name when supplied.
 * @param {function} [revise] - supply function for revise event data before emit.
 */
TimeCreation.prototype._onDragStart = function(dragStartEventData, overrideEventName, revise) {
    var target = dragStartEventData.target,
        result = this.checkExpectedCondition(target),
        getEventDataFunc,
        eventData;

    if (!result) {
        return;
    }

    getEventDataFunc = this._getEventDataFunc = this._retriveEventData(result);
    eventData = this._dragStart = getEventDataFunc(dragStartEventData.originEvent);

    if (revise) {
        revise(eventData);
    }

    this.dragHandler.on({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    /**
     * @event TimeCreation#timeCreationDragstart
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this.fire(overrideEventName || 'timeCreationDragstart', eventData);
};

/**
 * Drag#drag event handler
 * @emits TimeCreation#timeCreationDrag
 * @param {object} dragEventData - event data from Drag#drag.
 * @param {string} [overrideEventName] - override emitted event name when supplied.
 * @param {function} [revise] - supply function for revise event data before emit.
 */
TimeCreation.prototype._onDrag = function(dragEventData, overrideEventName, revise) {
    var getEventDataFunc = this._getEventDataFunc,
        eventData;

    if (!getEventDataFunc) {
        return;
    }

    eventData = getEventDataFunc(dragEventData.originEvent);

    if (revise) {
        revise(eventData);
    }

    /**
     * @event TimeCreation#timeCreationDrag
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this.fire(overrideEventName || 'timeCreationDrag', eventData);
};

/**
 * @fires TimeCreation#beforeCreateEvent
 * @param {object} eventData - event data object from TimeCreation#timeCreationDragend
 * or TimeCreation#timeCreationClick
 */
TimeCreation.prototype._createEvent = function(eventData) {
    var relatedView = eventData.relatedView,
        createRange = eventData.createRange,
        nearestGridTimeY = eventData.nearestGridTimeY,
        baseDate,
        dateStart,
        dateEnd,
        starts,
        ends;

    if (!createRange) {
        createRange = [
            nearestGridTimeY,
            nearestGridTimeY + datetime.millisecondsFrom('minutes', 30)
        ];
    }

    baseDate = new TZDate(relatedView.getDate());
    dateStart = datetime.start(baseDate);
    dateEnd = datetime.end(baseDate);
    starts = Math.max(dateStart.getTime(), createRange[0]);
    ends = Math.min(dateEnd.getTime(), createRange[1]);

    /**
     * @event TimeCreation#beforeCreateEvent
     * @type {object}
     * @property {boolean} isAllDay - whether event is fired in allday view area?
     * @property {Date} starts - select start time
     * @property {Date] ends - select end time
     */
    this.fire('beforeCreateEvent', {
        isAllDay: false,
        starts: new TZDate(starts),
        ends: new TZDate(ends),
        guide: this.guide
    });
};

/**
 * Drag#dragEnd event handler
 * @emits TimeCreation#timeCreationDragend
 * @param {object} dragEndEventData - event data from Drag#dragend
 */
TimeCreation.prototype._onDragEnd = function(dragEndEventData) {
    var self = this,
        dragStart = this._dragStart;

    //client에 위임
    //this.guide.clearGuideElement();

    this.dragHandler.off({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    /**
     * Function for manipulate event data before firing event
     * @param {object} eventData - event data
     */
    function reviseFunc(eventData) {
        var range = [
            dragStart.nearestGridTimeY,
            eventData.nearestGridTimeY
        ].sort(array.compare.num.asc);
        range[1] += datetime.millisecondsFrom('hour', 0.5);

        eventData.createRange = range;

        self._createEvent(eventData);
    }

    /**
     * @event TimeCreation#timeCreationDragend
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     * @property {number[]} createRange - milliseconds range between drag start and end to create.
     */
    this._onDrag(dragEndEventData, 'timeCreationDragend', reviseFunc);

    this._dragStart = this._getEventDataFunc = null;
};

/**
 * Drag#click event handler
 * @emits TimeCreation#timeCreationClick
 * @param {object} clickEventData - event data from Drag#click.
 */
TimeCreation.prototype._onClick = function(clickEventData) {
    var self = this;

    this.dragHandler.off({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    /**
     * Function for manipulate event data before firing event
     * @param {object} eventData - event data
     */
    function reviseFunc(eventData) {
        self._createEvent(eventData);
    }

    /**
     * @event TimeCreation#timeCreationClick
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this._onDrag(clickEventData, 'timeCreationClick', reviseFunc);

    this._dragStart = this._getEventDataFunc = null;
};

timeCore.mixin(TimeCreation);
util.CustomEvents.mixin(TimeCreation);

module.exports = TimeCreation;

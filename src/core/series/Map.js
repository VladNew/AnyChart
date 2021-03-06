goog.provide('anychart.core.series.Map');

goog.require('anychart.core.BubblePoint');
goog.require('anychart.core.ChoroplethPoint');
goog.require('anychart.core.SeriesPoint');
goog.require('anychart.core.series.Cartesian');
goog.require('anychart.core.utils.DrawingPlanIterator');
goog.require('anychart.core.utils.Error');
goog.require('anychart.core.utils.IInteractiveSeries');
goog.require('anychart.core.utils.InteractivityState');
goog.require('anychart.data');
goog.require('anychart.enums');
goog.require('anychart.format.Context');
goog.require('anychart.utils');
goog.require('goog.array');
goog.require('goog.math.AffineTransform');



/**
 * Class that represents a series for the user.
 * @param {!anychart.core.IChart} chart
 * @param {!anychart.core.IPlot} plot
 * @param {string} type
 * @param {anychart.core.series.TypeConfig} config
 * @param {boolean} sortedMode
 * @constructor
 * @extends {anychart.core.series.Cartesian}
 * @implements {anychart.core.utils.IInteractiveSeries}
 */
anychart.core.series.Map = function(chart, plot, type, config, sortedMode) {
  anychart.core.series.Map.base(this, 'constructor', chart, plot, type, config, sortedMode);

  this.geoData = [];
  this.seriesPoints = [];
};
goog.inherits(anychart.core.series.Map, anychart.core.series.Cartesian);


//region --- Class const
/**
 * Supported signals.
 * @type {number}
 */
anychart.core.series.Map.prototype.SUPPORTED_SIGNALS =
    anychart.core.series.Cartesian.prototype.SUPPORTED_SIGNALS |
    anychart.Signal.NEED_UPDATE_OVERLAP |
    anychart.Signal.NEED_UPDATE_COLOR_RANGE;


/**
 * Supported consistency states.
 * @type {number}
 */
anychart.core.series.Map.prototype.SUPPORTED_CONSISTENCY_STATES =
    anychart.core.series.Cartesian.prototype.SUPPORTED_CONSISTENCY_STATES |
    anychart.ConsistencyState.MAP_GEO_DATA_INDEX |
    anychart.ConsistencyState.MAP_COLOR_SCALE;


/**
 * Labels z-index.
 */
anychart.core.series.Map.prototype.LABELS_ZINDEX = anychart.core.shapeManagers.MAP_LABELS_ZINDEX;


//endregion
//region --- Infrastructure
/** @inheritDoc */
anychart.core.series.Map.prototype.getCategoryWidth = function() {
  return 0;
};


//endregion
//region --- Class prop


/**
 * If the series inflicts Map appearance update on series update.
 * @return {boolean}
 */
anychart.core.series.Map.prototype.needsUpdateMapAppearance = function() {
  return this.isChoropleth();
};


/**
 * @type {?boolean}
 * @private
 */
anychart.core.series.Map.prototype.overlapMode_ = null;


//----------------------------------------------------------------------------------------------------------------------
//
//  Geo data.
//
//----------------------------------------------------------------------------------------------------------------------
/**
 * @type {?string}
 * @private
 */
anychart.core.series.Map.prototype.geoIdField_;


/**
 * Geo data internal view.
 * @type {!Array.<anychart.core.map.geom.Point|anychart.core.map.geom.Line|anychart.core.map.geom.Polygon|anychart.core.map.geom.Collection>}
 * @protected
 */
anychart.core.series.Map.prototype.geoData;


/**
 * @type {Array.<string>}
 */
anychart.core.series.Map.prototype.seriesPoints;


//endregion
//region --- Coloring
/**
 * Color scale.
 * @param {(anychart.scales.LinearColor|anychart.scales.OrdinalColor)=} opt_value Scale to set.
 * @return {anychart.scales.OrdinalColor|anychart.scales.LinearColor|anychart.core.series.Map} Default chart color scale value or itself for
 * method chaining.
 */
anychart.core.series.Map.prototype.colorScale = function(opt_value) {
  if (goog.isDef(opt_value)) {
    if (this.colorScale_ != opt_value) {
      if (this.colorScale_)
        this.colorScale_.unlistenSignals(this.colorScaleInvalidated_, this);
      this.colorScale_ = opt_value;
      if (this.colorScale_)
        this.colorScale_.listenSignals(this.colorScaleInvalidated_, this);

      this.invalidate(anychart.ConsistencyState.MAP_COLOR_SCALE,
          anychart.Signal.NEEDS_REDRAW | anychart.Signal.NEED_UPDATE_COLOR_RANGE);
    }
    return this;
  }
  return this.colorScale_;
};


/**
 * Chart scale invalidation handler.
 * @param {anychart.SignalEvent} event Event.
 * @private
 */
anychart.core.series.Map.prototype.colorScaleInvalidated_ = function(event) {
  if (event.hasSignal(anychart.Signal.NEEDS_RECALCULATION | anychart.Signal.NEEDS_REAPPLICATION)) {
    this.invalidate(anychart.ConsistencyState.MAP_COLOR_SCALE,
        anychart.Signal.NEEDS_REDRAW | anychart.Signal.NEED_UPDATE_COLOR_RANGE);
  }
};


//----------------------------------------------------------------------------------------------------------------------
//
//  Path manager interface methods
//
//----------------------------------------------------------------------------------------------------------------------
/** @inheritDoc */
anychart.core.series.Map.prototype.getColorResolutionContext = function(opt_baseColor, opt_ignorePointSettings, opt_ignoreColorScale) {
  var source = opt_baseColor || this.getOption('color') || 'blue';
  var scaledColor;
  var iterator = this.getIterator();
  var ctx = {};
  var colorScale = this.colorScale();
  var ignoreColorScale = goog.isDef(opt_ignoreColorScale) && opt_ignoreColorScale;

  if (colorScale && !ignoreColorScale) {
    var value = /** @type {number} */(iterator.get(this.drawer.valueFieldName));
    if (goog.isDef(value))
      scaledColor = colorScale.valueToColor(value);

    goog.object.extend(ctx, {
      'scaledColor': scaledColor,
      'colorScale': colorScale
    });
  }

  if (this.isChoropleth()) {
    var feature = iterator.meta('currentPointElement');
    var features = iterator.meta('features');
    var point = features && features.length ? features[0] : null;
    var properties = point ? point['properties'] : null;
    var attributes = feature ? feature['attrs'] : null;
    var domElement = feature ? feature['domElement'] : null;

    goog.object.extend(ctx, {
      'properties': properties,
      'attributes': attributes,
      'element': domElement
    });
  }

  ctx['sourceColor'] = source;

  if (this.supportsPointSettings()) {
    iterator = !!opt_ignorePointSettings ? this.getDetachedIterator() : iterator;
    goog.object.extend(ctx, {
      'index': iterator.getIndex(),
      'sourceColor': source,
      'iterator': iterator,
      'referenceValueNames': this.getYValueNames()
    });
  }

  return ctx;
};


/** @inheritDoc */
anychart.core.series.Map.prototype.getHatchFillResolutionContext = function(opt_ignorePointSettings) {
  var source = this.getAutoHatchFill();
  if (this.supportsPointSettings()) {
    var iterator = !!opt_ignorePointSettings ? this.getDetachedIterator() : this.getIterator();
    return {
      'index': iterator.getIndex(),
      'sourceHatchFill': source,
      'iterator': iterator,
      'referenceValueNames': this.getYValueNames()
    };
  }
  return {
    'sourceHatchFill': source
  };
};


//endregion
//region --- Geo properties
/**
 * Sets/gets geo id field.
 * @param {?string=} opt_value Geo id.
 * @return {null|string|anychart.core.series.Map}
 */
anychart.core.series.Map.prototype.geoIdField = function(opt_value) {
  if (goog.isDef(opt_value)) {
    if (opt_value != this.geoIdField_) {
      this.geoIdField_ = opt_value;
      this.invalidate(anychart.ConsistencyState.SERIES_POINTS | anychart.ConsistencyState.SERIES_DATA,
          anychart.Signal.NEEDS_REDRAW | anychart.Signal.NEEDS_RECALCULATION);
    }
    return this;
  }
  return this.geoIdField_ || this.geoAutoGeoIdField_;
};


/**
 * Sets auto geo id for series.
 * @param {string} value
 */
anychart.core.series.Map.prototype.setAutoGeoIdField = function(value) {
  if (this.geoAutoGeoIdField_ != value) {
    this.geoAutoGeoIdField_ = value;
    if (!this.geoIdField_)
      this.invalidate(anychart.ConsistencyState.SERIES_DATA, anychart.Signal.NEEDS_REDRAW);
  }
};


/**
 * Returns final geo id for series.
 * @return {string}
 */
anychart.core.series.Map.prototype.getFinalGeoIdField = function() {
  return this.geoIdField_ || this.geoAutoGeoIdField_;
};


/**
 * Internal method. Sets link to geo data.
 * @param {!Array.<anychart.core.map.geom.Point|anychart.core.map.geom.Line|anychart.core.map.geom.Polygon|anychart.core.map.geom.Collection>} geoData Geo data to set.
 */
anychart.core.series.Map.prototype.setGeoData = function(geoData) {
  this.geoData = geoData;
};


//endregion
//region --- Labels
/**
 * Gets label position.
 * @param {anychart.PointState|number} pointState Point state - normal, hover or select.
 * @return {string} Position settings.
 */
anychart.core.series.Map.prototype.getLabelsPosition = function(pointState) {
  var selected = this.state.isStateContains(pointState, anychart.PointState.SELECT);
  var hovered = !selected && this.state.isStateContains(pointState, anychart.PointState.HOVER);

  var iterator = this.getIterator();

  var pointLabel = iterator.get('label');
  var hoverPointLabel = hovered ? iterator.get('hoverLabel') : null;
  var selectPointLabel = selected ? iterator.get('selectLabel') : null;

  var labelPosition = pointLabel && goog.isDef(pointLabel['position']) ? pointLabel['position'] : void 0;
  var labelHoverPosition = hoverPointLabel && goog.isDef(hoverPointLabel['position']) ? hoverPointLabel['position'] : void 0;
  var labelSelectPosition = selectPointLabel && goog.isDef(selectPointLabel['position']) ? selectPointLabel['position'] : void 0;

  return /** @type {string} */(hovered || selected ?
      hovered ?
          goog.isDef(labelHoverPosition) ?
              labelHoverPosition :
              goog.isDef(this.hoverLabels().getOption('position')) ?
                  this.hoverLabels().getOption('position') :
                  goog.isDef(labelPosition) ?
                      labelPosition :
                      this.labels().getOption('position') :
          goog.isDef(labelSelectPosition) ?
              labelSelectPosition :
              goog.isDef(this.selectLabels().getOption('position')) ?
                  this.selectLabels().getOption('position') :
                  goog.isDef(labelPosition) ?
                      labelPosition :
                      this.labels().getOption('position') :
      goog.isDef(labelPosition) ?
          labelPosition :
          this.labels().getOption('position'));
};


/**
 * Returns label bounds.
 * @param {number} index Point index.
 * @param {number=} opt_pointState Point state.
 * @return {Array.<number>}
 */
anychart.core.series.Map.prototype.getLabelBounds = function(index, opt_pointState) {
  var iterator = this.getIterator();
  iterator.select(index);
  var pointState = goog.isDef(opt_pointState) ? opt_pointState : this.state.getPointStateByIndex(index);

  var selected = this.state.isStateContains(pointState, anychart.PointState.SELECT);
  var hovered = !selected && this.state.isStateContains(pointState, anychart.PointState.HOVER);
  var isDraw, pointLabel, stateLabel, labelEnabledState, stateLabelEnabledState;

  pointLabel = iterator.get('label');
  labelEnabledState = pointLabel && goog.isDef(pointLabel['enabled']) ? pointLabel['enabled'] : null;
  var parentLabelsFactory = this.labels();
  var currentLabelsFactory = null;
  if (selected) {
    stateLabel = iterator.get('selectLabel');
    stateLabelEnabledState = stateLabel && goog.isDef(stateLabel['enabled']) ? stateLabel['enabled'] : null;
    currentLabelsFactory = /** @type {anychart.core.ui.LabelsFactory} */(this.selectLabels());
  } else if (hovered) {
    stateLabel = iterator.get('hoverLabel');
    stateLabelEnabledState = stateLabel && goog.isDef(stateLabel['enabled']) ? stateLabel['enabled'] : null;
    currentLabelsFactory = /** @type {anychart.core.ui.LabelsFactory} */(this.hoverLabels());
  } else {
    stateLabel = null;
  }

  if (selected || hovered) {
    isDraw = goog.isNull(stateLabelEnabledState) ?
        goog.isNull(currentLabelsFactory.enabled()) ?
            goog.isNull(labelEnabledState) ?
                parentLabelsFactory.enabled() :
                labelEnabledState :
            currentLabelsFactory.enabled() :
        stateLabelEnabledState;
  } else {
    isDraw = goog.isNull(labelEnabledState) ?
        parentLabelsFactory.enabled() :
        labelEnabledState;
  }

  if (isDraw) {
    var position = this.getLabelsPosition(pointState);

    var positionProvider = this.createPositionProvider(/** @type {anychart.enums.Position|string} */(position));
    var formatProvider = this.createFormatProvider(true);

    var settings = {};

    if (pointLabel)
      goog.object.extend(settings, /** @type {Object} */(pointLabel));
    if (currentLabelsFactory)
      goog.object.extend(settings, currentLabelsFactory.getChangedSettings());
    if (stateLabel)
      goog.object.extend(settings, /** @type {Object} */(stateLabel));

    var anchor = settings['anchor'];
    if (!goog.isDef(anchor) || goog.isNull(anchor)) {
      settings['anchor'] = this.getIterator().meta('labelAnchor');
    }

    return parentLabelsFactory.measure(formatProvider, positionProvider, settings, index).toCoordinateBox();
  } else {
    return null;
  }
};


/**
 * Anchor for angle of label
 * @param {number} angle Label angle.
 * @return {anychart.enums.Anchor}
 * @protected
 */
anychart.core.series.Map.prototype.getAnchorForLabel = function(angle) {
  angle = goog.math.standardAngle(angle);
  var anchor = anychart.enums.Anchor.CENTER;
  if (!angle) {
    anchor = anychart.enums.Anchor.CENTER_BOTTOM;
  } else if (angle < 90) {
    anchor = anychart.enums.Anchor.LEFT_BOTTOM;
  } else if (angle == 90) {
    anchor = anychart.enums.Anchor.LEFT_CENTER;
  } else if (angle < 180) {
    anchor = anychart.enums.Anchor.LEFT_TOP;
  } else if (angle == 180) {
    anchor = anychart.enums.Anchor.CENTER_TOP;
  } else if (angle < 270) {
    anchor = anychart.enums.Anchor.RIGHT_TOP;
  } else if (angle == 270) {
    anchor = anychart.enums.Anchor.RIGHT_CENTER;
  } else if (angle > 270) {
    anchor = anychart.enums.Anchor.RIGHT_BOTTOM;
  }
  return anchor;
};


/**
 * Defines show label if it don't intersect with other anyone label or not show.
 * @param {(anychart.enums.LabelsOverlapMode|string|boolean)=} opt_value .
 * @return {anychart.enums.LabelsOverlapMode|anychart.core.series.Map} .
 */
anychart.core.series.Map.prototype.overlapMode = function(opt_value) {
  if (goog.isDef(opt_value)) {
    var val = goog.isNull(opt_value) ? opt_value : anychart.enums.normalizeLabelsOverlapMode(opt_value) == anychart.enums.LabelsOverlapMode.ALLOW_OVERLAP;
    if (this.overlapMode_ != val) {
      this.overlapMode_ = val;
      this.invalidate(anychart.ConsistencyState.SERIES_LABELS, anychart.Signal.NEEDS_REDRAW | anychart.Signal.NEED_UPDATE_OVERLAP);
    }
    return this;
  }
  return goog.isNull(this.overlapMode_) ?
      /** @type {anychart.enums.LabelsOverlapMode} */(this.chart.overlapMode()) :
      this.overlapMode_ ?
          anychart.enums.LabelsOverlapMode.ALLOW_OVERLAP :
          anychart.enums.LabelsOverlapMode.NO_OVERLAP;
};


/**
 * Sets drawing labels map.
 * @param {Array.<boolean>=} opt_value .
 * @return {anychart.core.series.Map|Array.<boolean>}
 */
anychart.core.series.Map.prototype.labelsDrawingMap = function(opt_value) {
  if (goog.isDef(opt_value)) {
    if (!goog.array.equals(this.labelsDrawingMap_, opt_value)) {
      this.labelsDrawingMap_ = opt_value;
      this.invalidate(anychart.ConsistencyState.SERIES_LABELS, anychart.Signal.NEEDS_REDRAW);
    }
    return this;
  }

  return this.labelsDrawingMap_;
};


/**
 * Draws label for a point.
 * @param {anychart.data.IRowInfo} point
 * @param {anychart.PointState|number} pointState Point state - normal, hover or select.
 * @protected
 */
anychart.core.series.Map.prototype.drawLabel = function(point, pointState) {
  var index = point.getIndex();
  if (this.check(anychart.core.series.Capabilities.SUPPORTS_LABELS) &&
      !(this.labelsDrawingMap_ && goog.isDef(this.labelsDrawingMap_[index]) && !this.labelsDrawingMap_[index])) {
    anychart.core.series.Map.base(this, 'drawLabel', point, pointState);
  }
};


//endregion
//region --- Factories optimization
//----------------------------------------------------------------------------------------------------------------------
//
//  Factories optimization
//
//----------------------------------------------------------------------------------------------------------------------
/** @inheritDoc */
anychart.core.series.Map.prototype.getFactoryContainer = function() {
  return this.rootLayer;
};


//endregion
//region --- Check functions
/**
 * Tester if the series is size based (bubble).
 * @return {boolean}
 */
anychart.core.series.Map.prototype.isChoropleth = function() {
  return this.drawer.type == anychart.enums.SeriesDrawerTypes.CHOROPLETH;
};


/** @inheritDoc */
anychart.core.series.Map.prototype.isPointVisible = function(point) {
  return true;
};


//endregion
//region --- Data to Pixels transformation
//----------------------------------------------------------------------------------------------------------------------
//
//  Data to Pixels transformation
//
//----------------------------------------------------------------------------------------------------------------------
/** @inheritDoc */
anychart.core.series.Map.prototype.makePointMeta = function(rowInfo, yNames, yColumns) {
  if (this.drawer.type == anychart.enums.SeriesDrawerTypes.MAP_MARKER || this.isSizeBased()) {
    var point = this.createPositionProvider_(rowInfo);

    rowInfo.meta('x', point ? point['x'] : NaN);
    rowInfo.meta('value', point ? point['y'] : NaN);
  }
  if (this.isSizeBased()) {
    // negative sizes should be filtered out on drawing plan calculation stage
    // by settings missing reason VALUE_FIELD_MISSING
    rowInfo.meta('size', this.calculateSize(Number(rowInfo.get('size'))));
  }
};


//endregion
//region --- Statistics
/** @inheritDoc */
anychart.core.series.Map.prototype.calculateStatistics = function() {
  var seriesMax = -Infinity;
  var seriesMin = Infinity;
  var seriesSum = 0;
  var seriesPointsCount = 0;

  var iterator = this.getResetIterator();

  while (iterator.advance()) {
    var values = this.getReferenceScaleValues();

    if (values) {
      var y = anychart.utils.toNumber(values[0]);
      if (!isNaN(y)) {
        seriesMax = Math.max(seriesMax, y);
        seriesMin = Math.min(seriesMin, y);
        seriesSum += y;
      }
    }
    seriesPointsCount++;
  }
  var seriesAverage = seriesSum / seriesPointsCount;

  this.statistics(anychart.enums.Statistics.SERIES_MAX, seriesMax);
  this.statistics(anychart.enums.Statistics.SERIES_MIN, seriesMin);
  this.statistics(anychart.enums.Statistics.SERIES_SUM, seriesSum);
  this.statistics(anychart.enums.Statistics.SERIES_AVERAGE, seriesAverage);
  this.statistics(anychart.enums.Statistics.SERIES_POINTS_COUNT, seriesPointsCount);
  this.statistics(anychart.enums.Statistics.SERIES_POINT_COUNT, seriesPointsCount);
};


//endregion
//region --- Interactivity
/**
 * Whether draw on zoom or move.
 * @return {boolean}
 */
anychart.core.series.Map.prototype.needRedrawOnZoomOrMove = function() {
  return this.drawer.type == anychart.enums.SeriesDrawerTypes.CONNECTOR;
};


/**
 * Update series elements on zoom or move map interactivity.
 * p.s. There is should be logic for series that does some manipulation with series elements. Now it is just series redrawing.
 * @return {anychart.core.series.Map}
 */
anychart.core.series.Map.prototype.updateOnZoomOrMove = function() {
  var iterator = this.getResetIterator();

  var stage = this.container() ? this.container().getStage() : null;
  var manualSuspend = stage && !stage.isSuspended();
  if (manualSuspend) stage.suspend();

  while (iterator.advance() && this.enabled()) {
    this.applyZoomMoveTransform();
  }

  if (manualSuspend)
    stage.resume();

  return this;
};


/**
 * Applying zoom and move transformations to marker element.
 * @param {anychart.core.ui.LabelsFactory.Label} label .
 * @param {number} pointState .
 */
anychart.core.series.Map.prototype.applyZoomMoveTransformToLabel = function(label, pointState) {
  var prevPos, newPos, trX, trY, selfTx, scale, dx, dy, prevTx, tx;

  var domElement = label.getDomElement();
  var iterator = this.getIterator();

  var position = this.getLabelsPosition(pointState);
  var positionProvider = this.createPositionProvider(position);

  var labelRotation = label.getFinalSettings('rotation');

  var labelAnchor = label.getFinalSettings('anchor');
  if (!goog.isDef(labelAnchor) || goog.isNull(labelAnchor)) {
    labelAnchor = iterator.meta('labelAnchor');
  }

  if (goog.isDef(labelRotation))
    domElement.rotateByAnchor(-labelRotation, /** @type {anychart.enums.Anchor} */(labelAnchor));

  prevPos = label.positionProvider()['value'];
  newPos = positionProvider['value'];

  selfTx = domElement.getSelfTransformation();

  trX = -selfTx.getTranslateX() + newPos['x'] - prevPos['x'];
  trY = -selfTx.getTranslateY() + newPos['y'] - prevPos['y'];

  domElement.translate(trX, trY);

  var connectorElement = label.getConnectorElement();
  if (connectorElement && iterator.meta('positionMode') != anychart.enums.MapPointOutsidePositionMode.OFFSET) {
    prevTx = this.mapTx;
    tx = this.chart.getMapLayer().getFullTransformation().clone();

    if (prevTx) {
      tx.concatenate(prevTx.createInverse());
    }

    scale = tx.getScaleX();
    dx = tx.getTranslateX();
    dy = tx.getTranslateY();

    tx = new goog.math.AffineTransform(scale, 0, 0, scale, dx, dy);
    tx.preConcatenate(domElement.getSelfTransformation().createInverse());

    scale = tx.getScaleX();
    if (!anychart.math.roughlyEqual(scale, 1, 0.000001)) {
      dx = tx.getTranslateX();
      dy = tx.getTranslateY();
    } else {
      dx = 0;
      dy = 0;
    }
    connectorElement.setTransformationMatrix(scale, 0, 0, scale, dx, dy);
  }

  if (goog.isDef(labelRotation))
    domElement.rotateByAnchor(/** @type {number}*/(labelRotation), /** @type {anychart.enums.Anchor} */(labelAnchor));
};


/**
 * Applying zoom and move transformations to marker element.
 * @param {anychart.core.ui.MarkersFactory.Marker} marker .
 * @param {number} pointState .
 */
anychart.core.series.Map.prototype.applyZoomMoveTransformToMarker = function(marker, pointState) {
  var prevPos, newPos, trX, trY, selfTx;

  var domElement = marker.getDomElement();
  var iterator = this.getIterator();

  var position = this.getMarkersPosition(pointState);
  var positionProvider = this.createPositionProvider(/** @type {string} */(position));

  var markerRotation = marker.getFinalSettings('rotation');
  if (!goog.isDef(markerRotation) || goog.isNull(markerRotation) || isNaN(markerRotation)) {
    markerRotation = iterator.meta('markerRotation');
  }

  var markerAnchor = marker.getFinalSettings('anchor');
  if (!goog.isDef(markerAnchor) || goog.isNull(markerAnchor)) {
    markerAnchor = iterator.meta('markerAnchor');
  }

  if (goog.isDef(markerRotation))
    domElement.rotateByAnchor(-markerRotation, /** @type {anychart.enums.Anchor} */(markerAnchor));

  prevPos = marker.positionProvider()['value'];
  newPos = positionProvider['value'];

  selfTx = domElement.getSelfTransformation();

  trX = (selfTx ? -selfTx.getTranslateX() : 0) + newPos['x'] - prevPos['x'];
  trY = (selfTx ? -selfTx.getTranslateY() : 0) + newPos['y'] - prevPos['y'];

  domElement.translate(trX, trY);

  if (goog.isDef(markerRotation))
    domElement.rotateByAnchor(/** @type {number}*/(markerRotation), /** @type {anychart.enums.Anchor} */(markerAnchor));
};


/**
 * Applying zoom and move transformations to series elements for improve performans.
 */
anychart.core.series.Map.prototype.applyZoomMoveTransform = function() {
  var domElement, trX, trY, selfTx;
  var scale, dx, dy, prevTx, tx;
  var isDraw, labelsFactory, pointLabel, stateLabel, labelEnabledState, stateLabelEnabledState;

  var iterator = this.getIterator();
  var index = iterator.getIndex();

  var pointState = this.state.getPointStateByIndex(index);
  var selected = this.state.isStateContains(pointState, anychart.PointState.SELECT);
  var hovered = !selected && this.state.isStateContains(pointState, anychart.PointState.HOVER);
  var type = this.drawer.type;

  var paths = /** @type {Object.<string, acgraph.vector.Shape>} */(iterator.meta('shapes'));
  if (paths) {
    if (this.isSizeBased() || type == anychart.enums.SeriesDrawerTypes.MAP_MARKER) {
      var xPrev = /** @type {number} */(iterator.meta('x'));
      var yPrev = /** @type {number} */(iterator.meta('value'));

      var posProvider = this.createPositionProvider_(iterator);
      if (!posProvider)
        return;

      var xNew = posProvider['x'];
      var yNew = posProvider['y'];

      domElement = paths['path'] || paths['circle'] || paths['negative'];
      selfTx = domElement.getSelfTransformation();

      trX = (selfTx ? -selfTx.getTranslateX() : 0) + xNew - xPrev;
      trY = (selfTx ? -selfTx.getTranslateY() : 0) + yNew - yPrev;

      goog.object.forEach(paths, function(path) {
        path.translate(trX, trY);
      });
    } else if (type == anychart.enums.SeriesDrawerTypes.CONNECTOR) {
      prevTx = this.mapTx;
      tx = this.chart.getMapLayer().getFullTransformation().clone();

      if (prevTx) {
        tx.concatenate(prevTx.createInverse());
      }

      scale = tx.getScaleX();
      dx = tx.getTranslateX();
      dy = tx.getTranslateY();

      goog.object.forEach(paths, function(path) {
        path.setTransformationMatrix(scale, 0, 0, scale, dx, dy);
      });
    } else if (type == anychart.enums.SeriesDrawerTypes.CHOROPLETH) {
      tx = this.chart.getMapLayer().getFullTransformation();
      var hatchFill = paths['hatchFill'];
      if (hatchFill) {
        hatchFill.setTransformationMatrix(tx.getScaleX(), tx.getShearX(), tx.getShearY(), tx.getScaleY(), tx.getTranslateX(), tx.getTranslateY());
      }
    }
  }

  if (this.supportsMarkers()) {
    var pointMarker = iterator.get('marker');
    var hoverPointMarker = iterator.get('hoverMarker');
    var selectPointMarker = iterator.get('selectMarker');

    var marker = this.markers().getMarker(index);

    var markerEnabledState = pointMarker && goog.isDef(pointMarker['enabled']) ? pointMarker['enabled'] : null;
    var markerHoverEnabledState = hoverPointMarker && goog.isDef(hoverPointMarker['enabled']) ? hoverPointMarker['enabled'] : null;
    var markerSelectEnabledState = selectPointMarker && goog.isDef(selectPointMarker['enabled']) ? selectPointMarker['enabled'] : null;

    isDraw = hovered || selected ?
        hovered ?
            goog.isNull(markerHoverEnabledState) ?
                this.hoverMarkers() && goog.isNull(this.hoverMarkers().enabled()) ?
                    goog.isNull(markerEnabledState) ?
                        this.markers().enabled() :
                        markerEnabledState :
                    this.hoverMarkers().enabled() :
                markerHoverEnabledState :
            goog.isNull(markerSelectEnabledState) ?
                this.selectMarkers() && goog.isNull(this.selectMarkers().enabled()) ?
                    goog.isNull(markerEnabledState) ?
                        this.markers().enabled() :
                        markerEnabledState :
                    this.selectMarkers().enabled() :
                markerSelectEnabledState :
        goog.isNull(markerEnabledState) ?
            this.markers().enabled() :
            markerEnabledState;

    if (isDraw) {
      if (marker && marker.getDomElement() && marker.positionProvider()) {
        this.applyZoomMoveTransformToMarker(marker, pointState);
      }
    }
  }

  var label = this.labels().getLabel(index);
  isDraw = label && label.getDomElement() && label.positionProvider() && label.getFinalSettings('enabled');
  if (isDraw) {
    this.applyZoomMoveTransformToLabel(label, pointState);
  }
};


//----------------------------------------------------------------------------------------------------------------------
//
//  AllowPointsSelect. (Deprecated)
//
//----------------------------------------------------------------------------------------------------------------------
/**
 * Allows to select points of the series.
 * @param {?boolean=} opt_value Allow or not.
 * @return {null|boolean|anychart.core.series.Map} Returns allow points select state or current series instance for chaining.
 * @deprecated Since 7.13.0 in Map series and was never introduced in public API of other series, but was exported. Use this.selectionMode() instead.
 */
anychart.core.series.Map.prototype.allowPointsSelect = function(opt_value) {
  anychart.core.reporting.warning(anychart.enums.WarningCode.DEPRECATED, null, ['allowPointsSelect()', 'selectionMode()'], true);
  if (goog.isDef(opt_value)) {
    this.selectionMode(goog.isBoolean(opt_value) ?
        (opt_value ?
            anychart.enums.SelectionMode.MULTI_SELECT :
            anychart.enums.SelectionMode.NONE) :
        opt_value);
    return this;
  }
  return goog.isNull(this.selectionMode()) ? null : this.selectionMode() != anychart.enums.SelectionMode.NONE;
};


/** @inheritDoc */
anychart.core.series.Map.prototype.applyAppearanceToPoint = function(pointState) {
  var iterator = this.getIterator();
  if (this.isDiscreteBased()) {
    if (this.isChoropleth()) {
      var features = iterator.meta('features');
      if (!features)
        return;

      for (var i = 0, len = features.length; i < len; i++) {
        var feature = features[i];
        if (goog.isDef(feature.domElement)) {
          this.getChart().featureTraverser(feature, function(shape) {
            var element = shape.domElement;
            if (!element || !(element instanceof acgraph.vector.Shape))
              return;

            iterator.meta('currentPointElement', shape);

            var shapeGroup = {
              'foreignFill': element
            };
            if (shape.hatchFillDomElement)
              shapeGroup['hatchFill'] = shape.hatchFillDomElement;

            this.shapeManager.updateColors(pointState, shapeGroup);
          }, this);
        }
      }
    } else {
      this.shapeManager.updateColors(pointState,
          /** @type {Object.<string, acgraph.vector.Shape>} */(iterator.meta('shapes')));
    }
  }
  if (this.supportsOutliers()) {
    this.drawPointOutliers(iterator, pointState);
  }
  this.drawer.updatePoint(iterator, pointState);
  this.drawMarker(iterator, pointState);
  this.drawLabel(iterator, pointState);
};


//endregion
//region --- Drawing
/**
 * Calculation before draw.
 */
anychart.core.series.Map.prototype.calculate = function() {
  if (!this.isChoropleth()) {
    this.markConsistent(anychart.ConsistencyState.MAP_COLOR_SCALE);
  }

  if (this.hasInvalidationState(anychart.ConsistencyState.MAP_GEO_DATA_INDEX) ||
      this.hasInvalidationState(anychart.ConsistencyState.MAP_COLOR_SCALE)) {
    var refNames = this.getYValueNames();
    this.seriesPoints.length = 0;
    var iterator = this.getResetIterator();
    var index = this.chart.getIndexedGeoData();
    var seriesIndex;
    if (index)
      seriesIndex = index[this.geoIdField()];

    while (iterator.advance()) {
      if (this.hasInvalidationState(anychart.ConsistencyState.MAP_GEO_DATA_INDEX)) {
        if (!seriesIndex)
          continue;

        var name = iterator.get(refNames[0]);
        if (!name || !(goog.isNumber(name) || goog.isString(name) || goog.isArray(name)))
          continue;

        name = goog.isArray(name) ? name : [name];

        iterator.meta('features', undefined);
        var features = [];
        for (var j = 0, len_ = name.length; j < len_; j++) {
          var id = name[j];
          var point = seriesIndex[id];
          if (point) {
            features.push(point);
            this.seriesPoints[iterator.getIndex()] = id;
          }
        }
        iterator.meta('features', features);
      }

      if (this.hasInvalidationState(anychart.ConsistencyState.MAP_COLOR_SCALE)) {
        var value = iterator.get(refNames[1]);
        if (this.colorScale_)
          this.colorScale_.extendDataRange(value);
      }
    }

    if (this.hasInvalidationState(anychart.ConsistencyState.MAP_COLOR_SCALE)) {
      if (this.colorScale_)
        this.colorScale_.finishAutoCalc();
    }
    this.markConsistent(anychart.ConsistencyState.MAP_GEO_DATA_INDEX);
    this.markConsistent(anychart.ConsistencyState.MAP_COLOR_SCALE);
  }
};


/** @inheritDoc */
anychart.core.series.Map.prototype.startDrawing = function() {
  this.calculate();

  this.mapTx = this.chart.getMapLayer().getFullTransformation().clone();

  anychart.core.series.Map.base(this, 'startDrawing');
};


/** @inheritDoc */
anychart.core.series.Map.prototype.drawPoint = function(point, state) {
  if (this.hasInvalidationState(anychart.ConsistencyState.BOUNDS) && this.isChoropleth()) {
    var features = point.meta('features');

    if (features) {
      for (var i = 0, len = features.length; i < len; i++) {
        var feature = features[i];
        if (goog.isDef(feature.domElement)) {
          this.bindHandlersToGraphics(feature.domElement);
        }
      }
    }
  }

  anychart.core.series.Map.base(this, 'drawPoint', point, state);
};


//endregion
//region --- Legend
/** @inheritDoc */
anychart.core.series.Map.prototype.getLegendItemData = function(itemsFormat) {
  var legendItem = this.legendItem();
  legendItem.markAllConsistent();
  var json = legendItem.serialize();
  var iconFill, iconStroke, iconHatchFill;
  var ctx = {
    'sourceColor': this.getOption('color')
  };
  if (goog.isFunction(legendItem.iconFill())) {
    json['iconFill'] = legendItem.iconFill().call(ctx, ctx);
  }
  if (goog.isFunction(legendItem.iconStroke())) {
    json['iconStroke'] = legendItem.iconStroke().call(ctx, ctx);
  }
  if (goog.isFunction(legendItem.iconHatchFill())) {
    ctx['sourceColor'] = this.autoHatchFill;
    json['iconHatchFill'] = legendItem.iconHatchFill().call(ctx, ctx);
  }
  var format = this.createLegendContextProvider();
  var itemText;
  if (goog.isFunction(itemsFormat)) {

    itemText = itemsFormat.call(format, format);
  }
  if (!goog.isString(itemText))
    itemText = this.name();

  if (json['iconType'] == anychart.enums.LegendItemIconType.MARKER && this.supportsMarkers()) {
    json['iconFill'] = this.markers().fill();
    json['iconStroke'] = this.markers().stroke();
  }

  json['iconType'] = this.getLegendIconType(json['iconType'], format);

  var ret = {
    'text': /** @type {string} */ (itemText),
    'iconEnabled': true,
    'iconStroke': void 0,
    'iconFill': /** @type {acgraph.vector.Fill} */(this.getOption('color')),
    'iconHatchFill': void 0,
    'disabled': !this.enabled()
  };
  goog.object.extend(ret, json);
  return ret;
};


//endregion
//region --- Position and Formating
/** @inheritDoc */
anychart.core.series.Map.prototype.updateContext = function(provider, opt_rowInfo) {
  var rowInfo = opt_rowInfo || this.getIterator();

  var scale = this.getXScale();
  var values = {
    'chart': {value: this.getChart(), type: anychart.enums.TokenType.UNKNOWN},
    'series': {value: this, type: anychart.enums.TokenType.UNKNOWN},
    'scale': {value: scale, type: anychart.enums.TokenType.UNKNOWN},
    'index': {value: rowInfo.getIndex(), type: anychart.enums.TokenType.NUMBER},
    'seriesName': {value: this.name(), type: anychart.enums.TokenType.STRING},
    'id': {value: rowInfo.get('id'), type: anychart.enums.TokenType.STRING}
  };

  var val = rowInfo.get('value');
  if (goog.isDef(val))
    values['value'] = {value: val, type: anychart.enums.TokenType.NUMBER};

  if (scale && goog.isFunction(scale.getType))
    values['xScaleType'] = {value: scale.getType(), type: anychart.enums.TokenType.STRING};

  var i;
  var refValueNames = this.getYValueNames();
  for (i = 0; i < refValueNames.length; i++) {
    var refName = refValueNames[i];
    if (!(refName in values))
      values[refName] = {value: rowInfo.get(refName), type: anychart.enums.TokenType.NUMBER};
  }

  if (this.drawer.type == anychart.enums.SeriesDrawerTypes.CONNECTOR) {
    var pointsWithoutMissing = rowInfo.meta('pointsWithoutMissing');
    if (pointsWithoutMissing && pointsWithoutMissing.length) {
      values['startPoint'] = {value: {'lat': pointsWithoutMissing[0], 'long': pointsWithoutMissing[1]}, type: anychart.enums.TokenType.UNKNOWN};
      values['endPoint'] = {value: {'lat': pointsWithoutMissing[pointsWithoutMissing.length - 2], 'long': pointsWithoutMissing[pointsWithoutMissing.length - 1]}, type: anychart.enums.TokenType.UNKNOWN};

      var len;
      var connectorPoints = [];
      for (i = 0, len = pointsWithoutMissing.length; i < len; i += 2) {
        connectorPoints.push({'lat': pointsWithoutMissing[i], 'long': pointsWithoutMissing[i + 1]});
      }
      values['connectorPoints'] = {value: connectorPoints, type: anychart.enums.TokenType.UNKNOWN};
    }
  } else {
    var regionId = rowInfo.meta('regionId');
    if (regionId)
      values['id'] = {value: regionId, type: anychart.enums.TokenType.STRING};

    provider.values(values);

    var features = rowInfo.meta('features');
    var pointGeoProp = features && features.length ? features[0]['properties'] : null;
    if (pointGeoProp) {
      values['regionProperties'] = {value: pointGeoProp, type: anychart.enums.TokenType.UNKNOWN};
      for (var key in pointGeoProp) {
        if (pointGeoProp.hasOwnProperty(key)) {
          var providerTokenValue = provider.getTokenValueInternal(key);
          if (!goog.isDef(providerTokenValue)) {
            values[key] = {value: pointGeoProp[key]};
          }
        }
      }
    }
  }

  provider
      .dataSource(rowInfo)
      .statisticsSources([this, this.getChart()]);

  return /** @type {anychart.format.Context} */ (provider.propagate(values));
};


/**
 * @return {anychart.format.Context}
 */
anychart.core.series.Map.prototype.getContextProvider = function() {
  return this.updateContext(new anychart.format.Context());
};


/** @inheritDoc */
anychart.core.series.Map.prototype.createLabelsContextProvider = function() {
  return this.getContextProvider();
};


/**
 * Transform coords to pix values.
 * @param {number} xCoord X coordinate.
 * @param {number} yCoord Y coordinate.
 * @return {Object.<string, number>} Object with pix values.
 */
anychart.core.series.Map.prototype.transformXY = function(xCoord, yCoord) {
  var values = this.chart.scale().transform(xCoord, yCoord);
  return {'x': values[0], 'y': values[1]};
};


/**
 * Creates format provider.
 * @param {boolean=} opt_force .
 * @return {anychart.format.Context}
 */
anychart.core.series.Map.prototype.createFormatProvider = function(opt_force) {
  if (!this.pointProvider || opt_force)
    this.pointProvider = new anychart.format.Context();
  return this.updateContext(/** @type {!anychart.format.Context} */ (this.pointProvider));
};


/** @inheritDoc */
anychart.core.series.Map.prototype.drawSingleFactoryElement = function(factory, index, positionProvider, formatProvider, chartNormalFactory, seriesStateFactory, chartStateFactory, pointOverride, statePointOverride, opt_position) {
  if (!positionProvider['value'])
    return null;

  var element = formatProvider ? factory.getLabel(/** @type {number} */(index)) : factory.getMarker(/** @type {number} */(index));
  if (element) {
    if (formatProvider)
      element.formatProvider(formatProvider);
    element.positionProvider(positionProvider);
  } else {
    if (formatProvider)
      element = factory.add(formatProvider, positionProvider, index);
    else
      element = factory.add(positionProvider, index);
  }
  element.resetSettings();
  if (formatProvider) {
    element.autoAnchor(/** @type {anychart.enums.Anchor} */(this.getIterator().meta('labelAnchor')));
    element.state('pointState', goog.isDef(statePointOverride) ? statePointOverride : null);
    element.state('seriesState', seriesStateFactory);
    element.state('chartState', chartStateFactory);
    element.state('pointNormal', goog.isDef(pointOverride) ? pointOverride : null);
    element.state('seriesNormal', factory);
    element.state('chartNormal', chartNormalFactory);
    element.state('seriesStateTheme', seriesStateFactory ? seriesStateFactory.themeSettings : null);
    element.state('chartStateTheme', chartStateFactory ? chartStateFactory.themeSettings : null);
    element.state('auto', element.autoSettings);
    element.state('seriesNormalTheme', factory.themeSettings);
    element.state('chartNormalTheme', chartNormalFactory ? chartNormalFactory.themeSettings : null);
  } else {
    element.currentMarkersFactory(seriesStateFactory || factory);
    element.setSettings(/** @type {Object} */(pointOverride), /** @type {Object} */(statePointOverride));
    var rotation = /** @type {number} */(element.getFinalSettings('rotation'));
    if (!goog.isDef(rotation) || goog.isNull(rotation) || isNaN(rotation)) {
      var autoRotation = {'rotation': /** @type {number} */(this.getIterator().meta('markerRotation'))};
      element.setSettings(autoRotation, autoRotation);
    }

    var anchor = /** @type {anychart.enums.Anchor} */(element.getFinalSettings('anchor'));
    if (!goog.isDef(anchor) || goog.isNull(anchor)) {
      var autoAnchor = {'anchor': /** @type {anychart.enums.Anchor} */(this.getIterator().meta('markerAnchor'))};
      element.setSettings(autoAnchor, autoAnchor);
    }
  }

  element.draw();

  //Needs for correct drawing of label connectors in zoomed map state.
  if (this.drawer.type == anychart.enums.SeriesDrawerTypes.CHOROPLETH) {
    this.mapTx = this.chart.getMapLayer().getFullTransformation().clone();
  }
  return element;
};


/**
 * Returns middle point.
 * @return {Object}
 */
anychart.core.series.Map.prototype.getMiddlePoint = function() {
  var middleX, middleY, middlePoint, midX, midY, txCoords;
  var iterator = this.getIterator();
  var features = iterator.meta('features');
  var feature = features && features.length ? features[0] : null;

  if (!feature || !this.isChoropleth())
    return {'x': 0, 'y': 0};

  var pointGeoProp = /** @type {Object}*/(feature['properties']);

  var middleXYModeGeoSettings = pointGeoProp && pointGeoProp['middleXYMode'];
  var middleXYModeDataSettings = iterator.get('middleXYMode');

  var middleXYMode = goog.isDef(middleXYModeDataSettings) ?
      middleXYModeDataSettings : middleXYModeGeoSettings ?
      middleXYModeGeoSettings : anychart.enums.MapPointMiddlePositionMode.RELATIVE;

  if (middleXYMode == anychart.enums.MapPointMiddlePositionMode.RELATIVE) {
    middlePoint = this.getPositionByRegion();
  } else if (middleXYMode == anychart.enums.MapPointMiddlePositionMode.ABSOLUTE) {
    midX = iterator.get('middle-x');
    midY = iterator.get('middle-y');
    middleX = /** @type {number}*/(goog.isDef(midX) ? midX : pointGeoProp ? pointGeoProp['middle-x'] : 0);
    middleY = /** @type {number}*/(goog.isDef(midY) ? midY : pointGeoProp ? pointGeoProp['middle-y'] : 0);

    middleX = anychart.utils.toNumber(middleX);
    middleY = anychart.utils.toNumber(middleY);

    txCoords = this.chart.scale().transform(middleX, middleY);

    middlePoint = {'x': txCoords[0], 'y': txCoords[1]};
  } else {
    middlePoint = {'x': 0, 'y': 0};
  }

  return middlePoint;
};


/**
 * Creates position provider for connector series.
 * @param {anychart.data.IRowInfo} iterator .
 * @param {string} position .
 * @return {Object}
 * @private
 */
anychart.core.series.Map.prototype.createConnectorPositionProvider_ = function(iterator, position) {
  var shape = iterator.meta('shapes')['path'];
  if (shape) {
    var sumDist = /** @type {number} */(iterator.meta('sumDist'));
    var connectorsDist = /** @type {number} */(iterator.meta('connectorsDist'));
    var points = /** @type {Array.<number>} */(iterator.meta('points'));
    var accumDist = 0;

    var normalizedPosition;
    if (goog.isString(position)) {
      switch (position) {
        case 'start':
          normalizedPosition = 0;
          break;
        case 'middle':
          normalizedPosition = .5;
          break;
        case 'end':
          normalizedPosition = 1;
          break;
        default:
          if (anychart.utils.isPercent(position)) {
            normalizedPosition = parseFloat(position) / 100;
          } else {
            normalizedPosition = anychart.utils.toNumber(position);
            if (isNaN(normalizedPosition)) normalizedPosition = .5;
          }
      }
    } else {
      normalizedPosition = anychart.utils.toNumber(position);
      if (isNaN(normalizedPosition)) normalizedPosition = .5;
    }

    //start, end, middle
    //position relative full shortest path passing through all points
    var pixPosition = normalizedPosition * sumDist;
    for (var i = 0, len = points.length; i < len; i += 8) {
      //length of shortest connector path
      var currPathDist = connectorsDist[i / 8];

      if (pixPosition >= accumDist && pixPosition <= accumDist + currPathDist) {
        //calculated pixel position relative current connector
        var pixPosition_ = pixPosition - accumDist;

        //ratio relative current connector
        var t = pixPosition_ / currPathDist;

        //Control points relative scheme
        //https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/B%C3%A9zier_3_big.svg/360px-B%C3%A9zier_3_big.svg.png
        var p0x = points[i];
        var p0y = points[i + 1];
        var p1x = points[i + 2];
        var p1y = points[i + 3];
        var p2x = points[i + 4];
        var p2y = points[i + 5];
        var p3x = points[i + 6];
        var p3y = points[i + 7];

        var q0x = p1x + (p0x - p1x) * (1 - t);
        var q0y = p1y + (p0y - p1y) * (1 - t);

        var q1x = p2x + (p1x - p2x) * (1 - t);
        var q1y = p2y + (p1y - p2y) * (1 - t);

        var q2x = p3x + (p2x - p3x) * (1 - t);
        var q2y = p3y + (p2y - p3y) * (1 - t);

        var r0x = q1x + (q0x - q1x) * (1 - t);
        var r0y = q1y + (q0y - q1y) * (1 - t);

        var r1x = q2x + (q1x - q2x) * (1 - t);
        var r1y = q2y + (q1y - q2y) * (1 - t);

        var bx = r1x + (r0x - r1x) * (1 - t);
        var by = r1y + (r0y - r1y) * (1 - t);


        var horizontal = Math.abs(r1x - r0x);
        var vertical = Math.abs(r1y - r0y);
        var anglePathNormal = anychart.math.round(goog.math.toDegrees(Math.atan(vertical / horizontal)), 7);

        if (r1x < r0x && r1y < r0y) {
          anglePathNormal = anglePathNormal - 180;
        } else if (r1x < r0x && r1y > r0y) {
          anglePathNormal = 180 - anglePathNormal;
        } else if (r1x > r0x && r1y > r0y) {
          //anglePathNormal = anglePathNormal;
        } else if (r1x > r0x && r1y < r0y) {
          anglePathNormal = -anglePathNormal;
        }

        iterator.meta('labelAnchor', this.getAnchorForLabel(goog.math.standardAngle(anglePathNormal + 90)));
        iterator.meta('markerRotation', anglePathNormal);
        iterator.meta('markerAnchor', normalizedPosition == 1 ? anychart.enums.Anchor.RIGHT_CENTER : !normalizedPosition ? anychart.enums.Anchor.LEFT_CENTER : anychart.enums.Anchor.CENTER);

        //todo (blackart) shapes for debug, don't remove.
        //if (!this['q0' + this.getIterator().getIndex()]) this['q0' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['q0' + this.getIterator().getIndex()].centerX(q0x).centerY(q0y).radius(3);
        //
        //if (!this['q1' + this.getIterator().getIndex()]) this['q1' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['q1' + this.getIterator().getIndex()].centerX(q1x).centerY(q1y).radius(3);
        //
        //if (!this['q2' + this.getIterator().getIndex()]) this['q2' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['q2' + this.getIterator().getIndex()].centerX(q2x).centerY(q2y).radius(3);
        //
        //if (!this['r0' + this.getIterator().getIndex()]) this['r0' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['r0' + this.getIterator().getIndex()].centerX(r0x).centerY(r0y).radius(3);
        //
        //if (!this['r1' + this.getIterator().getIndex()]) this['r1' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['r1' + this.getIterator().getIndex()].centerX(r1x).centerY(r1y).radius(3);
        //
        //if (!this['b' + this.getIterator().getIndex()]) this['b' + this.getIterator().getIndex()] = this.container().circle().zIndex(1000).stroke('red');
        //this['b' + this.getIterator().getIndex()].centerX(bx).centerY(by).radius(3);
        //
        //if (!this['q0q1' + this.getIterator().getIndex()]) this['q0q1' + this.getIterator().getIndex()] = this.container().path().zIndex(1000).stroke('blue');
        //this['q0q1' + this.getIterator().getIndex()].clear().moveTo(q0x, q0y).lineTo(q1x, q1y);
        //
        //if (!this['q1q2' + this.getIterator().getIndex()]) this['q1q2' + this.getIterator().getIndex()] = this.container().path().zIndex(1000).stroke('blue');
        //this['q1q2' + this.getIterator().getIndex()].clear().moveTo(q1x, q1y).lineTo(q2x, q2y);
        //
        //if (!this['r0r1' + this.getIterator().getIndex()]) this['r0r1' + this.getIterator().getIndex()] = this.container().path().zIndex(1000).stroke('blue');
        //this['r0r1' + this.getIterator().getIndex()].clear().moveTo(r0x, r0y).lineTo(r1x, r1y);
      }
      accumDist += currPathDist;
    }

    if (this.chart.zoomingInProgress || this.chart.moving || !this.needRedrawOnZoomOrMove()) {
      var prevTx = this.mapTx;
      var tx = this.chart.getMapLayer().getFullTransformation().clone();

      if (prevTx) {
        tx.concatenate(prevTx.createInverse());
      }

      var scale = tx.getScaleX();
      var dx = tx.getTranslateX();
      var dy = tx.getTranslateY();

      return {'x': bx * scale + dx, 'y': by * scale + dy};
    } else {
      return {'x': bx, 'y': by};
    }
  }
  return {'x': 0, 'y': 0};
};


/**
 * Creates position provider for series based on lat/lon position or position relative polygon bounds.
 * @param {anychart.data.IRowInfo} iterator
 * @return {Object}
 * @private
 */
anychart.core.series.Map.prototype.createPositionProvider_ = function(iterator) {
  var scale = this.chart.scale();
  var fail = false;

  var refValues = this.getYValueNames();

  var id = iterator.get(refValues[0]);
  var x = iterator.get(refValues[1]);
  var y = iterator.get(refValues[2]);

  var arrayMappingWithRegion = anychart.utils.isNaN(x) && x == id;

  x = parseFloat(x);
  y = parseFloat(y);

  var txCoords = scale.transform(x, y);
  if (!isNaN(x))
    x = txCoords[0];
  if (!isNaN(y) && !arrayMappingWithRegion)
    y = txCoords[1];

  if (isNaN(x) || isNaN(y)) {
    var features = iterator.meta('features');
    var prop = features && features.length ? features[0]['properties'] : null;
    if (prop) {
      iterator.meta('regionId', id);
      var pos = this.getPositionByRegion();
      if (isNaN(x))
        x = pos['x'];
      if (isNaN(y) || arrayMappingWithRegion)
        y = pos['y'];
    } else {
      fail = true;
    }
  }
  iterator.meta('missing', fail);

  return fail ? null : {'x': x, 'y': y};
};


/**
 * Creates position provider for choropleth series.
 * @param {anychart.data.IRowInfo} iterator
 * @return {Object}
 * @private
 */
anychart.core.series.Map.prototype.createChoroplethPositionProvider_ = function(iterator) {
  var features = iterator.meta('features');
  var feature = features && features.length ? features[0] : null;
  var middlePoint, midX, midY, txCoords, labelPoint;
  if (feature) {
    middlePoint = this.getMiddlePoint();

    var dataLabel = iterator.get('label');
    var dataLabelPositionMode, dataLabelXPos, dataLabelYPos;
    if (dataLabel) {
      dataLabelPositionMode = dataLabel['positionMode'];
      dataLabelXPos = dataLabel['x'];
      dataLabelYPos = dataLabel['y'];
    }

    var pointGeoProp = /** @type {Object}*/(feature['properties']);
    var geoLabel = pointGeoProp && pointGeoProp['label'];
    var geoLabelPositionMode, geoLabelXPos, geoLabelYPos;
    if (geoLabel) {
      geoLabelPositionMode = geoLabel && geoLabel['positionMode'];
      geoLabelXPos = dataLabel['x'];
      geoLabelYPos = dataLabel['y'];
    }

    var positionMode = dataLabelPositionMode || geoLabelPositionMode || anychart.enums.MapPointOutsidePositionMode.RELATIVE;
    var x = goog.isDef(dataLabelXPos) ? dataLabelXPos : geoLabelXPos;
    var y = goog.isDef(dataLabelYPos) ? dataLabelYPos : geoLabelYPos;

    if (goog.isDef(x) && goog.isDef(y)) {
      iterator.meta('positionMode', positionMode);

      midX = middlePoint['x'];
      midY = middlePoint['y'];

      if (positionMode == anychart.enums.MapPointOutsidePositionMode.RELATIVE) {
        x = anychart.utils.normalizeNumberOrPercent(x);
        y = anychart.utils.normalizeNumberOrPercent(y);

        x = anychart.utils.isPercent(x) ? parseFloat(x) / 100 : x;
        y = anychart.utils.isPercent(y) ? parseFloat(y) / 100 : y;

        var shape = feature.domElement;
        if (shape) {
          var bounds = shape.getAbsoluteBounds();
          x = bounds.left + bounds.width * x;
          y = bounds.top + bounds.height * y;
        } else {
          x = 0;
          y = 0;
        }
      } else if (positionMode == anychart.enums.MapPointOutsidePositionMode.ABSOLUTE) {
        txCoords = this.chart.scale().transform(parseFloat(x), parseFloat(y));
        x = txCoords[0];
        y = txCoords[1];
      } else if (positionMode == anychart.enums.MapPointOutsidePositionMode.OFFSET) {
        var angle = goog.math.toRadians(parseFloat(x) - 90);
        var r = parseFloat(y);

        x = midX + r * Math.cos(angle);
        y = midY + r * Math.sin(angle);
      }

      var horizontal = Math.abs(midX - x);
      var vertical = Math.abs(midY - y);
      var connectorAngle = anychart.math.round(goog.math.toDegrees(Math.atan(vertical / horizontal)), 7);

      if (midX < x && midY < y) {
        connectorAngle = connectorAngle - 180;
      } else if (midX < x && midY > y) {
        connectorAngle = 180 - connectorAngle;
      } else if (midX > x && midY > y) {
        //connectorAngle = connectorAngle;
      } else if (midX > x && midY < y) {
        connectorAngle = -connectorAngle;
      }

      var anchor = this.getAnchorForLabel(goog.math.standardAngle(connectorAngle - 90));
      iterator.meta('labelAnchor', anchor);
      iterator.meta('markerAnchor', anchor);

      labelPoint = {'x': x, 'y': y};
    } else {
      iterator.meta('labelAnchor', anychart.enums.Anchor.CENTER);
      iterator.meta('markerAnchor', anychart.enums.Anchor.CENTER);
    }
  } else {
    middlePoint = null;
  }

  if (labelPoint) {
    labelPoint['connectorPoint'] = {'value': middlePoint};
    return labelPoint;
  } else {
    return middlePoint;
  }
};


/** @inheritDoc */
anychart.core.series.Map.prototype.createPositionProvider = function(position, opt_shift3D) {
  var iterator = this.getIterator();
  var point = {'x': 0, 'y': 0};

  switch (this.drawer.type) {
    case anychart.enums.SeriesDrawerTypes.CONNECTOR:
      point = this.createConnectorPositionProvider_(iterator, position);
      break;
    case anychart.enums.SeriesDrawerTypes.MAP_MARKER:
    case anychart.enums.SeriesDrawerTypes.MAP_BUBBLE:
      point = this.createPositionProvider_(iterator);
      break;
    case anychart.enums.SeriesDrawerTypes.CHOROPLETH:
      point = this.createChoroplethPositionProvider_(iterator);
      var connectorPoint = point && point['connectorPoint'];
      if (connectorPoint) {
        delete point['connectorPoint'];
        return {
          'connectorPoint': connectorPoint,
          'value': point
        };
      }
      break;
  }

  return {'value': point};
};


/**
 * Returns position relative bounded region.
 * @return {Object} Object with info for labels formatting.
 */
anychart.core.series.Map.prototype.getPositionByRegion = function() {
  var iterator = this.getIterator();

  var features = iterator.meta('features');
  var feature = features && features.length ? features[0] : null;
  var pointGeoProp = /** @type {Object}*/(feature ? feature['properties'] : null);

  var midX = iterator.get('middle-x');
  var midY = iterator.get('middle-y');
  var middleX = /** @type {number} */(goog.isDef(midX) ? midX : pointGeoProp && goog.isDef(pointGeoProp['middle-x']) ? pointGeoProp['middle-x'] : .5);
  var middleY = /** @type {number} */(goog.isDef(midY) ? midY : pointGeoProp && goog.isDef(pointGeoProp['middle-y']) ? pointGeoProp['middle-y'] : .5);

  var shape = feature ? feature.domElement : null;
  var positionProvider;
  if (shape) {
    var bounds = shape.getAbsoluteBounds();
    positionProvider = {'x': bounds.left + bounds.width * middleX, 'y': bounds.top + bounds.height * middleY};
  } else {
    positionProvider = null;
  }
  return positionProvider;
};


/**
 * Gets marker position.
 * @param {anychart.PointState|number} pointState If it is a hovered oe selected marker drawing.
 * @return {string|number} Position settings.
 */
anychart.core.series.Map.prototype.getMarkersPosition = function(pointState) {
  var iterator = this.getIterator();

  var selected = this.state.isStateContains(pointState, anychart.PointState.SELECT);
  var hovered = !selected && this.state.isStateContains(pointState, anychart.PointState.HOVER);

  var pointMarker = iterator.get('marker');
  var hoverPointMarker = iterator.get('hoverMarker');
  var selectPointMarker = iterator.get('selectMarker');

  var markerPosition = pointMarker && goog.isDef(pointMarker['position']) ? pointMarker['position'] : this.markers().position();
  var markerHoverPosition = hoverPointMarker && goog.isDef(hoverPointMarker['position']) ? hoverPointMarker['position'] : goog.isDef(this.hoverMarkers().position()) ? this.hoverMarkers().position() : markerPosition;
  var markerSelectPosition = selectPointMarker && goog.isDef(selectPointMarker['position']) ? selectPointMarker['position'] : goog.isDef(this.selectMarkers().position()) ? this.hoverMarkers().position() : markerPosition;

  return hovered ? markerHoverPosition : selected ? markerSelectPosition : markerPosition;
};


//endregion
//region --- Base methods
/**
 * Gets an array of reference 'y' fields from the row iterator points to.
 * Reference fields are defined using referenceValueNames and referenceValueMeanings.
 * If there is only one field - a value is returned.
 * If there are several - array.
 * If any of the two is undefined - returns null.
 *
 * @return {?Array.<*>} Fetches significant scale values from current data row.
 */
anychart.core.series.Map.prototype.getReferenceScaleValues = function() {
  if (!this.enabled()) return null;
  var iterator = this.getIterator();
  var val = iterator.get(this.drawer.valueFieldName);
  return [val];
};


/**
 * Returns series point by id.
 * @param {string} value Point id.
 * @return {anychart.core.Point} Wrapped point.
 */
anychart.core.series.Map.prototype.getPointById = function(value) {
  var index = goog.array.indexOf(this.seriesPoints, value);
  return index != -1 ? this.getPoint(index) : null;
};


/** @inheritDoc */
anychart.core.series.Map.prototype.getPoint = function(index) {
  return this.isChoropleth() ? new anychart.core.ChoroplethPoint(this, index) : anychart.core.series.Map.base(this, 'getPoint', index);
};


//endregion
//region --- Optimized Properties
//----------------------------------------------------------------------------------------------------------------------
//
//  OptimizedProperties
//
//----------------------------------------------------------------------------------------------------------------------
/**
 * Properties that should be defined in series.Base prototype.
 * @type {!Object.<string, anychart.core.settings.PropertyDescriptor>}
 */
anychart.core.series.Map.PROPERTY_DESCRIPTORS = (function() {
  /** @type {!Object.<string, anychart.core.settings.PropertyDescriptor>} */
  var map = {};
  map['startSize'] = anychart.core.settings.createDescriptor(
      anychart.enums.PropertyHandlerType.SINGLE_ARG,
      'startSize',
      anychart.core.settings.numberNormalizer,
      anychart.ConsistencyState.SERIES_POINTS,
      anychart.Signal.NEEDS_REDRAW,
      anychart.core.drawers.Capabilities.ANY);

  map['endSize'] = anychart.core.settings.createDescriptor(
      anychart.enums.PropertyHandlerType.SINGLE_ARG,
      'endSize',
      anychart.core.settings.numberNormalizer,
      anychart.ConsistencyState.SERIES_POINTS,
      anychart.Signal.NEEDS_REDRAW,
      anychart.core.drawers.Capabilities.ANY);

  map['curvature'] = anychart.core.settings.createDescriptor(
      anychart.enums.PropertyHandlerType.SINGLE_ARG,
      'curvature',
      anychart.core.settings.numberNormalizer,
      anychart.ConsistencyState.SERIES_POINTS,
      anychart.Signal.NEEDS_REDRAW | anychart.Signal.NEED_UPDATE_OVERLAP,
      anychart.core.drawers.Capabilities.ANY);

  return map;
})();


// populating series base prototype with properties
anychart.core.settings.populate(anychart.core.series.Map, anychart.core.series.Map.PROPERTY_DESCRIPTORS);


//endregion
//region --- Setup
/** @inheritDoc */
anychart.core.series.Map.prototype.serialize = function() {
  var json = anychart.core.series.Map.base(this, 'serialize');

  anychart.core.settings.serialize(this, anychart.core.series.Map.PROPERTY_DESCRIPTORS, json);

  json['seriesType'] = this.getType();
  json['overlapMode'] = this.overlapMode_;

  if (goog.isDef(this.geoIdField_))
    json['geoIdField'] = this.geoIdField_;

  return json;
};


/**
 * @inheritDoc
 * @suppress {deprecated}
 */
anychart.core.series.Map.prototype.setupByJSON = function(config, opt_default) {
  anychart.core.series.Map.base(this, 'setupByJSON', config, opt_default);

  anychart.core.settings.deserialize(this, anychart.core.series.Map.PROPERTY_DESCRIPTORS, config);

  this.overlapMode(config['overlapMode']);
  this.geoIdField(config['geoIdField']);
  if (goog.isDef(config['allowPointsSelect'])) {
    this.allowPointsSelect(config['allowPointsSelect']);
  }
};


//endregion
//region --- Exports
//exports
/** @suppress {deprecated} */
(function() {
  var proto = anychart.core.series.Map.prototype;
  proto['overlapMode'] = proto.overlapMode;

  proto['geoIdField'] = proto.geoIdField;
  proto['transformXY'] = proto.transformXY;

  proto['colorScale'] = proto.colorScale;
  proto['getPoint'] = proto.getPoint;

  proto['allowPointsSelect'] = proto.allowPointsSelect;
})();
//endregion

goog.provide('anychart.core.drawers.PolarRangeColumn');
goog.require('anychart.core.drawers');
goog.require('anychart.core.drawers.RangeColumn');
goog.require('anychart.enums');



/**
 * PolarRangeColumn drawer.
 * @param {anychart.core.series.Base} series
 * @constructor
 * @extends {anychart.core.drawers.RangeColumn}
 */
anychart.core.drawers.PolarRangeColumn = function(series) {
  anychart.core.drawers.PolarRangeColumn.base(this, 'constructor', series);
};
goog.inherits(anychart.core.drawers.PolarRangeColumn, anychart.core.drawers.RangeColumn);
anychart.core.drawers.AvailableDrawers[anychart.enums.SeriesDrawerTypes.POLAR_RANGE_COLUMN] = anychart.core.drawers.PolarRangeColumn;


/** @inheritDoc */
anychart.core.drawers.PolarRangeColumn.prototype.type = anychart.enums.SeriesDrawerTypes.POLAR_RANGE_COLUMN;


/** @inheritDoc */
anychart.core.drawers.PolarRangeColumn.prototype.startDrawing = function(shapeManager) {
  anychart.core.drawers.PolarRangeColumn.base(this, 'startDrawing', shapeManager);

  var series = (/** @type {anychart.core.series.Polar} */(this.series));
  /**
   * @type {number}
   * @protected
   */
  this.cx = series.cx;
  /**
   * @type {number}
   * @protected
   */
  this.cy = series.cy;
  /**
   * @type {number}
   * @protected
   */
  this.radius = series.radius;
  /**
   * @type {number}
   * @protected
   */
  this.innerRadius = series.innerRadius;
  /**
   * @type {number}
   * @protected
   */
  this.zeroAngle = goog.math.toRadians(goog.math.modulo((/** @type {number} */(series.getOption('startAngle'))) - 90, 360));
  /**
   * @type {number}
   * @protected
   */
  this.pointWidthHalfRatio = this.pointWidth / 720;
};


/** @inheritDoc */
anychart.core.drawers.PolarRangeColumn.prototype.drawSubsequentPoint = function(point, state) {
  var shapes = this.shapesManager.getShapesGroup(state);
  var lowRatio = /** @type {number} */(point.meta('lowRatio'));
  var xRatio = /** @type {number} */(point.meta('xRatio'));
  var highRatio = /** @type {number} */(point.meta('highRatio'));
  var leftXRatio = xRatio - this.pointWidthHalfRatio;
  var rightXRatio = xRatio + this.pointWidthHalfRatio;

  var leftSide = this.series.ratiosToPixelPairs(leftXRatio, [lowRatio, highRatio]);
  var rightSide = this.series.ratiosToPixelPairs(rightXRatio, [lowRatio, highRatio]);

  var path = /** @type {acgraph.vector.Path} */(shapes['path']);
  path.moveTo(leftSide[2], leftSide[3]);
  path.curveTo.apply(path, anychart.math.getPolarLineParamsSimple(
      leftSide[2], leftSide[3], leftXRatio, highRatio,
      rightSide[2], rightSide[3], rightXRatio, highRatio,
      this.cx, this.cy, this.radius, this.innerRadius, this.zeroAngle, false));
  path.lineTo(rightSide[0], rightSide[1]);
  path.curveTo.apply(path, anychart.math.getPolarLineParamsSimple(
      rightSide[0], rightSide[1], rightXRatio, lowRatio,
      leftSide[0], leftSide[1], leftXRatio, lowRatio,
      this.cx, this.cy, this.radius, this.innerRadius, this.zeroAngle, true));
  path.close();
  var hatch = /** @type {acgraph.vector.Path} */(shapes['hatchFill']);
  hatch.deserialize(path.serializePathArgs());
};

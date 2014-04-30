var stage, stage2;
var area, bar, bubble, candlestick, column, line, markers, ohlc, rangeArea, rangeBar, rangeColumn, rangeSplineArea,
    rangeStepLineArea, spline, splineArea, stepLine, stepLineArea;


function load() {
  stage = acgraph.create('100%', '100%', 'container');
  stage2 = acgraph.create('100%', '100%', 'container2');

  var data1 = [];
  var data2 = [];
  var d1 = [], d2 = [];
  var t1, t2;
  var vals = [];
  for (var i = 0; i < 20; i++) {
    if (t1 = (Math.random() > 0)) {
      d1.push(i);
      data1.push([
        i,
        Math.round(Math.random() * 1000) + 10,
        Math.round(Math.random() * 1000) - 500,
        Math.round(Math.random() * 1000) + 1000,
        Math.round(Math.random() * 1000) - 990,
        Math.round(Math.random() * 1000) + 10
      ]);
    }
    if (t2 = (Math.random() > 0.2)) {
      d2.push(i);
      data2.push([
        i,
        Math.round(Math.random() * 1000) + 10,
        Math.round(Math.random() * 1000) - 390,
        Math.round(Math.random() * 1000) + 1000,
        Math.round(Math.random() * 1000) + 10
      ]);
    }
    vals.push(i);
  }

  console.log(data2);

  var y = 0, json;

  area = new anychart.cartesian.Chart();
  area
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .area(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  area.draw();

  json = area.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  bar = new anychart.cartesian.Chart();
  bar
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'bar chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .bar(data2)
      .markers({type: 'star5', size: 11, enabled: true, fill: 'orange'})
      .pointWidth(2);
  bar.draw();

  json = bar.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  bubble = new anychart.cartesian.Chart();
  bubble
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'bubble chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  bubble
      .bubble(data2)
      .minimumSize(10)
      .maximumSize(40)
      .displayNegative(true)

      .negativeStroke('10 ' + goog.color.names.purple)
      .stroke('5 green')

      .negativeFill('red')
      .fill('yellow')

      .hoverNegativeStroke('5 ' + goog.color.names.aqua)
      .hoverStroke('15 ' + goog.color.names.blanchedalmond)

      .hoverFill(['red', 'blue'])
      .hoverNegativeFill(['yellow', 'green']);
  bubble.draw();

  json = bubble.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  candlestick = new anychart.cartesian.Chart();
  candlestick
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'candlestick chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  candlestick
      .candlestick(data2)
      .risingFill('red')
      .hoverRisingFill('green')
      .fallingFill('blue')
      .hoverFallingFill('yellow');
  candlestick.draw();

  json = candlestick.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  column = new anychart.cartesian.Chart();
  column
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'column chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  column
      .column(data2);
  column.draw();

  json = column.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  line = new anychart.cartesian.Chart();
  line
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'line chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  line
      .line(data2)
      .markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  line.draw();

  json = line.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  markers = new anychart.cartesian.Chart();
  markers
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'markers chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  markers
      .marker(data2)
      .size(5)
      .hoverSize(15)
      .type('diagonalcross')
      .hoverType('star10');
  markers.draw();

  json = markers.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  ohlc = new anychart.cartesian.Chart();
  ohlc
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'ohlc chart', fontSize: 14, fontColor: 'red', hAlign: 'center'});
  ohlc
      .ohlc(data2)
      .risingStroke('red')
      .hoverRisingStroke('green')
      .fallingStroke('blue')
      .hoverFallingStroke('yellow');
  ohlc.draw();

  json = ohlc.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  rangeArea = new anychart.cartesian.Chart();
  rangeArea
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'range area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .rangeArea(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  rangeArea.draw();

  json = rangeArea.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  rangeBar = new anychart.cartesian.Chart();
  rangeBar
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'range bar chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .rangeBar(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  rangeBar.draw();

  json = rangeBar.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  rangeColumn = new anychart.cartesian.Chart();
  rangeColumn
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'range column chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .rangeColumn(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  rangeColumn.rangeColumn(data1).markers(null);
  rangeColumn.draw();

  json = rangeColumn.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  rangeSplineArea = new anychart.cartesian.Chart();
  rangeSplineArea
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'range spline area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .rangeSplineArea(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  rangeSplineArea.draw();

  json = rangeSplineArea.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  rangeStepLineArea = new anychart.cartesian.Chart();
  rangeStepLineArea
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'range step line area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .rangeStepLineArea(data2).markers({type: 'star5', size: 11, enabled: true, fill: 'orange'});
  rangeStepLineArea.draw();

  json = rangeStepLineArea.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  spline = new anychart.cartesian.Chart();
  spline
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'spline chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .spline(data2);
  spline.draw();

  json = spline.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  splineArea = new anychart.cartesian.Chart();
  splineArea
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'spline area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .splineArea(data2);
  splineArea.draw();

  json = splineArea.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  stepLine = new anychart.cartesian.Chart();
  stepLine
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'step line chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .stepLine(data2);
  stepLine.draw();

  json = stepLine.serialize();
  anychart.json(json).container(stage2).draw();

  y += 210;

  stepLineArea = new anychart.cartesian.Chart();
  stepLineArea
      .bounds(0, y, '100%', 200)
      .container(stage)
      .title({text: 'step line area chart', fontSize: 14, fontColor: 'red', hAlign: 'center'})
      .stepLineArea(data2);
  stepLineArea.draw();

  json = stepLineArea.serialize();
  anychart.json(json).container(stage2).draw();
}

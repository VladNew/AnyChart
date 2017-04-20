goog.provide('anychart.themes.sea');


(function() {
  var global = this;
  var stockScrollerUnselected = '#999';


  /**
   * @this {*}
   * @return {*}
   */
  var returnSourceColor60 = function() {
    return global['anychart']['color']['setOpacity'](this['sourceColor'], 0.6, true);
  };


  /**
   * @this {*}
   * @return {*}
   */
  var returnDarkenSourceColor = function() {
    return global['anychart']['color']['darken'](this['sourceColor']);
  };


  /**
   * @this {*}
   * @return {*}
   */
  var returnLightenSourceColor = function() {
    return global['anychart']['color']['lighten'](this['sourceColor']);
  };


  global['anychart'] = global['anychart'] || {};
  global['anychart']['themes'] = global['anychart']['themes'] || {};
  global['anychart']['themes']['sea'] = {
    'palette': {
      'type': 'distinct',
      'items': ['#a9e1d4', '#54dbdf', '#15a9c7', '#207fbf', '#c0aca5', '#8b8a92', '#dbcb8f', '#dba869', '#ffab00', '#00897b']
    },
    'defaultOrdinalColorScale': {
      'autoColors': function(rangesCount) {
        return global['anychart']['color']['blendedHueProgression']('#a9e1d4', '#207fbf', rangesCount);
      }
    },
    'defaultLinearColorScale': {'colors': ['#a9e1d4', '#207fbf']},
    'defaultFontSettings': {
      'fontFamily': '"Lucida Console", Monaco, monospace',
      'fontColor': '#757575',
      'fontSize': 12
    },
    'defaultBackground': {
      'fill': '#f7f5f3',
      'stroke': '#edeae6',
      'cornerType': 'round',
      'corners': 0
    },
    'defaultAxis': {
      'stroke': '#9e9e9e 0.4',
      'ticks': {
        'stroke': '#9e9e9e 0.4'
      },
      'minorTicks': {
        'stroke': '#bdbdbd 0.4'
      }
    },
    'defaultGridSettings': {
      'stroke': '#9e9e9e 0.4'
    },
    'defaultMinorGridSettings': {
      'stroke': '#bdbdbd 0.4'
    },
    'defaultSeparator': {
      'fill': '#9e9e9e 0.4'
    },
    'defaultTooltip': {
      'title': {
        'fontColor': '#616161'
      },
      'fontColor': '#757575',
      'fontSize': 12,
      'background': {
        'fill': '#edeae6 0.9',
        'stroke': '1.5 #dedbd8',
        'corners': 5
      },
      'separator': {
        'margin': {'top': 10, 'right': 0, 'bottom': 10, 'left': 0}
      },
      'padding': {'top': 10, 'right': 20, 'bottom': 10, 'left': 20}
    },
    'defaultColorRange': {
      'stroke': '#bdbdbd',
      'ticks': {
        'stroke': '#bdbdbd', 'position': 'outside', 'length': 7, 'enabled': true
      },
      'minorTicks': {
        'stroke': '#bdbdbd', 'position': 'outside', 'length': 5, 'enabled': true
      },
      'marker': {
        'padding': {'top': 3, 'right': 3, 'bottom': 3, 'left': 3},
        'fill': '#37474f',
        'hoverFill': '#37474f'
      }
    },
    'defaultScroller': {
      'fill': '#e9e6e3',
      'selectedFill': '#dcd8d4',
      'thumbs': {
        'fill': '#F9FAFB',
        'stroke': '#bdc8ce',
        'hoverFill': '#bdc8ce',
        'hoverStroke': '#e9e4e4'
      }
    },
    'chart': {
      'title': {
        'fontSize': 14
      },
      'defaultSeriesSettings': {
        'candlestick': {
          'risingFill': '#54dbdf',
          'risingStroke': '#54dbdf',
          'hoverRisingFill': returnLightenSourceColor,
          'hoverRisingStroke': returnDarkenSourceColor,
          'fallingFill': '#207fbf',
          'fallingStroke': '#207fbf',
          'hoverFallingFill': returnLightenSourceColor,
          'hoverFallingStroke': returnDarkenSourceColor,
          'selectRisingStroke': '3 #54dbdf',
          'selectFallingStroke': '3 #207fbf',
          'selectRisingFill': '#333333 0.85',
          'selectFallingFill': '#333333 0.85'
        },
        'ohlc': {
          'risingStroke': '#54dbdf',
          'hoverRisingStroke': returnDarkenSourceColor,
          'fallingStroke': '#207fbf',
          'hoverFallingStroke': returnDarkenSourceColor,
          'selectRisingStroke': '3 #54dbdf',
          'selectFallingStroke': '3 #207fbf'
        }
      },
      'padding': {'top': 20, 'right': 25, 'bottom': 15, 'left': 15}
    },
    'pieFunnelPyramidBase': {
      'labels': {
        'fontColor': null
      },
      'connectorStroke': '#bdbdbd',
      'outsideLabels': {'autoColor': '#888888'},
      'insideLabels': {'autoColor': '#212121'},
      'legend': {
        'enabled': true,
        'position': 'right',
        'vAlign': 'top',
        'itemsLayout': 'vertical',
        'align': 'center',
        'paginator': {
          'orientation': 'bottom'
        }
      }
    },
    'map': {
      'unboundRegions': {'enabled': true, 'fill': '#e9e6e3', 'stroke': '#dcd8d4'},
      'defaultSeriesSettings': {
        'base': {
          'stroke': '#eceff1',
          'labels': {
            'fontColor': '#212121'
          }
        },
        'bubble': {
          'stroke': returnDarkenSourceColor
        },
        'connector': {
          'stroke': '1.5 #207fbf',
          'hoverStroke': '1.5 #37474f',
          'selectStroke': '1.5 #000',
          'markers': {
            'stroke': '1.5 #e9e6e3',
            'fill': '#15a9c7'
          },
          'hoverMarkers': {
            'fill': '#15a9c7'
          },
          'selectMarkers': {
            'fill': '#000'
          }
        }
      }
    },
    'sparkline': {
      'padding': 0,
      'background': {'stroke': '#f7f5f3'},
      'defaultSeriesSettings': {
        'area': {
          'stroke': '1.5 #54dbdf',
          'fill': '#54dbdf 0.5'
        },
        'column': {
          'fill': '#54dbdf',
          'negativeFill': '#207fbf'
        },
        'line': {
          'stroke': '1.5 #54dbdf'
        },
        'winLoss': {
          'fill': '#54dbdf',
          'negativeFill': '#207fbf'
        }
      }
    },
    'bullet': {
      'background': {'stroke': '#f7f5f3'},
      'defaultMarkerSettings': {
        'fill': '#54dbdf',
        'stroke': '2 #54dbdf'
      },
      'padding': {'top': 5, 'right': 10, 'bottom': 5, 'left': 10},
      'margin': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0},
      'rangePalette': {
        'items': ['#C3C3C2', '#D1D1D0', '#DDDCDB', '#E8E7E6', '#F1EFEE']
      }
    },
    'heatMap': {
      'stroke': '1 #f7f5f3',
      'hoverStroke': '1.5 #f7f5f3',
      'selectStroke': '2 #f7f5f3',
      'labels': {
        'fontColor': '#212121'
      }
    },
    'treeMap': {
      'headers': {
        'background': {
          'enabled': true,
          'fill': '#e9e6e3',
          'stroke': '#dcd8d4'
        }
      },
      'hoverHeaders': {
        'fontColor': '#757575',
        'background': {
          'fill': '#dcd8d4',
          'stroke': '#dcd8d4'
        }
      },
      'labels': {
        'fontColor': '#212121'
      },
      'selectLabels': {
        'fontColor': '#9b8b7e'
      },
      'stroke': '#dcd8d4',
      'selectStroke': '2 #eceff1'
    },
    'stock': {
      'padding': [20, 30, 20, 60],
      'defaultPlotSettings': {
        'xAxis': {
          'background': {
            'fill': '#e9e6e3 0.5',
            'stroke': '#dcd8d4'
          }
        }
      },
      'scroller': {
        'fill': 'none',
        'selectedFill': '#e9e6e3 0.5',
        'outlineStroke': '#dcd8d4',
        'defaultSeriesSettings': {
          'base': {
            'selectStroke': returnSourceColor60
          },
          'candlestick': {
            'risingFill': stockScrollerUnselected,
            'risingStroke': stockScrollerUnselected,
            'fallingFill': stockScrollerUnselected,
            'fallingStroke': stockScrollerUnselected,
            'selectRisingStroke': returnSourceColor60,
            'selectFallingStroke': returnSourceColor60,
            'selectRisingFill': returnSourceColor60,
            'selectFallingFill': returnSourceColor60
          },
          'ohlc': {
            'risingStroke': stockScrollerUnselected,
            'fallingStroke': stockScrollerUnselected,
            'selectRisingStroke': returnSourceColor60,
            'selectFallingStroke': returnSourceColor60
          }
        }
      },
      'xAxis': {
        'background': {
          'enabled': false
        }
      }
    }
  };
}).call(this);

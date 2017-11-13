// wider scope for these charts so that we can reference them from the reset and filter utility functions
var yearRowChart;
var monthRowChart;
var dayRowChart;
var bubbleChart;
var countByDateBarChart;
var dataTable;

// load the data file
d3.csv("data/PPR-all.csv", function(houseSales) {

	// associate the charts with their html elements
	yearRowChart = dc.rowChart("#chart-ring-years");
	monthRowChart = dc.rowChart("#chart-row-months");
	dayRowChart = dc.rowChart("#chart-row-days");
	bubbleChart = dc.bubbleChart("#chart-bubble-counties");
	countByDateBarChart = dc.barChart("#chart-line-date-count");
	dataTable = dc.dataTable("#raw-data-table");
	
	// we'll need to display month names rather than 0-based index values
	var monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
	];

	// we'll need to display day names rather than 0-based index values
	var dayNames = [
			"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	];
		
	// normalise the data
	houseSales.forEach(function(houseSale) {
		// remove the euro symbol and convert to a number
		houseSale.price = +houseSale.price.replace(/[^\d.]/g, "");
		
		// gah, date manipulation ...
		houseSale.dateAsString = houseSale.date;
		var dateParts = houseSale.date.split("/");
		houseSale.date = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
		houseSale.year = houseSale.date.getFullYear();
		// prepend each name with its position to aid sorting in the bar charts below
		houseSale.monthName = houseSale.date.getMonth() + '.' + monthNames[houseSale.date.getMonth()];
		houseSale.dayName = houseSale.date.getDay() + '.' + dayNames[houseSale.date.getDay()];
	});

	// use cross filter to create the dimensions and grouping
	var ppr = crossfilter(houseSales);
	
	var yearDim = ppr.dimension(function(d) {
			return d.year;
		});
	
	var countPerYear = yearDim.group().reduceCount();

	var	dayDim = ppr.dimension(function(d) {
			return d.dayName;
		});
		
	var countPerDay = dayDim.group().reduceCount();

	var	monthDim = ppr.dimension(function(d) {
			return d.monthName;
		});
		
	var	countPerMonth = monthDim.group().reduceCount();

	var	countyDim = ppr.dimension(function(d) {
			return d.county;
		});
		
	var	countyDimGroup = countyDim.group().reduce(
			// add
			function(p, v) {
				++p.count;
				p.sum += v.price;
				p.avg = p.sum / p.count;
				return p;
			},
			// remove
			function(p, v) {
				--p.count;
				p.sum -= v.price;
				p.avg = p.sum / p.count;
				return p;
			},
			// init
			function(p, v) {
				return {
					count: 0,
					sum: 0,
					avg: 0,
				};
			}
		);

	var volumeByDate = ppr.dimension(function(d) {
		return d.date;
	});
	
	var volumeByDateGroup = volumeByDate.group().reduceCount(function(d) {
		return d.date;
	});

	// configure the charts
	yearRowChart
		.width(300)
		.height(250)
		.dimension(yearDim)
		.group(countPerYear)
		.colors(d3.scale.category10())
		.label(function(d) {
			return d.key;
		})
		.title(function(d) {
			return d.key + ' / ' + d.value;
		})
		.elasticX(true)
		.xAxis().ticks(4);

	dayRowChart
		.width(300)
		.height(250)
		.dimension(dayDim)
		.group(countPerDay)
		.colors(d3.scale.category10())
		.label(function(d) {
			return d.key.split('.')[1];
		})
		.title(function(d) {
			return d.key.split('.')[1] + ' / ' + d.value;
		})
		.elasticX(true)
		.xAxis().ticks(4);
		
	monthRowChart
		.width(300)
		.height(350)
		.dimension(monthDim)
		.group(countPerMonth)
		.colors(d3.scale.category10())
		.label(function(d) {
			return d.key.split('.')[1];
		})
		.title(function(d) {
			return d.key.split('.')[1] + ' / ' + d.value;
		})
		.elasticX(true)
		.xAxis().ticks(2);

	bubbleChart
		.width(600)
		.height(500)
		.margins({
			top: 50,
			right: 0,
			bottom: 40,
			left: 40
		})
		.dimension(countyDim)
		.group(countyDimGroup)
		.transitionDuration(750)
		.colors(d3.scale.category10())
		.x(d3.scale.linear().domain([25000, 450000]))
		.y(d3.scale.linear().domain([0, 12000]))
		.r(d3.scale.linear().domain([0, 5]))
		.keyAccessor(function(p) {
			return p.value.avg;
		})
		.valueAccessor(function(p) {
			return p.value.count;
		})
		.radiusValueAccessor(function(p) {
			return 0.5;
		})
		.transitionDuration(1500)
		.elasticY(true)
		.yAxisPadding(100)
		.xAxisPadding(150)
		.yAxisLabel("Number of Sales")
		.xAxisLabel("Average Price")
		.label(function(p) {
			return p.key;
		})
		.title(function(d) {
			return d.value.avg.toEuroAmount() + ' / ' + d.value.count;
		})
		.renderTitle(true)
		.renderLabel(true);

	countByDateBarChart
		.width(600)
		.height(400)
		.margins({
			top: 0,
			right: 0,
			bottom: 40,
			left: 40
		})
		.dimension(volumeByDate)
		.group(volumeByDateGroup)
		.elasticY(true)
		.elasticX(true)
		.gap(85)
		.x(d3.time.scale().domain([new Date(2010, 1, 1), new Date(2017, 12, 31)]))
		.round(d3.time.month.round)
		.xUnits(d3.time.months);

	dataTable
		.width(600)
		.height(350)
		.dimension(monthDim)
		.group(function(d) {
			return "";
		})
		// this is plenty for in-browser display
		.size(1000)
		.columns([
			function(d) {
				return d.dateAsString;
			},
			function(d) {
				return d.price.toLocaleString();
			},
			function(d) {
				return d.address;
			},
			function(d) {
				return d.county;
			},
			function(d) {
				return d.post_code;
			},
			function(d) {
				return 'No' == d.not_full_market_price ? 'Yes' : 'No';
			},
			function(d) {
				return d.vat_exclusive;
			}
		])
		.sortBy(function(d) {
			return d.price;
		})
		.order(d3.descending);

		// create a counter and bind it to the named element  
		var all = ppr.groupAll();
		dc.dataCount("#info-data-count")
			.dimension(ppr)
			.group(all);

		// number display for Euro amounts 
		Number.prototype.toEuroAmount = function() {
			var decPlaces = 2;
			var thouSeparator = ',';
			var decSeparator = '.';
			var currencySymbol = '\u20AC';

			var n = this,
				sign = n < 0 ? "-" : "",
				i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
				j = (j = i.length) > 3 ? j % 3 : 0;

			return sign + currencySymbol + (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
		};
	
	// hit it!	
	dc.renderAll();
	
});

// reset all charts
function reset() {
	bubbleChart.filterAll();
	countByDateBarChart.filterAll();
	yearRowChart.filterAll();
	monthRowChart.filterAll();
	dayRowChart.filterAll();
	dataTable.filterAll();
	dc.redrawAll();
};

// ---------------------------------------------------------
// some (deliberately) noddy functions to showcase filtering
// ---------------------------------------------------------

function filterDays(filters) {
	reset();
	for (var i = 0; i < filters.length; i++) {
		dayRowChart.filter(filters[i]);	
	}
	dc.redrawAll();
}

function filterMonths(filters) {
	reset();
	for (var i = 0; i < filters.length; i++) {
		monthRowChart.filter(filters[i]);	
	}
	dc.redrawAll();
}

function filterYears(filters) {
	reset();
	for (var i = 0; i < filters.length; i++) {
		yearRowChart.filter(filters[i]);	
	}
	dc.redrawAll();
}

function filterBubble(filters) {
	reset();
	for (var i = 0; i < filters.length; i++) {
		bubbleChart.filter(filters[i]);	
	}
	dc.redrawAll();
}

function filterCountyByYear(county, year) {
	reset();
	bubbleChart.filter(county);
	yearRowChart.filter(year);
	dc.redrawAll();	
}
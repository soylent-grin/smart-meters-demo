var a = (function($) {

	'use strict';

	String.prototype.format = function() {
		var pattern = /\{\d+\}/g;
		var args = arguments;
		return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
	};

	var MAX_SNAPSHOTS_COUNT = 500;

	// array of OSM IDs
	var test_data = [
		132337000,
		132083642,
		76168273,
		77384098,
		77384106,
		77384082,
		76223913,
		76223896,
		40168546,
		76346282,
		32895340,
		76963713,
		58755790
	];

	var ColorHelper = {
		component_to_hex: function(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		},
		rgb_to_hex: function(r, g, b) {
			return "#" + ColorHelper.component_to_hex(r) + ColorHelper.component_to_hex(g) + ColorHelper.component_to_hex(b);
		},
		hex_to_rgb: function(hex) {
			// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
			var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
			hex = hex.replace(shorthandRegex, function(m, r, g, b) {
				return r + r + g + g + b + b;
			});

			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			} : null;
		},
		get_gradient_color: function(color1, color2, percent) {
			if (typeof(color1) === 'string') {
				color1 = ColorHelper.hex_to_rgb(color1);
			}
			if (typeof(color2) === 'string') {
				color2 = ColorHelper.hex_to_rgb(color2);
			}
			var newColor = {};

			function makeChannel(a, b) {
				return(a + Math.round((b-a)*(percent/100)));
			}

			newColor.r = makeChannel(color1.r, color2.r);
			newColor.g = makeChannel(color1.g, color2.g);
			newColor.b = makeChannel(color1.b, color2.b);

			return(ColorHelper.rgb_to_hex(newColor.r, newColor.g, newColor.b));
		}
	};

	// custom clock (5 sec = 30 min if ratio is 60 * 30)
	var TimeManager = function(ratio) {
		this.ratio = ratio;
		this._time = new Date().getTime();
		this.heartbeat = 5000;
		this.init();
	};
	TimeManager.prototype = {
		constructor: TimeManager,
		increase: function(value) {
			this._time += value;
		},
		get_time: function() {
			return this._time;
		},
		get_date: function() {
			return new Date(this._time);
		},
		init: function() {
			this.ticker = setInterval(this.on_tick.bind(this), this.heartbeat);
			var date = new Date();
			$('#main-clock').text("{0}:{1}".format(date.getHours(), (date.getMinutes()<10?'0':'') + date.getMinutes()));
		},
		on_tick: function() {
			this.increase(this.ratio * 1000);
			var date = this.get_date();
			$('#main-clock').text("{0}:{1}".format(date.getHours(), (date.getMinutes()<10?'0':'') + date.getMinutes()));
		},
		stop: function() {
			clearInterval(this.ticker);
		}
	};
	var TIME_MANAGER = new TimeManager(60*30);

	// common data aggregator to share
	var DataProvider = (function() {


		function getCentroid(arr) { 
			return arr.reduce(function (x,y) {
			    return [x[0] + y[0]/arr.length, x[1] + y[1]/arr.length];
			}, [0,0]);
		}

		function parse_building(data) {
			var ll = getCentroid(data.geometry.coordinates[0]);
			return {
				addr: "{0}, {1}".format(data.properties['addr:street'] || "?", data.properties['addr:housenumber'] || "?"),
				latlng: [ll[1], ll[0]],
				stats: {},
				timestamp: (new Date()).getTime()
			};
		}

		var instance = {
			init: function(callback) {
				this.data = test_data;
				this.snapshots = {};
				if (callback) {
					callback(this.data);
				}
			},
			get_extended_info: function(geojson, callback) {
				// TODO: maybe, get rid of osmb as data provider
				var new_data = {};
				var tmp_id;
				geojson.features.forEach(function(feature) {
					tmp_id = parseInt(feature.id.substring(feature.id.indexOf('/') + 1));
					if (test_data.indexOf(tmp_id) > -1) {
						new_data[tmp_id] = parse_building(feature)
					}
				});
				debugger
				this.data = new_data;
				if (callback) {
					callback(this.data);
				}
			},
			update: function(callback) {
				var building;

				// make a snapshot
				if (Object.keys(this.snapshots).length > MAX_SNAPSHOTS_COUNT) {
					delete this.snapshots[Object.keys(this.snapshots)[0]];
				}
				var time = TIME_MANAGER.get_time();
				this.snapshots[time] = this.data;

				// get new data
				for (var id in this.data) {
					building = this.data[id];
					var new_overheat = Math.random();
					building.stats.overheat = new_overheat ;//< building.overheat ?  building.overheat : new_overheat;
					building.stats.inside_t = Math.floor(Math.random() * 60) + 50;
					building.stats.outside_t = Math.floor(Math.random() * 2 - 4 );
					building.stats.consumed =  Math.floor(Math.random() * 5);
					building.timestamp = time;
				}
				if (callback) {
					callback();
				}
				$('#main-wrapper').trigger('dataUpdated');
			},
			get_popup_content: function(id) {
				var data = this.data[id];
				var $container = $("<div>");
				if (data) {
					$container.append($("<label class='address'>{0}</label>".format(data.addr)));
					$container.append($("<label>Перетоп: <span>{0}</span></label>".format(data.stats.overheat > 0.5 ? data.stats.overheat.toFixed(2) : "нет")));
					$container.append($("<label>Температура снаружи, С: <span>{0}</span></label>".format(data.stats.outside_t)));
					$container.append($("<label>Температура внутри, С: <span>{0}</span></label>".format(data.stats.inside_t)));
					$container.append($("<label>Текущее потребление: <span>{0}</span></label>".format(data.stats.consumed)));
				}
				return $container.html();
			}
		};
		return instance;
	})();

	var Timeline = function() {
		this.el = document.getElementById('main-timeline');
		this.options = {
			maxHeight: "200px",
			dataAttributes: ['feature']
			//locale: 'ru'
		};
		this._data = new vis.DataSet();
		this._instance = new vis.Timeline(this.el, this._data, this.options);
		this._instance.setItems(this._data);
	};
	Timeline.prototype = {
		update: function(data) {
			var timestamp;
			for (var id in data) {
				timestamp =  data[id].timestamp ? data[id].timestamp : (new Date()).getTime();
				if (data[id].stats.overheat > 0.5) {
					this._data.add({
						id: "{0}_{1}".format(id, timestamp),
						content: "{0}, {1}".format(data[id].addr, data[id].stats.overheat),
						start: new Date(timestamp),
						feature: id
					});
				}
			}
			this._instance.fit();
		},
		add_event_listeners: function() {
			var that = this;
			$('#main-wrapper').on('dataUpdated', function(e) {
				that.update(DataProvider.data);
			});
			this._instance.on('select', function(items) {

			});
		}
	};

	var SmartMetersMap = function(callback) {
		this.init(callback);
	};
	SmartMetersMap.prototype = {
		constructor: SmartMetersMap,
		init: function(callback) {
			var that = this;
			this.map = new L.Map('main-map', {
				center: new L.LatLng(59.996972,29.763898),
				zoom: 13
			});
			this.layers = {
				base: L.tileLayer(
					'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
						maxZoom: 18
					}
				).addTo(this.map),

				heat: L.heatLayer([], {
					radius: 20,
					blur: 15,
					maxZoom: 13,
					max: 1
				}).addTo(this.map),
				buildings: new OSMBuildings(this.map)
			};
			
			this.layers.buildings.each(function(feature) {
				feature.properties.material = null;
				feature.properties.roofMaterial = null;
				var id = feature.id.substring(feature.id.indexOf('/') + 1);
				if (DataProvider.data[id]) {
					var t = (DataProvider.data[id].stats.inside_t - 50) / 60;
					var color = ColorHelper.get_gradient_color("#fff5ef", "#ff5200", t * 100);
					feature.properties.wallColor = color;
					feature.properties.roofColor = color;
				}
			});

			$.getJSON('buildings.geojson', function(data) {
				that.layers.buildings.set(data);
				DataProvider.get_extended_info(data, callback);
			}.bind(this));
			this.add_event_listeners();
			$('.main-toolbar .overheat').click();
		},
		add_event_listeners: function() {
			var that = this;
			this.map.on('popupclose', function() {
				//$('.building-item.active').removeClass('active');
			});
			$('.main-toolbar').on('click', '.btn', function() {
				$(this).addClass('active').siblings().removeClass('active');
				if ($(this).hasClass('overheat')) {
					that.map.addLayer(that.layers.heat);
					that.map.removeLayer(that.layers.buildings);
					$('#main-wrapper').addClass('overheat');
				} else if ($(this).hasClass('temp')) {
					that.map.removeLayer(that.layers.heat);
					that.map.addLayer(that.layers.buildings);
					$('#main-wrapper').removeClass('overheat');
					that.map.closePopup();
					$('.building-item.active').removeClass('active');
				}
			});
			this.layers.buildings.click(function(e) {
				if (DataProvider.data[e.feature]) {
					that.show_popup(e.feature);
				}
			});
			$('#main-wrapper').on('dataUpdated', function() {
				switch($('.main-toolbar .active').attr('data-mode')) {
					case "temp": 
						if (that.map._popup) {
							that.map._popup.setContent(DataProvider.get_popup_content(that.current_feature));
						}
					break;
					case "overheat": 
					break;
					default:
					break;
				}
			});
		},
		show_popup: function(id) {
			L.popup()
				.setLatLng(L.latLng(e.lat, e.lon))
				.setContent(DataProvider.get_popup_content(id))
				.openOn(that.map);
			that.current_feature = id;
		},
		update: function() {
			var array = [], tmp_array = [];
			var building;
			for (var key in DataProvider.data) {
				building = DataProvider.data[key];
				tmp_array = building.latlng.slice(0);
				tmp_array.push(building.stats.overheat);
				array.push(tmp_array);
			}
			this.layers.heat.setLatLngs(array);
			this.layers.heat.redraw();

			// init OSMB repaint
			this.map.fire('moveend');
		},
		set_view: function(lat_lng) {
			this.map.setView(lat_lng);
		}
	};

	var SmartMetersApp = function() {
		this.init();
	};
	SmartMetersApp.prototype = {
		constructor: SmartMetersApp,
		init: function() {
			var that = this;
			DataProvider.init(function(data) {
				that.map = new SmartMetersMap(function() {
					that.init_aside();
					DataProvider.update(that.render.bind(that));
					that.init_polling(3000);
					that.add_event_listeners();
				});
				//that.timeline = new Timeline();
			});
		},
		init_aside: function() {
			var template = $(".building-item.template").clone(true).removeClass('template');
			var geocoder = new google.maps.Geocoder();
			var g_lat_lng, $el, building;
			for (var id in DataProvider.data) {
				building = DataProvider.data[id];
				$el = template.clone(true);
				$el.find('.address').text(building.addr);
				$el.attr({
					'data-lat': building.latlng[0],
					'data-lng': building.latlng[1],
					'data-id': id
				}).data('building_info', building);
				$el.appendTo('#overheat-info > ul');
			}
			$('#overheat-info').removeClass('preloader');
		},
		add_event_listeners: function() {
			var that = this;
			$('#overheat-info').on('click', '.building-item', function() {
				$(this).addClass('active').siblings('.active').removeClass('active');
				that.map.show_popup(DataProvider.data[$(this).attr('data-id')]);
			});
		},
		update_aside: function(data) {
			var $el, overheat;
			var that = this;
			var building;
			for (var key in DataProvider.data) {
				building = DataProvider.data[key];
				$el = $('.building-item[data-id="{0}"'.format(key));
				if ($el.length > 0) {
					overheat = building.stats.overheat.toFixed(2);
					if (overheat > 0.5) {
						$el.find('.overheat').text(overheat);
						$el.css({
							'background-color': 'rgba(255,0,0,{0})'.format(overheat * 0.25)
						});
					} else {
						$el.find('.overheat').text('нет');
						$el.removeAttr('style');
					}
				}
				if ($el.hasClass('active')) {
					$el.click();
				}
			}
		},
		render: function() {
			this.map.update(this.data);
			this.update_aside(this.data);
		},
		init_polling: function(heartbeat) {
			var that = this;
			this.timer = setInterval(function() {
				DataProvider.update(that.render.bind(that));
			}, heartbeat);
		}
	}
	return new SmartMetersApp();
})(jQuery);
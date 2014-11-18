(function($) {

	'use strict';

	String.prototype.format = function() {
		var pattern = /\{\d+\}/g;
		var args = arguments;
		return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
	};
	var test_data = [
		{
			lat_lng: [59.986840,29.781766],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.989259,29.791500],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.990384,29.789364],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.990169,29.786172],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.990760,29.780937],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.988890,29.785052],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.987449,29.784129],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		},
		{
			lat_lng: [59.988965,29.792154],
			overheat: 0.5,
			outside_t: 6,
			inside_t: 80,
			consumed: 100
		}
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

	var SmartMetersMap = function() {
		this.init();
	};
	SmartMetersMap.prototype = {
		constructor: SmartMetersMap,
		init: function() {
			this.map = new L.Map('main-map', {
				center: new L.LatLng(59.996972,29.763898),
				zoom: 13
			});			
			this.layers = {
				base: L.tileLayer(
					'http://{s}.tile.osm.org/{z}/{x}/{y}.png',{
						maxZoom: 18
					}
				).addTo(this.map),

				heat: L.heatLayer([], {
					radius: 20,
					blur: 15, 
					maxZoom: 13,
					max: 1
				}).addTo(this.map)
			};
			var osmb = new OSMBuildings(this.map);
			osmb.each(function(feature) {				
				feature.properties.material = undefined;
				feature.properties.roofMaterial = undefined;

				var rand = Math.random();
				if (rand > 0.5) {
					var color = ColorHelper.get_gradient_color("#fff5ef", "#ff5200", Math.random() * 100);
				} else {
					var color = ColorHelper.get_gradient_color("#9bb2ff", "#fff5ef", Math.random() * 100);
				}
				feature.properties.wallColor = color;
				feature.properties.roofColor = color;
			});
			osmb.load();
		},
		update: function(data) {
			var array = [], tmp_array = [];
			data.forEach(function(building) {
				tmp_array = building.lat_lng.slice(0);
				tmp_array.push(building.overheat);
				array.push(tmp_array);
			});
			this.layers.heat.setLatLngs(array);
			this.layers.heat.redraw();
		},
		set_view: function(lat_lng) {
			this.map.setView(lat_lng);
		},
		show_popup: function(data) {
			L.popup()
				.setLatLng(data.lat_lng)
				.setContent(this.get_popup_content(data))
				.openOn(this.map);
		},
		get_popup_content: function(data) {
			var $container = $("<div>");
			$container.append($("<label class='address'>{0}</label>".format(data.address)));
			$container.append($("<label>Перетоп: <span>{0}</span></label>".format(data.overheat > 0.5 ? data.overheat.toFixed(2) : "нет")));
			$container.append($("<label>Температура снаружи, С: <span>{0}</span></label>".format(data.outside_t)));
			$container.append($("<label>Температура внутри, С: <span>{0}</span></label>".format(data.inside_t)));
			$container.append($("<label>Текущее потребление: <span>{0}</span></label>".format(data.consumed)));
			return $container.html();
		}
	};

	var SmartMetersApp = function() {
		this.overheat_rate = 0.5;
		this.outside_t = 2;
		this.init();
	};
	SmartMetersApp.prototype = {
		constructor: SmartMetersApp,
		init: function() {
			this.map = new SmartMetersMap();
			this.get_data();
			this.init_aside();
			this.init_polling();
			this.add_event_listeners();
		},
		init_aside: function() {
			var template = $(".building-item.template").clone(true).removeClass('template');
			var geocoder = new google.maps.Geocoder();
			var g_lat_lng, $el, address;
			this.data.forEach(function(building, i) {
				setTimeout(function() {
					g_lat_lng = new google.maps.LatLng(building.lat_lng[0], building.lat_lng[1]);
					geocoder.geocode({'latLng': g_lat_lng}, function(results, status) {
						console.log(status);
						if (status == google.maps.GeocoderStatus.OK) {
							address = results[0].address_components[1].long_name + ", " + results[0].address_components[0].long_name;
							building.address = address;
							$el = template.clone(true);
							$el.find('.address').text(address);
							$el.attr({
								'data-lat': building.lat_lng[0],
								'data-lng': building.lat_lng[1]
							}).data('building_info', building);
							$el.appendTo('#overheat-info > ul');
						} 
					});
				}, 1000 * i);
			});
		},
		add_event_listeners: function() {
			var that = this;
			$('#overheat-info').on('click', '.building-item', function() {
				$(this).addClass('active').siblings('.active').removeClass('active');
				that.map.show_popup($(this).data('building_info'));
			});
		},
		update_aside: function(data) {
			var $el, overheat;
			var that = this;
			data.forEach(function(building) {
				$el = $('.building-item[data-lat="{0}"][data-lng="{1}"]'.format(building.lat_lng[0], building.lat_lng[1]));
				if ($el.length > 0) {
					overheat = building.overheat.toFixed(2);	
					if (overheat > that.overheat_rate) {
						$el.find('.overheat').text(overheat);
						$el.css({
							'background-color': 'rgba(255,0,0,{0})'.format(building.overheat * 0.25)
						});
					} else {
						$el.find('.overheat').text('нет');
						$el.removeAttr('style');
					}
				}
				if ($el.hasClass('active')) {
					$el.click();
				}
			});
		},
		get_data: function(callback) {
			var that = this;
			this.data = this.set_random_params(test_data);
			this.map.update(this.data);
			this.update_aside(this.data);
			/*
			$.getJSON('data.json', function(data) {
				that.data = data;
				that.redraw();
			});
			*/
		},
		set_random_params: function(data) {
			var that = this;
			data.forEach(function(building) {
				var new_overheat = Math.random();
				building.overheat = new_overheat ;//< building.overheat ?  building.overheat : new_overheat;
				building.inside_t = Math.floor(Math.random() * 60) + 50;
				building.outside_t = Math.floor(Math.random() * 2 - 4 ) + that.outside_t;
				building.consumed +=  Math.floor(Math.random() * 5);
			});
			return data;
		},
		init_polling: function() {
			var that = this;
			this.heartbeat = 5000;
			this.timer = setInterval(function() {
				that.get_data();
			}, this.heartbeat);
		}
	}

	var app = new SmartMetersApp();

})(jQuery);
(function($) {

	'use strict';

	String.prototype.format = function() {
		var pattern = /\{\d+\}/g;
		var args = arguments;
		return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
	};
	var test_data = [
		[59.986840,29.781766],
		[59.989259,29.79150],
		[59.990384,29.789364],
		[59.990169,29.786172],
		[59.990760,29.780937],
		[59.988890,29.785052],
		[59.987449,29.784129],
		[59.988965,29.792154]
	]

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
		},
		update: function(data) {
			this.layers.heat.setLatLngs(data);
			this.layers.heat.redraw();
		},
		set_view: function(lat_lng) {
			this.map.setView(lat_lng);
		}
	};

	var SmartMetersApp = function() {
		this.overheat_rate = 0.5;
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
			this.data.forEach(function(lat_lng, i) {
				setTimeout(function() {
					g_lat_lng = new google.maps.LatLng(lat_lng[0], lat_lng[1]);
					geocoder.geocode({'latLng': g_lat_lng}, function(results, status) {
						console.log(status);
						if (status == google.maps.GeocoderStatus.OK) {
							address = results[0].address_components[1].long_name + ", " + results[0].address_components[0].long_name;
							$el = template.clone(true);
							$el.find('.address').text(address);
							$el.attr({
								'data-lat': lat_lng[0],
								'data-lng': lat_lng[1],
								'data-overheat': 0
							});
							$el.appendTo('#overheat-info > ul');
						} 
					});
				}, 1000 * i);
			});
		},
		add_event_listeners: function() {
			var that = this;
			$('#overheat-info').on('click', '.building-item', function() {
				var lat_lng = [ $(this).attr('data-lat'), $(this).attr('data-lng') ];
				that.map.set_view(lat_lng);
			});
		},
		update_aside: function(data) {
			var $el, overheat;
			var that = this;
			data.forEach(function(lat_lng) {
				$el = $('.building-item[data-lat="{0}"][data-lng="{1}"]'.format(lat_lng[0], lat_lng[1]));
				if ($el.length > 0) {
					overheat = lat_lng[2].toFixed(2);	
					if (overheat > that.overheat_rate) {
						$el.find('.overheat').text(overheat);
						$el.css({
							'background-color': 'rgba(255,0,0,{0})'.format(lat_lng[2] * 0.25)
						});
					} else {
						$el.find('.overheat').text('нет');
						$el.removeAttr('style');
					}
				}
			});
		},
		get_data: function(callback) {
			var that = this;
			this.data = this.set_random_intense(test_data);
			this.map.update(this.data);
			this.update_aside(this.data);
			/*
			$.getJSON('data.json', function(data) {
				that.data = data;
				that.redraw();
			});
			*/
		},
		set_random_intense: function(data) {
			data.forEach(function(lat_lng) {
				lat_lng[2] = Math.random();
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
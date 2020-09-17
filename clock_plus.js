Module.register("clock_plus",{

	defaults: {
		displayType: "both", // options: digital, analog, both

		timeFormat: config.timeFormat,
		displaySeconds: true,
		showPeriod: true,
		showPeriodUpper: false,
		clockBold: false,
		showDate: true,
		showWeek: true,
		dateFormat: "dddd, D MMMM Y",

		/* specific to the analog clock */
		analogSize: "300px",
		analogFace: "none", // options: 'none', 'simple', 'face-###' (where ### is 001 to 012 inclusive)
		analogPlacement: "bottom", // options: 'top', 'bottom', 'left', 'right'
		analogShowDate: "top", // options: false, 'top', or 'bottom'
		secondsColor: "coral",
		timezone: "Europe/London",

		showSunTimes: true,
		showMoonTimes: true,
		lat: 51.5085,
		lon: -0.1257
	},

	getScripts: function() {
		return ["moment.js", "moment-timezone.js", "suncalc.js"];
	},

	getStyles: function () {
		return ["clock_plus.css", "weather-icons.css"];
	},

	getTranslations: function() {
		return {
			en: "en.json",
			ro: "ro.json",
		};
	},
	
	start: function() {
		Log.info("Starting module: " + this.name);

		var self = this;
		self.second = moment().second();
		self.minute = moment().minute();

		var delayCalculator = function(reducedSeconds) {
			var EXTRA_DELAY = 50;
			
			if (self.config.displaySeconds) {
				return 1000 - moment().milliseconds() + EXTRA_DELAY;
			} else {
				return (60 - reducedSeconds) * 1000 - moment().milliseconds() + EXTRA_DELAY;
			}
		};

		var notificationTimer = function() {
			self.updateDom();

			if (self.config.displaySeconds) {
				self.second = moment().second();
				if (self.second !== 0) {
//					self.sendNotification("CLOCK_SECOND", self.second);
					setTimeout(notificationTimer, delayCalculator(0));
					return;
				}
			}

			self.minute = moment().minute();
//			self.sendNotification("CLOCK_MINUTE", self.minute);
			setTimeout(notificationTimer, delayCalculator(0));
		
		};
		
		setTimeout(notificationTimer, delayCalculator(self.second));
		moment.locale(config.language);

	},

	getDom: function() {

		var wrapper = document.createElement("div");
		var dateWrapper = document.createElement("div");
		var timeWrapper = document.createElement("div");
		var secondsWrapper = document.createElement("sup");
		var periodWrapper = document.createElement("span");
		var sunWrapper = document.createElement("div");
		var moonWrapper = document.createElement("div");
		var weekWrapper = document.createElement("div");

		dateWrapper.className = "date normal xmedium";
		timeWrapper.className = "time bright xlarge light";
		secondsWrapper.className = "dimmed";
		sunWrapper.className = "sun dimmed ssmall";
		moonWrapper.className = "moon dimmed ssmall";
		weekWrapper.className = "week dimmed ssmall";

		var timeString;
		var now = moment();
		this.lastDisplayedMinute = now.minute();
		if (this.config.timezone) {
			now.tz(this.config.timezone);
		}

		var hourSymbol = "HH";
		if (this.config.timeFormat !== 24) {
			hourSymbol = "h";
		}

		if (this.config.clockBold === true) {
			timeString = now.format(hourSymbol + "[<span class=\"bold\">]mm[</span>]");
		} else {
			timeString = now.format(hourSymbol + ":mm");
		}

		if(this.config.showDate){
			dateWrapper.innerHTML = now.format(this.config.dateFormat);
		}
		if (this.config.showWeek) {
			weekWrapper.innerHTML = this.translate("WEEK", {weekNumber: now.format("W, ")}) + this.translate("DAY", {dayNumber: now.format("DDD, z ")}) + config.location + ", " + config.language.toUpperCase();
		}
		timeWrapper.innerHTML = timeString;
		secondsWrapper.innerHTML = now.format(":ss");
		if (this.config.showPeriodUpper) {
			periodWrapper.innerHTML = now.format("A");
		} else {
			periodWrapper.innerHTML = now.format("a");
		}
		if (this.config.displaySeconds) {
			timeWrapper.appendChild(secondsWrapper);
		}
		if (this.config.showPeriod && this.config.timeFormat !== 24) {
			timeWrapper.appendChild(periodWrapper);
		}

		function formatTime(config, time) {
			var formatString = hourSymbol + ":mm";
			if (config.showPeriod && config.timeFormat !== 24) {
				formatString += config.showPeriodUpper ? "A" : "a";
			}
			return moment(time).format(formatString);
		}
 		if (this.config.showSunTimes) {
			const sunTimes = SunCalc.getTimes(now, this.config.lat, this.config.lon);
			const isVisible = now.isBetween(sunTimes.sunrise, sunTimes.sunset);
			var nextEvent;
			if (now.isBefore(sunTimes.sunrise)) {
				nextEvent = sunTimes.sunrise;
			} else if (now.isBefore(sunTimes.sunset)) {
				nextEvent = sunTimes.sunset;
			} else {
				const tomorrowSunTimes = SunCalc.getTimes(now.clone().add(1, "day"), this.config.lat, this.config.lon);
				nextEvent = tomorrowSunTimes.sunrise;
			}
			const untilNextEvent = moment.duration(moment(nextEvent).diff(now));
			const untilNextEventString = untilNextEvent.hours() + "h " + untilNextEvent.minutes() + "m";
			sunWrapper.innerHTML = "<span class=\"" + (isVisible ? "bright" : "") + "\"><i class=\"wi wi-day-sunny\"></i> " + untilNextEventString + "</span>" +
				"<span><i class=\"wi wi-sunrise\"></i> " + formatTime(this.config, sunTimes.sunrise) + "</span>" +
				"<span><i class=\"wi wi-sunset\"></i> " + formatTime(this.config, sunTimes.sunset) + "</span>";
		}
		if (this.config.showMoonTimes) {
			const moonIllumination = SunCalc.getMoonIllumination(now.toDate());
			const moonTimes = SunCalc.getMoonTimes(now, this.config.lat, this.config.lon);
			const moonRise = moonTimes.rise;
			var moonSet;
			if (moment(moonTimes.set).isAfter(moonTimes.rise)) {
				moonSet = moonTimes.set;
			} else {
				const nextMoonTimes = SunCalc.getMoonTimes(now.clone().add(1, "day"), this.config.lat, this.config.lon);
				moonSet = nextMoonTimes.set;
			}
			const isVisible = now.isBetween(moonRise, moonSet) || moonTimes.alwaysUp === true;
			const illuminatedFractionString = Math.round(moonIllumination.fraction * 100) + "%";
			moonWrapper.innerHTML = "<span class=\"" + (isVisible ? "bright" : "") + "\">&nbsp;<i class=\"wi wi-night-clear\"></i>&nbsp; " + illuminatedFractionString + "</span>" +
				"<span>&nbsp;<i class=\"wi wi-moonrise\"></i>&nbsp; " + (moonRise ? formatTime(this.config, moonRise) : "...") + "</span>"+
				"<span>&nbsp;<i class=\"wi wi-moonset\"></i>&nbsp; " + (moonSet ? formatTime(this.config, moonSet) : "...") + "</span>";
		}

		 if (this.config.displayType !== "digital") {

			var now = moment();
			if (this.config.timezone) {
				now.tz(this.config.timezone);
			}
			var	second = now.seconds() * 6,
				minute = now.minute() * 6 + second / 60,
				hour = ((now.hours() % 12) / 12) * 360 + 90 + minute / 12;

			var clockCircle = document.createElement("div");
			clockCircle.className = "clockCircle";
			clockCircle.style.width = this.config.analogSize;
			clockCircle.style.height = this.config.analogSize;

			if (this.config.analogFace !== "" && this.config.analogFace !== "simple" && this.config.analogFace !== "none") {
				clockCircle.style.background = "url("+ this.data.path + "faces/" + this.config.analogFace + ".svg)";
				clockCircle.style.backgroundSize = "100%";

				// clockCircle.style.border = "1px solid black";
				clockCircle.style.border = "rgba(0, 0, 0, 0)";

			} else if (this.config.analogFace !== "none") {
				clockCircle.style.border = "1px solid transparent";
			}
			var clockFace = document.createElement("div");
			clockFace.className = "clockFace";

			var clockHour = document.createElement("div");
			clockHour.className = "clockHour";
			clockHour.style.transform = "rotate(" + hour + "deg)";
			clockHour.className = "clockHour";
			var clockMinute = document.createElement("div");
			clockMinute.className = "clockMinute";
			clockMinute.style.transform = "rotate(" + minute + "deg)";
			clockMinute.className = "clockMinute";

			// Combine analog wrappers
			clockFace.appendChild(clockHour);
			clockFace.appendChild(clockMinute);

			if (this.config.displaySeconds) {
				var clockSecond = document.createElement("div");
				clockSecond.className = "clockSecond";
				clockSecond.style.transform = "rotate(" + second + "deg)";
				clockSecond.style.backgroundColor = this.config.secondsColor;
				clockSecond.className = "clockSecond";
				clockFace.appendChild(clockSecond);
			}
			clockCircle.appendChild(clockFace);
		}

		if (this.config.displayType === "digital") {
			// Display only a digital clock
			wrapper.appendChild(dateWrapper);
			wrapper.appendChild(timeWrapper);
			wrapper.appendChild(sunWrapper);
			wrapper.appendChild(moonWrapper);
			wrapper.appendChild(weekWrapper);
		} else if (this.config.displayType === "analog") {

			if (this.config.showWeek) {
				weekWrapper.style.paddingBottom = "15px";
			} else {
				dateWrapper.style.paddingBottom = "15px";
			}

			if (this.config.analogShowDate === "top") {
				wrapper.appendChild(dateWrapper);
				wrapper.appendChild(weekWrapper);
				wrapper.appendChild(clockCircle);
			} else if (this.config.analogShowDate === "bottom") {
				wrapper.appendChild(clockCircle);
				wrapper.appendChild(dateWrapper);
				wrapper.appendChild(weekWrapper);
			} else {
				wrapper.appendChild(clockCircle);
			}
		} else {

			var placement = this.config.analogPlacement;

			analogWrapper = document.createElement("div");
			analogWrapper.className = "analog";
			analogWrapper.style.cssFloat = "none";
			analogWrapper.appendChild(clockCircle);
			digitalWrapper = document.createElement("div");
			digitalWrapper.className = "digital";
			digitalWrapper.style.cssFloat = "none";
			digitalWrapper.appendChild(dateWrapper);
			digitalWrapper.appendChild(timeWrapper);
			digitalWrapper.appendChild(sunWrapper);
			digitalWrapper.appendChild(moonWrapper);
			digitalWrapper.appendChild(weekWrapper);

			var appendClocks = function(condition, pos1, pos2) {
				var padding = [0,0,0,0];
				padding[(placement === condition) ? pos1 : pos2] = "20px";
				analogWrapper.style.padding = padding.join(" ");
				if (placement === condition) {
					wrapper.appendChild(analogWrapper);
					wrapper.appendChild(digitalWrapper);
				} else {
					wrapper.appendChild(digitalWrapper);
					wrapper.appendChild(analogWrapper);
				}
			};

			if (placement === "left" || placement === "right") {
				digitalWrapper.style.display = "inline-block";
				digitalWrapper.style.verticalAlign = "top";
				analogWrapper.style.display = "inline-block";

				appendClocks("left", 1, 3);
			} else {
				digitalWrapper.style.textAlign = "center";

				appendClocks("top", 2, 0);
			}
		}

		return wrapper;
	}
});
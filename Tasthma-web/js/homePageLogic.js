/*
V3.0
Author: team IRIS
Date: 05/09/17

V1.1
* Add if condition to prevent accuweather api ran out of call and destroy all weather info display
* update if into try catch to handle exception
*
* V1.2 updates
* adding google auto complete
*
* V1.3
* -removed accuweather API (pollen count is always zero, useless)
* -add search bar to search location
*   integrate google auto complete to search bar (search constrain to au only)
*   display current weather fo searched location
* add locate me function using browser's geolocation
*
* V1.4
* -bug fixed for search bar
* -user can both hit enter or click button to do the search
* -add places service to allow user do manual search (input text then search instead of select suggested location first
* -basic score calculation based on weather and wind
*
* V1.5
* -add pm10 factors to alg
*
* V1.5.1
* -fixed load location
*
* V2.0
* - algorithm finished
* - search bar bug fixed (only return results in VIC)
* - infoWindow auto pop out after searching
* - layout change (customized icon)
*
* V2.1
* -box risk visualisation
*
* v2.2
* -refine the popup window
* -header banner added
*
* -bug fixed
*   -hide scrollbar of box
*
*   v2.1.1
*       -faster loading
*
*   v2.2.2
*      - bugfixed (infoWindow)
*
*   v2.2.3
*       - using google geocoding to get suburb name instead of using openWeatherMap, reduce risk
*       - bug and typo fixed
*
*
* v2.2.7 restrict the search to greater melb (postcode from 3000-3207 and 3800 for Monash clayton campus)
* v 2.2.8 
        -optimization (remove non-async call)

  v3.0 refined algorithm, season factor
* */

//reference the customized icon location
var mapMarkers = {
    'LOW': 'https://image.ibb.co/msomxQ/l.png',
    'MEDIUM': 'https://image.ibb.co/mQ1Lrk/m.png',
    'HIGH': 'https://image.ibb.co/mOhRWk/h.png',
    'EXTREME': 'https://image.ibb.co/k6h4HQ/e.png'
};

var geoJSON = {
    type: "FeatureCollection",
    features: []
};

var map; //google map api
var infoWindow; //google infoWindow, popup

var rating; // store a location risk results (rating, desc, colour code)


var openWeatherMapKey = "7814dd27bd44184ffe859c64f61f28e1";
var openWeatherCurByCoordBase="https://api.openweathermap.org/data/2.5/weather?";

//severe weather codes for TA, provided by openWeatherMap
var severeWeatherCode = [200,201,202,210,211,212,221,230,231,232,502,503,504];

//grassland points with radius for algorithm grassland index calculation.
var grasslands = [
    {
        lat: -38.19987,
        lon:145.06141,
        radius: 8.16
    },
    {
        lat:-38.253,
        lon:145.1723,
        radius: 6.14
    },
    {
        lat: -38.06836,
        lon: 145.28577,
        radius: 11.8
    },
    {
        lat: -37.89781,
        lon: 145.07696,
        radius: 6.65
    },
    {
        lat: -37.90697,
        lon: 144.6725,
        radius: 3.65
    },
];

//bias the search to VIC
var searchBound;

//places service for manual text search
var searchService;

//get location name by coordinates
var geoCodingService;

var autoCom; //google autocomplete

var marker; //mark search result

var input; //search bar

var placeSearched; //contains location with valid search

//convert day format
var dayParam = [
    'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'
]
//convertmonth format
var monthParam = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

var pm10Measures;
//store the hourly pm10 measurements


//base function when the page is loaded
function initialize() {
    infoWindow = new google.maps.InfoWindow();

    /*
 * infoWindow customization, referenced from:
 * http://en.marnoto.com/2014/09/5-formas-de-personalizar-infowindow.html
 */
    google.maps.event.addListener(infoWindow, 'domready', function() {

        // Reference to the DIV which receives the contents of the infowindow using jQuery
        var iwOuter = $('.gm-style-iw');

        var iwBackground = iwOuter.prev();

        // Remove the background shadow DIV
        iwBackground.children(':nth-child(2)').css({'display' : 'none'});

        // Remove the white background DIV
        iwBackground.children(':nth-child(4)').css({'display' : 'none'});

// Moves the arrow 70px to the left margin
        iwBackground.children(':nth-child(3)').attr('style', function(i,s){ return s + 'left: 70px !important; bottom: 5px !important;'});

        iwBackground.children(':nth-child(3)').find('div').children().css({'z-index' : '1',
            'border': '5px solid ' + rating.colour});
        iwOuter.css({'max-width': '160px', 'width':'160px', 'border': '5px solid ' + rating.colour});

        var iwCloseBtn = iwOuter.next();

// Reposition the button
        iwCloseBtn.css({
            opacity: '1', // by default the close button has an opacity of 0.7
            right: '20px', top: '20px', // button repositioning
        });
    });
  //  initialize map
    var mapOptions = {
        zoom: 10,
        center: new google.maps.LatLng(-37.8141,144.9633),
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    };
    map = new google.maps.Map(document.getElementById('mapDemo'),
        mapOptions);


    //configure search bar
    input = document.getElementById('search');

    //restrict the search and autocomplete to VIC
    searchBound = new google.maps.LatLngBounds(
        new google.maps.LatLng(-38.54816, 144.42077),
        new google.maps.LatLng(-37.35269, 145.49743)
    );
    var option = {
        bounds: searchBound,
        strictBounds: true
    }
    autoCom = new google.maps.places.Autocomplete(input, option);

    searchService = new google.maps.places.PlacesService(map); //init manual search service
    geoCodingService = new google.maps.Geocoder; //initialise geocoding

    //perform auto search function, results automatically show if choose suggested location, or hit enter to do the search
   autoCom.addListener('place_changed', function() {
        placeSearched = autoCom.getPlace();
        if (!placeSearched || !placeSearched.geometry) {
            manualLookUp(); //if it's not a valid place object, perform a places textSearch to find location
        } else { //get risk info and display to website
            locationInfoByCoords(placeSearched.geometry.location.lat(), placeSearched.geometry.location.lng());
        }
    })

//request pm10 data and store it
    $.ajax({
        url: 'scripts/pm10Request.php',
        type: 'GET'
    }).done(function(res) {
        pm10Measures =  res;
    }).fail(function() {
        alert('Oops, Something wrong at the back');
        pm10Measures = '[]';
    }).always(function() {
        displayDefault(); //function to display the default locations when loading the page
        initLocate(); //function to location user current location when loading the page
    });


    //add listener for user to click to view default location info from pop up and info box
    map.data.addListener('click', function(event) {
        displayInfoInBox(event.feature.getProperty("city"), event.feature.getProperty("riskScore"));
        infoWindow.setContent(
            setInfoWindowContent(event.feature.getProperty("city"),
                event.feature.getProperty("temp"),
                event.feature.getProperty("weather"),
                event.feature.getProperty("riskScore"))
        );
        infoWindow.setOptions({
            position:{
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
            },
            pixelOffset: {
                width: -13,
                height: -20
            }
        });
        infoWindow.open(map);
    });
}

/*This function rquest default locations weather info and process the results*/
function displayDefault(){
    var requestString = "https://api.openweathermap.org/data/2.5/group?id=2158177,2148876,2155718,2166370,7932638,2165171,2144095,2156878,2174360&units=metric"
        + "&APPID=" + openWeatherMapKey;
    request = new XMLHttpRequest();
    request.onload = processResults;
    request.open("get", requestString, true);
    request.send();
}

/*create map data (geoJSON) based on weather request result*/
function processResults() {
    var results = JSON.parse(this.responseText);
    if (results.list.length > 0) {
        for (var i = 0; i < results.list.length; i++) {
            geoJSON.features.push(convertToGeoJson(results.list[i]));
        }
        map.data.addGeoJson(geoJSON);
    }
}

/*helper function for processing the default locations, this function retrieve weather info, wind, and coords from
* the response, request pm10 values and calculate risk score and pass it to feature object*/
function convertToGeoJson(data) {
    var lat = data.coord.lat;
    var lon = data.coord.lon;
    var pm10Value = getPM10Value(pm10Measures,lat,lon);

    var pm10Index = getPM10Index(pm10Value);
    var windIndex = getWindIndex(data.wind.speed * 3.6);
    var grasslandIndex = getGrasslandIndex(lat, lon);
    var weatherIndex = getWeatherIndex(data.weather[0].id);

    //new season index
    var seasonIndex = getSeasonIndex();

    var score = pm10Index + windIndex + grasslandIndex + weatherIndex + seasonIndex;
    var riskRating = getRiskRating(score).rating;
    var feature = {
        type: "Feature",
        properties: {
            city: data.name,
            temp: data.main.temp,
            weather: data.weather[0].main,
            windSpeed: data.wind.speed * 3.6,
            pm10: pm10Value,
            riskScore: score,
            riskRating: riskRating,
            icon: mapMarkers[riskRating],
            coordinates: [lon, lat]
        },
        geometry: {
            type: "Point",
            coordinates: [lon, lat]
        }
    };
    // Set the custom marker icon
    map.data.setStyle(function(feature) {
        return {
            icon: {
                url: feature.getProperty('icon'),
                anchor: new google.maps.Point(25, 25),
                scaledSize: new google.maps.Size(30,30)
            }
        };
    });
    // returns object
    return feature;
}

//perform places text search to find location
function manualLookUp() {
    var text = input.value;
    if (text == null || text.trim().length == 0) {
        alert('Oops! please type in your address, or postcode, or places')
    } else {
        var req = {
            bounds: searchBound,
            query: text
        }
        searchService.textSearch(req, callback);
    }
}

//process text search result
function callback(results,status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        var priRes = results[0];
        locationInfoByCoords(priRes.geometry.location.lat(), priRes.geometry.location.lng());
    } else {
        alert('Oops! we cannot find the location, please try something else');
    }
}

function processPlaceObject(place) {
    var lat = place.geometry.location.lat();
    var lon = place.geometry.location.lng();
    var components = place.address_components;
    var name = getLocationNameFromResponse(components);
    var postcode = getPostCodeFromResponse(components);
    if (!validatePostcode(postcode)) {
        alert('Oops! The place you\'re looking for is not covered yet.');
        return;
    } else {
        getCurrentInfo(name,lat,lon);
    }
}


//find suburbs using google geocoding and process and display to get risk info
function locationInfoByCoords(lat,lon) {
    var coords= {lat: lat, lng: lon};
    geoCodingService.geocode({'location': coords, 'bounds': searchBound}, function(results, status) {
        if (status === 'OK') {
            if (results[0]) {
                processPlaceObject(results[0]);
            } else {
                window.alert('Oops! Cannot find your location name!');
            }
        } else {
            window.alert('Oops! Finding your area name failed due to: ' + status);
        }
    });
}

//retrieve suburb name from geocoding response
function getLocationNameFromResponse(components){
    var name = 'nothing';
    for (var i = 0; i < components.length; i++) {
        var types = components[i].types;
        if (($.inArray('locality', types) != -1 && $.inArray('political', types) != -1)
        || ($.inArray('postal_code', types) != -1 && $.inArray('political', types) != -1)) {
            name = components[i].long_name;
            break;
        }
    }
    return name;
}

//get postcode from google response
function getPostCodeFromResponse(components) {
    var code = 0000;
    for (var i = 0; i < components.length; i++) {
        if (components[i].types[0] = 'postal_code') {
            code = components[i].long_name;
            if (!isNaN(code) && code.length == 4) {
               break;
            }
        }
    }
    return code;
}

//check if postcode within greater melb, 3800 for Monash clayton campus
function validatePostcode(postcode) {
    if (postcode >= 3000 && postcode <= 3207) {
        return true;
    } else if (postcode == 3800) {
        return true;
    } else {
        return false;
    }
}


/*function to place markers, and display risk info in popup and info box*/
function getCurrentInfo(name, lat, lon) {
    var req = createWeatherReq(lat, lon);
    req.onload = function() {
        if (marker != undefined) {
        marker.setMap(null);}
        var res = JSON.parse(this.responseText);

        map.setCenter(new google.maps.LatLng(lat, lon));

        marker = new google.maps.Marker({
            position: {
                lat: lat,
                lng: lon
            },
            map: map
        });
        var pm10Value = getPM10Value(pm10Measures,lat,lon);

        var windIndex = getWindIndex(res.wind.speed * 3.6);
        var weatherIndex = getWeatherIndex(res.weather[0].id);
        var pm10Index = getPM10Index(pm10Value);
        var grassLandIndex = getGrasslandIndex(lat,lon);
        var seasonIndex = getSeasonIndex();
        var riskScore = windIndex + weatherIndex + pm10Index + grassLandIndex + seasonIndex;

        //if location name was not defined by geocoding service, using the OpenWeatherMap name instead
        if (name == 'nothing') {
            name = res.name;
        }

        markerInfoWindow(name, res.main.temp, res.weather[0].main, riskScore);

        marker.addListener('click', function() {
            markerInfoWindow(name, res.main.temp, res.weather[0].main, riskScore);
        });
    };
    req.send();
}

function markerInfoWindow(name,temp,weather,score) {
    displayInfoInBox(name, score);
    infoWindow.setContent(
        setInfoWindowContent(name, temp, weather, score)
    );
    infoWindow.setOptions({
        pixelOffset: {
            width: 0,
            height: 0
        }
    });
    infoWindow.open(map,marker);
    map.setZoom(13);
}

/*new Async OpenWeatherMap request based on coordinates*/
function createWeatherReq(lat, lon) {
    var link = openWeatherCurByCoordBase + 'lat=' + lat + '&lon=' + lon + '&APPID=' + openWeatherMapKey + "&units=metric";
    var newRequest = new XMLHttpRequest();
    newRequest.open('get',link,true);
    return newRequest;
}

//find users current location
function locateMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            locationInfoByCoords(lat, lon);
        }, function() {
            alert('Oop! The service has failed.');
        });
    } else {
        alert('Oops! Looks like your browser doesn\'t support this function. ');
    }
}

//init function to locate user when loading the page
function initLocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            indexSum(lat, lon);
        }, function() {
            alert('Oops! We cannot find your current location');
            indexSum(-37.8141,144.9633);
            //locating unavailable, using CBD
        });
    } else {
        alert('Sorry, your browser doesn\'t support this function');
        indexSum(-37.8141,144.9633);
        //locating unavailable, using CBD
    }
}


/*
Algorithm implementation methods
 */

//helper function to calculate the distance,
// source from: https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function getDistance(orLat, orLon, deLat, deLon) {
    var radius = 6371;
    var dLat = degToRad(deLat - orLat);
    var dLon = degToRad(deLon - orLon);

    var a =Math.pow(Math.sin(dLat/2),2)
        + Math.cos(degToRad(orLat)) * Math.cos(degToRad(deLat)) *
        Math.pow(Math.sin(dLon/2),2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return radius * c;
}

//helper math function
function degToRad(deg) {
    return deg * (Math.PI/180);
}

//calculate risk score and display risk info in box for a given location (using coords)
 function indexSum(lat, lon) {
     var coords= {lat: lat, lng: lon};
     geoCodingService.geocode({'location': coords}, function(results, status) {
         if (status === 'OK') {
             var name = 'nothing';
             if (results[0]) {
                 var components = results[0].address_components;
                 var postcode = getPostCodeFromResponse(components);
                 if (validatePostcode(postcode)) { //user currently located in greater melb
                     name = getLocationNameFromResponse(components);
                     var req = createWeatherReq(lat,lon);
                 } else {
                     alert('Oops! The place you\'re currently at is not covered yet.');
                     var req = createWeatherReq(-37.8141,144.9633); //display info in CBD instead.

                 }
                 req.onload = function() {
                     var res = JSON.parse(req.responseText);

                     if (name == 'nothing') {
                     name = res.name;}

                     var windIndex = getWindIndex(res.wind.speed * 3.6);
                     var weatherIndex = getWeatherIndex(res.weather[0].id);
                     var pm10Index = getPM10Index(getPM10Value(pm10Measures,lat,lon));
                     var grasslandIndex = getGrasslandIndex(lat,lon);

                     var score = windIndex + weatherIndex + pm10Index + grasslandIndex;

                     displayInfoInBox(name, score);

                 }
                 req.send();
             } else {
                 window.alert('Cannot find your location name!');
             }
         } else {
             window.alert('finding your area name failed due to: ' + status);
         }
     });
 }

 //index for wind factors
function getWindIndex(windSpeed) {
     if (windSpeed >= 90) {
         return 3;
     } else if (windSpeed >= 65 && windSpeed < 90) {
         return 2;
     } else if (windSpeed >= 45 && windSpeed < 65) {
         return 1;
     } else {
         return 0;
     }
}

//index for weather factor
function getWeatherIndex(code) {
     if ($.inArray(code,severeWeatherCode) != -1) {
         return 1;
     } else {
         return 0;
     }
}

//season factor, 1 point for pollen season
function getSeasonIndex() {
    var date = new Date();
    var month = date.getMonth();
    if (month == 9 || month == 10 || month == 11) {
        return 1;
    } else {
        return 0;
    }
}

/*pm10 measures based on distance between location and sites
* assumption:
*   -nearest site measurement is the location pm10 level*/
function getPM10Value(res,lat, lon) {
    var shortest = 100000;
    var value = 0;
    if (res == '[]') {
        return 0;
    } else {
        var data = JSON.parse(res);
        for (var i = 0; i < data.length; i ++) {
            var site = data[i];
            var distance = getDistance(site.lat, site.lon, lat, lon);
            if (distance <= shortest) {
                value = site.value;
                shortest = distance;
            }
        }
        return value;
    }
}

//index for pm10 factor
function getPM10Index(value) {
    if (value >= 75) { //extremely high
        return 3;
    } else if (value >= 50 && value < 75) { //high
        return 2;
    }else if (value >=33 && value < 50) { //medium
        return 1;
    } else { //low
        return 0;
    }
}

//get the risk info (rating, one sentence desc, and colour code.
function getRiskRating(score) {
    var res = {};
    if (score >= 8) {
        res['rating'] = 'EXTREME';
        res ['desc'] = 'You need to prepare for a potential Thunderstorm Asthma outbreak.';
        res ['colour'] = '#ff0000';
    } else if (score >= 5 && score < 8) {
        res['rating'] = 'HIGH';
        res ['desc'] = 'You can chill at home.';
        res['colour'] = '#ff9900'
    } else if (score >= 3 && score < 5) {
        res['rating'] = 'MEDIUM';
        res ['desc'] = 'You can go outside but remember to take your pills.';
        res['colour'] = '#ffff33'
    } else if (score >= 0 && score < 3) {
        res['rating'] = 'LOW';
        res ['desc'] = 'You can go outside to get your tan.';
        res['colour'] = '#00ff33'
    } else {
        res['rating'] = 'Error';
        res ['desc'] = 'oops, nothing to show';
        res['colour'] = '#ff0000'
    }
    return res;
}

/*
* index for grassland factor
* assumption:
*   -within a grassland radius will be considered as high risk, score 1 */
function getGrasslandIndex(lat,lon) {
    var index = 0;
    for (var i = 0; i < grasslands.length; i++) {
        var land = grasslands[i];
        var distance = getDistance(lat,lon, land.lat, land.lon);
        if (distance <= land.radius) {
            index++;
        }
    }
    return index;
}



//display the infomation to the side box dynamically
function displayInfoInBox(name,score) {

    var rating = getRiskRating(score);
    var newDate = new Date();
    var day = dayParam[newDate.getDay()];
    var date = newDate.getDate();
    var month = monthParam[newDate.getMonth()];
    var dateString = day + ', ' + date + ' ' + month;

     var box = document.getElementById('infoBox');
    box.style.backgroundColor = rating.colour;
    document.getElementById('dateDiv').innerText = dateString;
    document.getElementById('regionDiv').innerText = name + ', VIC';
    document.getElementById('riskRate').innerText = rating.rating;
    document.getElementById('descDiv').innerText = rating.desc;
    box.style.visibility = 'visible';
}

//set the content in info window
function setInfoWindowContent(city, degree, condition, score) {
    rating = getRiskRating(score);
    var content = "<div id='windowContainer'>" +
                            "<br /><strong>" + city + "</strong>" +
                            "<br />" + degree + "&deg;C" +
                            "<br/>" + condition +
                            "<br />" + "Risk Level:" + "<strong>" + rating.rating + "</strong>" +
                    "</div>";
     return content;
}




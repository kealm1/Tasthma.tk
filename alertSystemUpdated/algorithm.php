<?php
/**
 * main algorithm implementation, use function calculateScore() and provide coordinates to calculate
 */


class Grassland {
    var $lat;
    var $lon;
    var $radius;

    function __construct($lat,$lon,$radius)
    {
        $this->lat = $lat;
        $this->lon = $lon;
        $this->radius = $radius;
    }

}
//section for weather and wind
$openWeatherAPIKey = '7814dd27bd44184ffe859c64f61f28e1';
$openWeatherBase = 'https://api.openweathermap.org/data/2.5/weather?';
$severeWeatherCode = [200,201,202,210,211,212,221,230,231,232,502,503,504];

//section for grassland
$loca1 = new Grassland(-38.19987,145.06141,8.16);
$loca2 = new Grassland(-38.253, 145.1723, 6.14);
$loca3 = new Grassland(-38.06836, 145.28577, 11.8);
$loca4 = new Grassland(-37.89781, 145.07696, 6.65);
$loca5 = new Grassland(-37.90697, 144.6725, 3.65);
$grasslands = json_encode([$loca1,$loca2,$loca3,$loca4,$loca5]);

//sections for pm10Measures


//main function to be used for other script to calculate risk score based on coordinates
function calculateScore($lat,$lon,$pm10data) {
    $weatherParam = getWindAndWeather($lat,$lon);
    return getWindSpeedScore($weatherParam[0]) +
        getWeatherConditionScore($weatherParam[1]) +
        getGrasslandScore($lat,$lon) +
        getPM10Score(getPM10Measure($lat,$lon,$pm10data)) + getSeasonScore();
}

//helper function, get rating based on socre
function getGeneralRating($score) {
    if ($score >= 8) {
        return 'EXTREME';
    } else if ($score >= 5 && $score < 8) {
        return 'HIGH';
    } else if ($score >= 3 && $score < 5) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

function distance($lat1, $lon1, $lat2, $lon2) {
    $theta = $lon1 - $lon2;
    $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
    $dist = acos($dist);
    $dist = rad2deg($dist);
    return $dist * 60 * 1.1515 * 1.609344;
}

function getWindAndWeather($lat,$lon) {
    $url = $GLOBALS['openWeatherBase'] . 'lat=' . $lat . '&lon=' . $lon . '&APPID=' . $GLOBALS['openWeatherAPIKey'] . '&units=metric';
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER,1);
    $res = curl_exec($curl);
    curl_close($curl);
    $result = json_decode($res);
    return array($result->wind->speed * 3.6, $result->weather[0]->id);
}

function getWindSpeedScore($windSpeed) {
    if ($windSpeed >= 90) {
        return 3;
    } else if($windSpeed >=65 && $windSpeed < 90) {
        return 2;
    } else if($windSpeed >=45 && $windSpeed < 65) {
        return 1;
    } else {
        return 0;
    }
}

function getWeatherConditionScore($id) {
    if (in_array($id, $GLOBALS['severeWeatherCode'])) {
        return 1;
    } else {
        return 0;
    }
}

function getGrasslandScore($lat, $lon) {
    $score = 0;
    $lands = json_decode($GLOBALS['grasslands']);
    for ($i = 0; $i < count($lands); $i++) {
        $land = $lands[$i];
        if (distance($lat,$lon,$land->lat,$land->lon) <= $land->radius) {
            $score++;
        }
    }
    return $score;
}

function getPM10Measure($lat,$lon,$measures) {
    $shortest = 100000000;
    $measure = 0;
    for ($i = 0; $i < count($measures); $i++) {
        $site = $measures[$i];
        $dis = distance($lat,$lon,$site->lat,$site->lon);
        if ( $dis < $shortest) {
            $measure = $site->value;
            $shortest = $dis;
        }
    }
    return $measure;
}

function getPM10Score($measure) {
    if ($measure >= 75) {
        return 3;
    } else if ($measure >= 50 && $measure < 75) {
        return 2;
    } else if ($measure >=33 &7 && $measure < 50) {
        return 1;
    } else {
        return 0;
    }
}

function getSeasonScore() {
    date_default_timezone_set('Australia/Melbourne');
    $month = date('m');
    if(in_array($month,['10','11','12'])) {
        return 1;
    } else {
        return 0;
    }
}


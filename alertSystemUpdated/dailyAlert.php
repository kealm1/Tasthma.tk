<?php
/*
 * Version 1
 *
 * This script query the database for users information, using the algorithm to calculate the risk level of the location where
 * user specified. then sending sms if the risk is high or Extreme
 *
 * This script should run every 6am in the morning
 *
 * */
error_reporting(0);
require_once 'connectToDB.php'; //database connection
require_once 'algorithm.php'; //calculate risk score
require_once 'sendSMS.php'; //sms service
require_once 'pm10Request.php';

$pm10Measures = processResponse(getAPIResponse(getTime()));

//query the essential data
$result = $db->query('SELECT phoneNumber, ds.postcode, suburbName, lat, lon FROM dailySubList ds INNER JOIN suburbs su WHERE ds.postcode = su.postcode');

//fetching raw data
while($row = mysqli_fetch_assoc($result))
    $rawData[] = $row;

//results will be stored here after process
$processedList  = array();

//loop through each row
for ($i = 0; $i < count($rawData); $i++) {
    $data = $rawData[$i]; //row
     $postcode = $data['postcode'];
     if(array_key_exists($postcode, $processedList)) { //if the location already calculated, directly append phone number, to reduce unnecessary calculation and API call
         array_push($processedList[$postcode]['phoneNumbers'], $data['phoneNumber']);
    } else { //calculate risk score and store result to result list
         $score = calculateScore($data['lat'],$data['lon'],$GLOBALS['pm10Measures']);
         $rating = getGeneralRating($score);
         $processedList[$postcode] = array('suburb'=>$data['suburbName'], 'score'=>$score, 'rating'=>$rating, 'phoneNumbers'=>array($data['phoneNumber']));
     }
}

//process the result to send SMS accordingly, currently simply send to all users
foreach ($processedList as $postcode => $value) {
    $nums = $value['phoneNumbers'];
    for ($i = 0; $i < count($nums); $i++) {
        if ($value['score'] > 4) {
            sendSMS($nums[$i], 'The score in ' . $value['suburb'] . ' is ' . $value['score'] . ', which is ' .
                $value['rating'] . '.');
        } else {
            sendSMS($nums[$i],'Risk in ' . $value['suburb'] . ' is ' . $value['score'] . '. All good.');
        }
    }
}



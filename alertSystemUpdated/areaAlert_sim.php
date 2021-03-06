<?php
/**
 * Created by PhpStorm.
 * User: IRIS
 * Date: 15/9/17
 * Time: 9:37 AM
 */
require_once 'connectToDB.php'; //database connection
require_once 'algorithm.php'; //calculate risk score
require_once 'sendSMS.php'; //sms service
require_once 'pm10Request.php'; //get processed pm10 measures from EPA API

$measures = processResponse(getAPIResponse(getTime())); //get pm10 measures with site location

$phones = $db->query('SELECT * FROM areaSubList'); //retrieve phone numbers that have subscribed
$nums = array();
while ($phone = mysqli_fetch_assoc($phones)) //store numbers into the array
    $nums[] = $phone['phoneNumber'];

if (!empty(nums)) {
    $result = $db->query('SELECT * FROM suburbs'); //get all list that need to be checked

    //fetching raw data and store into array
    while($row = mysqli_fetch_assoc($result))
        $rawData[] = $row;

    $processedData = array(); //store location that has high risk

    foreach ($rawData as $location) { //calculate risk score for each location, if > 4(high) store to processedData
        $dummy = rand(0,8); //add a random score between 0 -8 to trigger the risk
        $score = calculateScore($location['lat'],$location['lon'], $GLOBALS['measures']) + $dummy;
        if($score > 4) {
            array_push($processedData, array('postcode'=>$location['postcode'], 'score'=> $score));
        }
    }

    $msg = ''; //msg body

    if(!empty($processedData)) { //To send msg, at least 1 location have high risk
        $noOfRiskyArea = count($processedData);
        if ($noOfRiskyArea > 3) { //if there are too many high risk area, prompt user to check our website.
            $msg = 'It is a risky day. Please go to https://tasthma.tk for more details.';
        } else {
            $msg = 'There is an increased risk level for ';
            foreach ($processedData as $item) {
                $msg .= $item['postcode'] . ', ';
            }
            $msg .= 'please be cautious.';
        }

        sendSMS(join(',',$nums),$msg);
    }
}


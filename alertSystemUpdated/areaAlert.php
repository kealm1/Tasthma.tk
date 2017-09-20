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
require_once 'pm10Request.php';

$measures = processResponse(getAPIResponse(getTime()));

$result = $db->query('SELECT * FROM suburbs');

//fetching raw data
while($row = mysqli_fetch_assoc($result))
    $rawData[] = $row;

$processedData = array();

foreach ($rawData as $location) {
    $score = calculateScore($location['lat'],$location['lon'], $GLOBALS['measures']);
    echo $score;
    if($score > 4) {
        array_push($processedData, array('name'=>$location['suburbName'], 'score'=> $score));
    }
}

$phones = $db->query('SELECT * FROM areaSubList');
$nums = array();
while ($phone = mysqli_fetch_assoc($phones))
    $nums[] = $phone['phoneNumber'];

$msg = '';

if(!empty($processedData)) {
    $noOfRiskyArea = count($processedData);
    if ($noOfRiskyArea > 3) {
        $msg = 'Some areas have high risk! ';
        for ($i = 0; $i<3; $i++) {
            $msg .= $processedData[$i]['name'] . ', ';
        }
    } else {
        $msg = 'Following area have high risk! ';
        foreach ($processedData as $item) {
            $msg .= $item['name'] . ', ';
        }
    }
    $msg .= 'please be safe.';

} else {
    $msg = 'Melb is doing great, you\'re all set.';
}

sendSMS(join(',',$nums),$msg);
<?php
/**
 * Created by PhpStorm.
 * User: Jean-cauce
 * Date: 13/9/17
 * Time: 10:30 PM
 *
 * Send sms message, other script can call send SMS msg to send txt by only providing msg body and number
 * (can be a list, separated by comma)
 */
function sendSMS($to,$msg) {
    $username = 'tasthma'; //service provider account change your own account username
    $password = 'tasthmairis'; //change to your own account password
    $destination = $to; //Multiple numbers can be entered, separated by comma
    $source    = 'Tasthma'; //sender
    $text = $msg;
    $ref = 'iris';

    $content =  'username='.rawurlencode($username).
        '&password='.rawurlencode($password).
        '&to='.rawurlencode($destination).
        '&from='.rawurlencode($source).
        '&message='.rawurlencode($text).
        '&ref='.rawurlencode($ref); //construct url body

    $ch = curl_init('https://api.smsbroadcast.com.au/api-adv.php'); //curl request to send msg
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $content);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $output = curl_exec ($ch);
    curl_close ($ch);
    return $output;
}


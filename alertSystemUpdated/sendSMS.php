<?php
/**
 * Created by PhpStorm.
 * User: Jean-cauce
 * Date: 13/9/17
 * Time: 10:30 PM
 */
function sendSMS($to,$msg) {
    $username = 'tasthma'; //swap with your own username
    $password = 'tasthmairis'; //swap with your own password
    $destination = $to; //Multiple numbers can be entered, separated by a comma
    $source    = 'Tasthma';
    $text = $msg . " Unsub: https://tasthma.tk/unsub.html";
    $ref = 'iris';

    $content =  'username='.rawurlencode($username).
        '&password='.rawurlencode($password).
        '&to='.rawurlencode($destination).
        '&from='.rawurlencode($source).
        '&message='.rawurlencode($text).
        '&ref='.rawurlencode($ref);

    $ch = curl_init('https://api.smsbroadcast.com.au/api-adv.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $content);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $output = curl_exec ($ch);
    curl_close ($ch);
    return $output;
}
<?php
/**
 * Created by PhpStorm.
 * User: Jean-cauce
 * Date: 8/9/17
 * Time: 6:06 PM
 */
error_reporting(0);
require 'connectToDB.php';
require 'sendSMS.php';

$func = $_POST['function'];
$postcode = $_POST['postcode'];
$phone = $_POST['phoneNumber'];
$serviceType = $_POST['serviceType'];


$checkPhoneFromArea = $db->query("SELECT * FROM areaSubList WHERE phoneNumber = '{$phone}'");
$checkPhoneFromDaily = $db->query("SELECT * FROM dailySubList WHERE phoneNumber = '{$phone}'");
$checkPostcode = $db->query("SELECT * FROM suburbs WHERE postcode = '{$postcode}'");

$dQuery = "DELETE FROM dailySubList WHERE phoneNumber = '{$phone}'";
$aQuery = "DELETE FROM areaSubList WHERE phoneNumber = '{$phone}'";

$dailyQuery = "INSERT INTO dailySubList (postcode, phoneNumber) VALUES ('{$postcode}', '{$phone}')";
$areaQuery = "INSERT INTO areaSubList (phoneNumber) VALUES ('{$phone}')";

if (validatePhoneFormat($phone)) { //make sure the formate of phone follow 04xxxxxxxxpattern
    if ($func == 'insert') { //insert new data
        if ($checkPhoneFromArea->num_rows || $checkPhoneFromDaily->num_rows) { //make sure it's a new phone number
            echo json_encode(array("code"=>0,"msg"=> 'Looks like you already subscribed, to update preference, please go to update page'));
        } else {
            switch ($serviceType) {
                case 1: //service 1 only
                    if ($db->query($dailyQuery)) {
                        echo json_encode(array("code"=>1,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                        sendSMS($phone,"G\'day! We\'ll check risk for you and send you msg if level is high. update or unsubscribe go to");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like it\'s a invalid postcode'));
                    };
                    break;
                case 2: //service 2 only
                    if ($db->query($areaQuery)) {
                        echo json_encode(array("code"=>2,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                        sendSMS($phone,"G\'day! we will send you alert in daytime when risk is high in melb. update or unsub go to");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues, please try again'));
                    };
                    break;
                case 3: //both service
                    if ($db->query($areaQuery)) {
                        if ($db->query($dailyQuery)) {
                            echo json_encode(array("code"=>3,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                            sendSMS($phone,"G\'day! We'notify you any changes in melb. update or unsub, go to");
                        } else {
                            $db->query($dQuery);
                            $db->query($aQuery);
                            echo json_encode(array("code"=>0,"msg"=>'Oops! we got an error storing daily'));
                        }
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues with area'));
                    };
                    break;
                default:
                    echo json_encode(array("code"=>0,"msg"=>'it\'s not a valid subscription'));
            }
        }
    } else { //update record
        if ($checkPhoneFromArea->num_rows || $checkPhoneFromDaily->num_rows) {

            switch ($serviceType) {
                case 1: //service 1 only
                    if($checkPostcode->num_rows) {

                        $db->query($dQuery);
                        $db->query($aQuery);

                        if ($db->query($dailyQuery)) {
                            echo json_encode(array("code"=>4,"msg"=>'Congratulations, preference updated!'));
                            sendSMS($phone,"Thank you! your preference has been updated!");
                        } else {
                            echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we can\'t update to one'));
                        };
                    }
                    break;
                case 2: //service 2 only

                    $db->query($dQuery);
                    $db->query($aQuery);

                    if ($db->query($areaQuery)) {
                        echo json_encode(array("code"=>5,"msg"=>'Congratulations, preference updated!'));
                        sendSMS($phone,"Thank you! your preference has been updated!");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues updating to 2'));
                    };
                    break;
                case 3: //both
                    if ($checkPostcode->num_rows) {

                        $db->query($dQuery);
                        $db->query($aQuery);

                        if ($db->query($areaQuery)) {
                            if ($db->query($dailyQuery)) {
                                echo json_encode(array("code"=>6,"msg" => 'Congratulations, preference updated!'));
                                sendSMS($phone, "Thank you! your preference has been updated!");
                            } else {
                                echo json_encode(array("code"=>0,"msg" => 'Oops! we got an error update daily'));
                            }
                        } else {
                            $db->query($dQuery);
                            $db->query($aQuery);
                            echo json_encode(array("code"=>0,"msg" => 'Oops! Looks like we had a issues update area'));
                        };
                    }
                    break;
                case 0: //unsub
                    $db->query($dQuery);
                    $db->query($aQuery);
                    echo json_encode(array("code"=>7,"msg"=>'It\'s sad to see you go, please be safe'));
                    break;
                default:
                    echo json_encode(array("code"=>0,"msg"=>'it\'s not a valid update'));
            }
        } else {
            echo json_encode(array("code"=>0,"msg"=> 'Looks like you haven\'t subscribed yet!'));
        }
    }
} else {
    echo json_encode(array("code"=>0,"msg"=> 'Looks like it\'s not a valid phone number'));
}


function validatePhoneFormat($phone) {
    if (is_numeric($phone) && substr($phone, 0, 2) == '04' && strlen($phone) == 10) {
        return true;
    } else {
        return false;
    }
}



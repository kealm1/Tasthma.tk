<?php
/**
 * Created by PhpStorm.
 * User: Jean-cauce
 * Date: 8/9/17
 * Time:
 *
 * V1 handle all the post data from website, perform insert, update, delete according to toe post data
 *
 * and it will respond to website with a code and related msgs, So website can response according.
 * 0 error,
 * 1 sub service 1,
 * 2 sub service 2,
 * 3 sub both,
 * 4 update to 1,
 * 5 update to 2,
 * 6 update to both,
 * 7 unsub
 */
error_reporting(0);
require 'connectToDB.php'; //connect to database
require 'sendSMS.php'; // send msg to user after processing

$func = $_POST['function']; //insert, update, delete
$postcode = $_POST['postcode']; //data postcode
$phone = $_POST['phoneNumber']; //data mobile number
$serviceType = $_POST['serviceType']; //user preference 0 unsub, 1 service 1, 2 service 2, 3 both service


$checkPhoneFromArea = $db->query("SELECT * FROM areaSubList WHERE phoneNumber = '{$phone}'"); //find record in table of service 1 list
$checkPhoneFromDaily = $db->query("SELECT * FROM dailySubList WHERE phoneNumber = '{$phone}'"); //find record in table of service 2 list
$checkPostcode = $db->query("SELECT * FROM suburbs WHERE postcode = '{$postcode}'"); //find post code info in table

$dQuery = "DELETE FROM dailySubList WHERE phoneNumber = '{$phone}'"; //delete 1 record
$aQuery = "DELETE FROM areaSubList WHERE phoneNumber = '{$phone}'"; //delete 1 record

$dailyQuery = "INSERT INTO dailySubList (postcode, phoneNumber) VALUES ('{$postcode}', '{$phone}')"; //insert new record in service 1
$areaQuery = "INSERT INTO areaSubList (phoneNumber) VALUES ('{$phone}')"; //insert new record in service 2

if (validatePhoneFormat($phone)) { //make sure the formate of phone follow 04xxxxxxxxpattern
    if ($func == 'insert') { //insert new data
        if ($checkPhoneFromArea->num_rows || $checkPhoneFromDaily->num_rows) { //make sure it's a new phone number
            //if user already subed, we throw code 0, with error msg
            echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like you have already subscribed with this mobile number.'));
        } else { //it's a new number want to sub
            switch ($serviceType) { //store record based on service type
                case 1: //service 1 only
                    if ($db->query($dailyQuery)) {
                        echo json_encode(array("code"=>1,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                        sendSMS($phone,"G\'day! We will keep you posted if risk levels increase to high or extreme. Unsub: https://tasthma.tk/unsub.html");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like it\'s a invalid postcode'));
                    };
                    break;
                case 2: //service 2 only
                    if ($db->query($areaQuery)) { //if insert successful
                        echo json_encode(array("code"=>2,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                        sendSMS($phone,"G\'day! We will keep you posted if risk levels increase to high or extreme.  Unsub: https://tasthma.tk/unsub.html");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues, please try again'));
                    };
                    break;
                case 3: //both service
                    if ($db->query($areaQuery)) {
                        if ($db->query($dailyQuery)) {
                            echo json_encode(array("code"=>3,"msg"=>'Congratulations, You have been successfully subscribed with us!'));
                            sendSMS($phone,"G\'day! We will keep you posted if risk levels increase to high or extreme.  Unsub: https://tasthma.tk/unsub.html");
                        } else { //if insert into second table failed, delete inserted record.
                            $db->query($dQuery);
                            $db->query($aQuery);
                            echo json_encode(array("code"=>0,"msg"=>'Oops! we got an error storing daily'));
                        }
                    } else { //if insert first record failed, return error code and msg
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues with area'));
                    };
                    break;
                default:
                    echo json_encode(array("code"=>0,"msg"=>'it\'s not a valid subscription'));
            }
        }
    } else if ($func == 'update') { //update record
        if ($checkPhoneFromArea->num_rows || $checkPhoneFromDaily->num_rows) { //user has subed
            switch ($serviceType) {
                case 1: //service 1 only
                    if($checkPostcode->num_rows) { //check if the postcode provided valid
                        $db->query($dQuery); //clean record
                        $db->query($aQuery); //clean record
                        if ($db->query($dailyQuery)) { //insert new
                            echo json_encode(array("code"=>4,"msg"=>'Congratulations, preference updated!'));
                            sendSMS($phone,"Thank you! Your preferences have been updated.  Unsub: https://tasthma.tk/unsub.html");
                        } else {
                            echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we can\'t update to one'));
                        };
                    }
                    break;
                case 2: //service 2 only
                    $db->query($dQuery);
                    $db->query($aQuery);
                    if ($db->query($areaQuery)) { //execute to insert new record
                        echo json_encode(array("code"=>5,"msg"=>'Congratulations, preference updated!'));
                        sendSMS($phone,"Thank you! Your preferences have been updated.  Unsub: https://tasthma.tk/unsub.html");
                    } else {
                        echo json_encode(array("code"=>0,"msg"=> 'Oops! Looks like we had a issues updating to 2'));
                    };
                    break;
                case 3: //both
                    if ($checkPostcode->num_rows) {

                        $db->query($dQuery); //remove all record
                        $db->query($aQuery); //remove all record

                        if ($db->query($areaQuery)) { //insert into 2
                            if ($db->query($dailyQuery)) { //insert into on if 2 successed
                                echo json_encode(array("code"=>6,"msg" => 'Congratulations, preference updated!'));
                                sendSMS($phone, "Thank you! Your preferences have been updated.  Unsub: https://tasthma.tk/unsub.html");
                            } else { //insert into 1 failed,
                                $db->query($dQuery); //remove all record
                                $db->query($aQuery);
                                echo json_encode(array("code"=>0,"msg" => 'Oops! we got an error update daily'));
                            }
                        } else {
                            $db->query($dQuery);
                            $db->query($aQuery);
                            echo json_encode(array("code"=>0,"msg" => 'Oops! Looks like we had a issues update area'));
                        };
                    }
                    break;
                default:
                    echo json_encode(array("code"=>0,"msg"=>'it\'s not a valid update'));
            }
        } else {
            echo json_encode(array("code"=>0,"msg"=> 'Looks like you haven\'t subscribed yet!'));
        }
    } else { //unsub
        if ($checkPhoneFromArea->num_rows || $checkPhoneFromDaily->num_rows) {
            $db->query($dQuery);
            $db->query($aQuery);
            echo json_encode(array("code"=>7,"msg"=>'It\'s sad to see you go, please be safe'));
            sendSMS($phone, "Unsub confirmed. You will no longer receive SMS alerts from us.");
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


